// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import type { AvailabilityRequest, CommonSlot, CalendlyUser } from '@/lib/types'
import { formatDateForDisplay, formatTimeForDisplay } from '@/lib/calendly'

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY

export async function POST(request: Request) {
  if (!CALENDLY_API_KEY) {
    return NextResponse.json(
      { error: 'Calendly API not configured' },
      { status: 500 }
    )
  }

  try {
    const { eventUrls, startDate, endDate }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: 'No event URLs provided' },
        { status: 400 }
      )
    }

    // Fetch user data and available times for each URL
    const availabilityPromises = eventUrls.map(async (url) => {
      const username = url.split('/').filter(Boolean).pop() || ''
      
      const userResponse = await fetch(
        `https://api.calendly.com/users/${username}`,
        {
          headers: {
            Authorization: `Bearer ${CALENDLY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!userResponse.ok) {
        throw new Error(`Invalid Calendly user: ${username}`)
      }

      const userData: CalendlyUser = await userResponse.json()

      const availabilityResponse = await fetch(
        `https://api.calendly.com/user_availability_schedules/${userData.uri}/available_times?` +
        new URLSearchParams({
          start_time: startDate,
          end_time: endDate
        }),
        {
          headers: {
            Authorization: `Bearer ${CALENDLY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!availabilityResponse.ok) {
        throw new Error(`Failed to fetch availability for ${username}`)
      }

      return availabilityResponse.json()
    })

    const availabilities = await Promise.all(availabilityPromises)

    // Find common slots with proper typing
    const commonSlots = availabilities.reduce<CommonSlot[]>((common, current) => {
      // Transform current availability into CommonSlot format
      const currentSlots: CommonSlot[] = current.available_times.map((availableTime: { start_time: string }) => ({
        date: formatDateForDisplay(availableTime.start_time),
        time: formatTimeForDisplay(availableTime.start_time),
        duration: '30min'
      }))

      // If this is the first set of slots, return them as is
      if (common.length === 0) {
        return currentSlots
      }

      // Find overlapping slots
      return common.filter((commonSlot) => 
        currentSlots.some((currentSlot) => 
          currentSlot.date === commonSlot.date && 
          currentSlot.time === commonSlot.time
        )
      )
    }, [])

    return NextResponse.json({ slots: commonSlots })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}