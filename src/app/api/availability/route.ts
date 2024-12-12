// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { parseISO, differenceInDays } from 'date-fns'
import type { CommonSlot, AvailabilityRequest } from '@/lib/types'
import { formatSlotDate, formatSlotTime, parseCalendlyUrl } from '@/lib/calendly'

export async function POST(request: Request) {
  try {
    const { eventUrls, startDate, endDate }: AvailabilityRequest = 
      await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: 'No event URLs provided' },
        { status: 400 }
      )
    }

    // Validate and parse all URLs first
    const eventInfos = await Promise.all(
      eventUrls.map(async (url) => {
        try {
          return parseCalendlyUrl(url)
        } catch (error) {
          throw new Error(`Invalid URL format: ${url}`)
        }
      })
    )

    // Fetch availability for each event URL in parallel
    const availabilityPromises = eventInfos.map(async (info) => {
      const response = await fetch(
        `https://calendly.com/${info.username}/${info.eventSlug}/available_spots?` + 
        new URLSearchParams({
          start_date: startDate,
          end_date: endDate
        })
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch availability for ${info.username}`)
      }

      return response.json()
    })

    const availabilities = await Promise.all(availabilityPromises)

    // Find common time slots
    // This is a simplified version - you'll need to implement the actual intersection logic
    const commonSlots: CommonSlot[] = availabilities[0].spots.map((slot: any) => ({
      date: formatSlotDate(slot.start_time),
      time: formatSlotTime(slot.start_time),
      duration: `${slot.duration}min`
    }))

    return NextResponse.json({ slots: commonSlots })

  } catch (error) {
    console.error('Availability error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to fetch availability' 
      },
      { status: 500 }
    )
  }
}