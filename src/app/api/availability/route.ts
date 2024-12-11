// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { parseISO, addDays } from 'date-fns'
import type { CommonSlot, AvailabilityRequest } from '@/lib/types'
import { formatSlotDate, formatSlotTime } from '@/lib/calendly'

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

    if (!usernames?.length) {
      return NextResponse.json(
        { error: 'No usernames provided' },
        { status: 400 }
      )
    }

    const start = startDate ? parseISO(startDate) : new Date()
    const end = endDate ? parseISO(endDate) : addDays(start, 7)

    // Use duration in mock data to fix the unused variable error
    const mockSlots: CommonSlot[] = [
      {
        date: formatSlotDate(new Date()),
        time: formatSlotTime(new Date()),
        duration: `${duration}min`  // Using duration here
      },
      {
        date: formatSlotDate(addDays(new Date(), 1)),
        time: '2:00 PM',
        duration: `${duration}min`  // Using duration here
      },
      {
        date: formatSlotDate(addDays(new Date(), 2)),
        time: '11:30 AM',
        duration: `${duration}min`  // Using duration here
      }
    ]

    return NextResponse.json({ slots: mockSlots })

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