// src/app/api/availability/route.ts
import { NextResponse } from "next/server"
import type { AvailabilityRequest, CommonSlot } from "@/lib/types"
import { formatSlotTime, formatSlotDate } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"

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

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY

export async function POST(request: Request) {
  if (!CALENDLY_API_KEY) {
    return NextResponse.json(
      { error: "Calendly API not configured" },
      { status: 500 }
    )
  }

  try {
    const { eventUrls, startDate, endDate }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: "No event URLs provided" },
        { status: 400 }
      )
    }

    // Get authenticated user's URI
    const meResponse = await fetch("https://api.calendly.com/users/me", {
      headers: {
        Authorization: `Bearer ${CALENDLY_API_KEY}`,
        "Content-Type": "application/json"
      }
    })

    if (!meResponse.ok) {
      throw new Error("Failed to authenticate with Calendly")
    }

    const meData = (await meResponse.json()) as CalendlyUserResponse
    const userUri = meData.resource.uri

    // Process each event URL
    const availabilityPromises = eventUrls.map(async (url) => {
      const urlParts = new URL(url).pathname.split("/").filter(Boolean)
      const eventSlug = urlParts[1]

      if (!eventSlug) {
        throw new Error(`Invalid URL format: ${url}`)
      }

      // Get event types
      const eventTypesResponse = await fetch(
        `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}`,
        {
          headers: {
            Authorization: `Bearer ${CALENDLY_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!eventTypesResponse.ok) {
        throw new Error("Failed to fetch event types")
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
        {
          headers: {
            Authorization: `Bearer ${CALENDLY_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!availabilityResponse.ok) {
        throw new Error(`Failed to fetch availability for ${eventSlug}`)
      }

      const availabilityData = await availabilityResponse.json() as CalendlyAvailabilityResponse
      return availabilityData.collection
    })

    // Process all availabilities
    const allAvailabilities = await Promise.all(availabilityPromises)

    // Find common slots
    let commonSlots: CommonSlot[] = []

    // Process each availability set
    allAvailabilities.forEach((availability: CalendlyTimeSlot[], index: number) => {
      // Convert Calendly time slots to our common format
      const formattedSlots = availability.map((timeSlot: CalendlyTimeSlot) => ({
        date: formatSlotDate(timeSlot.start_time),
        time: formatSlotTime(timeSlot.start_time),
        duration: "30min"
      }))

      // If this is the first set, use it as the base
      if (index === 0) {
        commonSlots = formattedSlots
        return
      }

      // Filter common slots based on matching dates and times
      commonSlots = commonSlots.filter(commonSlot => 
        formattedSlots.find(formattedSlot => 
          formattedSlot.date === commonSlot.date && 
          formattedSlot.time === commonSlot.time
        )
      )
    })

    return NextResponse.json({ slots: commonSlots })

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}