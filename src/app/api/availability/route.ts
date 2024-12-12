// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { parseISO, differenceInDays } from 'date-fns'
import type { 
  CommonSlot, 
  AvailabilityRequest, 
  CalendlyBusyTime,
  CalendlySchedule 
} from '@/lib/types'
import { 
  formatSlotDate, 
  formatSlotTime, 
  generateTimeSlots,
  isWithinWorkingHours,
  hasNoConflicts 
} from '@/lib/calendly'

const CALENDLY_API = 'https://api.calendly.com'

export async function POST(request: Request) {
  const CALENDLY_PAT = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN

  if (!CALENDLY_PAT) {
    return NextResponse.json(
      { error: 'Calendly authentication not configured' },
      { status: 500 }
    )
  }

  try {
    const { usernames, duration = 30, startDate, endDate }: AvailabilityRequest = 
      await request.json()

    // Validate input
    if (!usernames?.length) {
      return NextResponse.json(
        { error: 'No usernames provided' },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      )
    }

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Validate date range
    if (differenceInDays(end, start) > 7) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 7 days' },
        { status: 400 }
      )
    }

    // Fetch data for each user in parallel
    const userDataPromises = usernames.map(async (username) => {
      // Get user URI first
      const userResponse = await fetch(`${CALENDLY_API}/users/${username}`, {
        headers: {
          Authorization: `Bearer ${CALENDLY_PAT}`,
          'Content-Type': 'application/json'
        }
      })

      if (!userResponse.ok) {
        throw new Error(`User ${username} not found`)
      }

      const userData = await userResponse.json()
      const userUri = userData.resource.uri

      // Get user's busy times
      const busyTimesResponse = await fetch(
        `${CALENDLY_API}/user_busy_times?` + new URLSearchParams({
          user: userUri,
          start_time: start.toISOString(),
          end_time: end.toISOString()
        }), {
          headers: {
            Authorization: `Bearer ${CALENDLY_PAT}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!busyTimesResponse.ok) {
        throw new Error(`Failed to fetch busy times for ${username}`)
      }

      // Get user's availability schedule
      const scheduleResponse = await fetch(
        `${CALENDLY_API}/user_availability_schedules?` + new URLSearchParams({
          user: userUri
        }), {
          headers: {
            Authorization: `Bearer ${CALENDLY_PAT}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!scheduleResponse.ok) {
        throw new Error(`Failed to fetch schedule for ${username}`)
      }

      const busyTimes = await busyTimesResponse.json()
      const schedule = await scheduleResponse.json()

      return {
        busyTimes: busyTimes.collection as CalendlyBusyTime[],
        schedule: schedule as CalendlySchedule,
        timezone: userData.resource.timezone
      }
    })

    // Wait for all user data to be fetched
    const usersData = await Promise.all(userDataPromises)

    // Generate potential time slots
    const potentialSlots = generateTimeSlots(startDate, endDate, duration)

    // Find common available slots
    const availableSlots = potentialSlots.filter(slot => {
      // Check if slot works for all users
      return usersData.every(userData => {
        return (
          isWithinWorkingHours(slot, userData.schedule) &&
          hasNoConflicts(slot, duration, userData.busyTimes)
        )
      })
    })

    // Format slots for response
    const commonSlots: CommonSlot[] = availableSlots.map(slot => ({
      date: formatSlotDate(slot.toISOString()),
      time: formatSlotTime(slot.toISOString()),
      duration: `${duration}min`
    }))

    return NextResponse.json({ slots: commonSlots })

  } catch (error) {
    console.error('Calendly API error:', error)
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