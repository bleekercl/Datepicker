// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import type { CommonSlot, AvailabilityRequest } from '@/lib/types'
import { formatSlotDate, formatSlotTime, parseCalendlyUrl } from '@/lib/calendly'

export async function POST(request: Request) {
  try {
    const { eventUrls }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: 'No event URLs provided' },
        { status: 400 }
      )
    }

    // Validate and parse all URLs
    await Promise.all(
      eventUrls.map(async (url) => {
        const parsedUrl = parseCalendlyUrl(url)
        if (!parsedUrl) {
          throw new Error(`Invalid URL format: ${url}`)
        }
        return parsedUrl
      })
    )

    // Fetch availability for each event URL in parallel
    const availabilityPromises = eventUrls.map(async (url) => {
      const { username, eventSlug } = parseCalendlyUrl(url)
      const response = await fetch(
        `https://calendly.com/${username}/${eventSlug}/available_spots`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch availability for ${username}`)
      }

      return response.json()
    })

    const availabilities = await Promise.all(availabilityPromises)

    // Find common time slots
    const commonSlots: CommonSlot[] = availabilities[0].spots.map((slot: { start_time: string; duration: number }) => ({
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