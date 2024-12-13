// src/app/api/availability/route.ts
import { NextResponse } from "next/server"
import type { 
  AvailabilityRequest, 
  CommonSlot, 
  CalendlyTimeSlot,
  CalendlyAvailabilityResponse 
} from "@/lib/types"
import { formatSlotTime, formatSlotDate, extractEventUuid } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"

const CALENDLY_API_BASE = 'https://api.calendly.com/event_types'

export async function POST(request: Request) {
  try {
    const { eventUrls, startDate, endDate }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: "No event URLs provided" },
        { status: 400 }
      )
    }

    // Process each event URL
    const availabilityPromises = eventUrls.map(async (url) => {
      try {
        const eventUuid = extractEventUuid(url)
        const startTime = parseISO(startDate).toISOString()
        const endTime = addDays(parseISO(endDate), 1).toISOString()

        const availabilityResponse = await fetch(
          `${CALENDLY_API_BASE}/${eventUuid}/available_times?` +
          new URLSearchParams({
            start_time: startTime,
            end_time: endTime
          }).toString()
        )

        if (!availabilityResponse.ok) {
          const errorData = await availabilityResponse.json()
          throw new Error(
            `Failed to fetch availability for ${url}: ${errorData.message || availabilityResponse.statusText}`
          )
        }

        const data = await availabilityResponse.json() as CalendlyAvailabilityResponse
        return data.collection
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error)
        throw error
      }
    })

    // Process all availabilities
    const allAvailabilities = await Promise.all(availabilityPromises)
    let commonSlots: CommonSlot[] = []

    // Process each availability set
    allAvailabilities.forEach((availability: CalendlyTimeSlot[], index: number) => {
      // Convert Calendly time slots to our common format
      const formattedSlots = availability
        .filter(slot => slot.spots_available > 0)
        .map(slot => ({
          date: formatSlotDate(slot.start_time),
          time: formatSlotTime(slot.start_time),
          duration: "30min" // You might want to make this dynamic based on event type
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

    return NextResponse.json({ 
      slots: commonSlots,
      message: commonSlots.length === 0 ? "No common availability found" : undefined
    })

  } catch (error) {
    console.error('Availability processing error:', error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}