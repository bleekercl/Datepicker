import { NextResponse } from "next/server"
import type { 
  AvailabilityRequest, 
  CommonSlot, 
  CalendlyTimeSlot,
  CalendlyAvailabilityResponse,
  CalendlyError,
  AvailabilityResponse,
  CalendlyUser,
  CalendlyEventType
} from "@/lib/types"
import { formatSlotTime, formatSlotDate, extractUsername, extractEventSlug } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"

const CALENDLY_API_BASE = "https://api.calendly.com"
const ACCESS_TOKEN = process.env.CALENDLY_PERSONAL_ACCESS_TOKEN

interface ErrorResponse {
  error: string
  status?: number
}

async function getEventTypeUuid(url: string): Promise<string> {
  if (!ACCESS_TOKEN) {
    throw new Error("Calendly Personal Access Token not configured")
  }

  try {
    const username = extractUsername(url)
    const eventSlug = extractEventSlug(url)

    // Get user's URI
    const userResponse = await fetch(
      `${CALENDLY_API_BASE}/users/${username}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    )

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error("User fetch failed:", userResponse.status, errorText)
      throw new Error("Failed to fetch user information")
    }

    const userData = await userResponse.json() as CalendlyUser
    const userUri = userData.resource.uri

    // Get event type UUID
    const eventTypesResponse = await fetch(
      `${CALENDLY_API_BASE}/event_types?user=${encodeURIComponent(userUri)}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    )

    if (!eventTypesResponse.ok) {
      const errorText = await eventTypesResponse.text()
      console.error("Event types fetch failed:", eventTypesResponse.status, errorText)
      throw new Error("Failed to fetch event types")
    }

    const eventTypesData = await eventTypesResponse.json()
    const eventType = eventTypesData.collection.find(
      (et: CalendlyEventType) => et.slug === eventSlug
    )

    if (!eventType) {
      throw new Error(`Event type not found: ${eventSlug}`)
    }

    return eventType.uuid
  } catch (error) {
    const message = error instanceof Error 
      ? error.message 
      : "Invalid or inaccessible Calendly URL"
    throw new Error(`${message}: ${url}`)
  }
}

async function fetchAvailability(
  url: string,
  startTime: string,
  endTime: string
): Promise<CalendlyTimeSlot[]> {
  try {
    if (!ACCESS_TOKEN) {
      throw new Error("Calendly Personal Access Token not configured")
    }

    const eventTypeUuid = await getEventTypeUuid(url)
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime
    })

    const availabilityResponse = await fetch(
      `${CALENDLY_API_BASE}/event_types/${eventTypeUuid}/available_times?${params}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    )

    if (!availabilityResponse.ok) {
      const errorData = await availabilityResponse.json() as CalendlyError
      throw new Error(
        `Failed to fetch availability: ${errorData.message || availabilityResponse.statusText}`
      )
    }

    const data = await availabilityResponse.json() as CalendlyAvailabilityResponse
    return data.collection
  } catch (error) {
    throw new Error(
      `Error processing URL ${url}: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

function findCommonAvailableSlots(
  allAvailabilities: CalendlyTimeSlot[][]
): CommonSlot[] {
  let commonSlots: CommonSlot[] = []

  allAvailabilities.forEach((availability: CalendlyTimeSlot[], index: number) => {
    const formattedSlots = availability
      .filter((slot) => slot.spots_available > 0)
      .map((slot) => ({
        date: formatSlotDate(slot.start_time),
        time: formatSlotTime(slot.start_time),
        duration: "30min"
      }))

    if (index === 0) {
      commonSlots = formattedSlots
      return
    }

    commonSlots = commonSlots.filter((commonSlot) => 
      formattedSlots.find((formattedSlot) => 
        formattedSlot.date === commonSlot.date && 
        formattedSlot.time === commonSlot.time
      )
    )
  })

  return commonSlots
}

export async function POST(
  request: Request
): Promise<NextResponse<AvailabilityResponse | ErrorResponse>> {
  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Calendly Personal Access Token not configured" },
        { status: 500 }
      )
    }

    const { eventUrls, startDate, endDate }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: "No event URLs provided" },
        { status: 400 }
      )
    }

    const startTime = parseISO(startDate).toISOString()
    const endTime = addDays(parseISO(endDate), 1).toISOString()

    const availabilityPromises = eventUrls.map((url) => 
      fetchAvailability(url, startTime, endTime)
    )

    const allAvailabilities = await Promise.all(availabilityPromises)
    const commonSlots = findCommonAvailableSlots(allAvailabilities)

    return NextResponse.json({ 
      slots: commonSlots,
      message: commonSlots.length === 0 ? "No common availability found" : undefined
    })

  } catch (error) {
    console.error("API Error:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}