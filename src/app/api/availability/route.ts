import { NextResponse } from "next/server"
import type { 
  AvailabilityRequest, 
  CommonSlot, 
  CalendlyTimeSlot,
  CalendlyAvailabilityResponse,
  CalendlyError,
  AvailabilityResponse
} from "@/lib/types"
import { formatSlotTime, formatSlotDate } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"

const CALENDLY_API_BASE = "https://api.calendly.com/scheduling_links"

interface ErrorResponse {
  error: string
  status?: number
}

async function getEventTypeUuid(eventUrl: string): Promise<string> {
  try {
    const response = await fetch(eventUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event type for URL: ${eventUrl}`)
    }
    
    const finalUrl = new URL(response.url)
    const urlParts = finalUrl.pathname.split("/").filter(Boolean)
    const eventUuid = urlParts[urlParts.length - 1]
    
    if (!eventUuid) {
      throw new Error("Could not extract event UUID from URL")
    }
    
    return eventUuid
  } catch (error) {
    const message = error instanceof Error 
      ? error.message 
      : "Invalid or inaccessible Calendly URL"
    throw new Error(`${message}: ${eventUrl}`)
  }
}

async function fetchAvailability(
  url: string,
  startTime: string,
  endTime: string
): Promise<CalendlyTimeSlot[]> {
  try {
    const eventUuid = await getEventTypeUuid(url)
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime
    })

    const availabilityResponse = await fetch(
      `${CALENDLY_API_BASE}/${eventUuid}/available_times?${params.toString()}`,
      {
        headers: {
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
    if (error instanceof Error) {
      throw new Error(`Error processing URL ${url}: ${error.message}`)
    }
    throw new Error(`Unknown error processing URL ${url}`)
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
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}