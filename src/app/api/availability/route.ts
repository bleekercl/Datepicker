// src/app/api/availability/route.ts
import { NextResponse } from 'next/server'
import type { CommonSlot, AvailabilityRequest } from '@/lib/types'
import { formatSlotDate } from '@/lib/calendly'

export async function POST(request: Request) {
  try {
    const { eventUrls }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: "No event URLs provided" },
        { status: 400 }
      )
    }

    // Fetch availability data for each URL
    const availabilityPromises = eventUrls.map(async (url) => {
      try {
        // Validate and process URL
        const originalUrl = new URL(url)
        // Use a simple HEAD request first to validate the URL
        const checkResponse = await fetch(url, { method: 'HEAD' })
        if (!checkResponse.ok) {
          throw new Error(`Invalid Calendly URL: ${url}`)
        }

        // Construct the proper URL for availability data
        const availabilityUrl = new URL(`${originalUrl.origin}${originalUrl.pathname}/available_spots`)
        availabilityUrl.searchParams.set('month', originalUrl.searchParams.get('month') || new Date().toISOString().split('T')[0].substring(0, 7))

        const availabilityResponse = await fetch(availabilityUrl.toString(), {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          cache: 'no-store'
        })

        if (!availabilityResponse.ok) {
          throw new Error(`Failed to fetch availability for ${url}`)
        }

        const data = await availabilityResponse.json()
        return data

      } catch (error) {
        console.error(`Error processing URL ${url}:`, error)
        throw error
      }
    })

    let availabilities
    try {
      availabilities = await Promise.all(availabilityPromises)
    } catch (error) {
      return NextResponse.json({
        error: `Failed to fetch availabilities: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 })
    }

    // For debugging
    console.log('Availabilities:', JSON.stringify(availabilities, null, 2))

    // Return mock data for testing
    const mockSlots: CommonSlot[] = [{
      date: formatSlotDate(new Date().toISOString()),
      time: "10:00 AM",
      duration: "30min"
    }]

    return NextResponse.json({ slots: mockSlots })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    }, { status: 500 })
  }
}