// src/app/api/availability/route.ts
import { NextResponse } from "next/server"
import type { AvailabilityRequest, CommonSlot } from "@/lib/types"
import { formatSlotTime, formatSlotDate } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"
import { tokenManager } from "@/lib/auth/calendlyAuth"
import { CalendlyAuthError } from "@/lib/auth/types"

interface CalendlyTimeSlot {
  start_time: string
  end_time: string
}

interface CalendlyEventType {
  uuid: string
  slug: string
}

interface CalendlyUserResponse {
  resource: {
    uri: string
  }
}

interface CalendlyAvailabilityResponse {
  collection: CalendlyTimeSlot[]
}

export async function POST(request: Request) {
  try {
    const { eventUrls, startDate, endDate }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: "No event URLs provided" },
        { status: 400 }
      )
    }

    const headers = await tokenManager.getAuthHeaders()

    // Get authenticated user's URI
    const meResponse = await fetch("https://api.calendly.com/users/me", {
      headers
    })

    if (!meResponse.ok) {
      throw new CalendlyAuthError("Failed to authenticate with Calendly")
    }

    const meData = (await meResponse.json()) as CalendlyUserResponse
    const userUri = meData.resource.uri

    // Process each event URL with proper error handling
    const availabilityPromises = eventUrls.map(async (url) => {
      const urlParts = new URL(url).pathname.split("/").filter(Boolean)
      const eventSlug = urlParts[1]

      if (!eventSlug) {
        throw new Error(`Invalid URL format: ${url}`)
      }

      // Get event types
      const eventTypesResponse = await fetch(
        `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}`,
        { headers }
      )

      if (!eventTypesResponse.ok) {
        const errorData = await eventTypesResponse.json()
        throw new CalendlyAuthError(
          `Failed to fetch event types: ${errorData.message || eventTypesResponse.statusText}`
        )
      }

      const eventTypesData = await eventTypesResponse.json()
      const eventType = eventTypesData.collection.find(
        (et: CalendlyEventType) => et.slug === eventSlug
      )

      if (!eventType) {
        throw new Error(`No event type found for: ${eventSlug}`)
      }

      // Get availability for event type
      const startTime = parseISO(startDate).toISOString()
      const endTime = addDays(parseISO(endDate), 1).toISOString()

      const availabilityResponse = await fetch(
        `https://api.calendly.com/event_types/${eventType.uuid}/availability?` +
        new URLSearchParams({
          start_time: startTime,
          end_time: endTime
        }).toString(),
        { headers }
      )

      if (!availabilityResponse.ok) {
        const errorData = await availabilityResponse.json()
        throw new CalendlyAuthError(
          `Failed to fetch availability: ${errorData.message || availabilityResponse.statusText}`
        )
      }

      const availabilityData = (await availabilityResponse.json()) as CalendlyAvailabilityResponse
      return availabilityData.collection
    })

    // Handle all promises with proper error aggregation
    try {
      const allAvailabilities = await Promise.all(availabilityPromises)
      
      // Find common slots
      let commonSlots: CommonSlot[] = []

      allAvailabilities.forEach((availability: CalendlyTimeSlot[], index: number) => {
        const formattedSlots = availability.map((timeSlot: CalendlyTimeSlot) => ({
          date: formatSlotDate(timeSlot.start_time),
          time: formatSlotTime(timeSlot.start_time),
          duration: "30min"
        }))

        if (index === 0) {
          commonSlots = formattedSlots
          return
        }

        commonSlots = commonSlots.filter(commonSlot => 
          formattedSlots.find(formattedSlot => 
            formattedSlot.date === commonSlot.date && 
            formattedSlot.time === commonSlot.time
          )
        )
      })

      return NextResponse.json({ slots: commonSlots })
    } catch (error) {
      if (error instanceof CalendlyAuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }
      throw error
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    const status = error instanceof CalendlyAuthError ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}