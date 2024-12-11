// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { format, parseISO, addDays } from 'date-fns'
import type { 
  CalendlyUser, 
  CalendlyAvailability, 
  CommonSlot, 
  AvailabilityRequest 
} from '@/lib/types'

export async function POST(request: Request) {
  const CALENDLY_PAT = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN

  if (!CALENDLY_PAT) {
    return NextResponse.json(
      { error: 'Calendly authentication not configured' },
      { status: 500 }
    )
  }

  try {
    // Parse and validate request
    const { usernames, duration = 30, startDate, endDate }: AvailabilityRequest = 
      await request.json()

    if (!usernames?.length) {
      return NextResponse.json(
        { error: 'No usernames provided' },
        { status: 400 }
      )
    }

    const headers = {
      'Authorization': `Bearer ${CALENDLY_PAT}`,
      'Content-Type': 'application/json'
    }

    // Get user data for each username
    const userPromises = usernames.map(async username => {
      const response = await fetch(
        `https://api.calendly.com/users/${username}`,
        { headers }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch user data for ${username}`)
      }

      return response.json() as Promise<CalendlyUser>
    })

    const users = await Promise.all(userPromises)

    // Calculate date range
    const start = startDate ? parseISO(startDate) : new Date()
    const end = endDate ? parseISO(endDate) : addDays(start, 7)

    // Get availability for each user
    const availabilityPromises = users.map(async user => {
      const response = await fetch(
        'https://api.calendly.com/user_availability',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user: user.resource.uri,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            duration
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch availability for ${user.resource.name}`)
      }

      return response.json() as Promise<CalendlyAvailability>
    })

    const availabilities = await Promise.all(availabilityPromises)

    // Find common available times
    const commonAvailableTimes = findCommonAvailableTimes(
      availabilities,
      duration
    )

    // Format slots for response
    const slots: CommonSlot[] = commonAvailableTimes.map(time => ({
      date: format(parseISO(time.start_time), 'yyyy-MM-dd'),
      time: format(parseISO(time.start_time), 'h:mm a'),
      duration: `${duration}min`
    }))

    return NextResponse.json({ slots })

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

interface TimeSlot {
  start_time: string
  end_time: string
}

function findCommonAvailableTimes(
  availabilities: CalendlyAvailability[], 
  duration: number
): TimeSlot[] {
  // Get all available times from each user
  const allAvailableTimes = availabilities.map(
    avail => avail.resource.available_times
      .filter(slot => slot.status === 'available')
  )

  // Find times that work for everyone
  const commonTimes = allAvailableTimes.reduce((common, userTimes) => {
    return common.filter(commonSlot => 
      userTimes.some(userSlot =>
        commonSlot.start_time === userSlot.start_time &&
        commonSlot.end_time === userSlot.end_time
      )
    )
  }, allAvailableTimes[0] || [])

  return commonTimes
}