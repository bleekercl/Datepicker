import { NextResponse } from "next/server"
import type { 
  AvailabilityRequest, 
  CommonSlot, 
  CalendlyTimeSlot,
  CalendlyPublicAvailabilityResponse
} from "@/lib/types"
import { formatSlotTime, formatSlotDate } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"

const CALENDLY_API_BASE = "https://api.calendly.com/scheduling_links"

async function fetchPublicAvailability(
  url: string,
  startTime: string,
  endTime: string
): Promise<CalendlyTimeSlot[]> {
  try {
    const eventPath = new URL(url).pathname
    const apiUrl = `${CALENDLY_API_BASE}${eventPath}/available_times`
    
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime
    })

    const response = await fetch(`${apiUrl}?${params}`, {
      headers: {
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error("Failed to fetch availability")
    }

    const data = await response.json() as CalendlyPublicAvailabilityResponse
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
      .filter((slot) => 
        slot.status === "available" && 
        slot.invitees_remaining > 0
      )
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
): Promise<NextResponse> {
  try {
    const { eventUrls, startDate, endDate }: AvailabilityRequest = await request.json()

    if (!eventUrls?.length) {
      return NextResponse.json(
        { error: "No event URLs provided" },
        { status: 400 }
      )
    }

    // Validate URLs
    const invalidUrls = eventUrls.filter((url) => {
      try {
        const parsed = new URL(url)
        return !parsed.hostname.includes("calendly.com") || 
               parsed.pathname.split("/").length < 3
      } catch {
        return true
      }
    })

    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { error: `Invalid Calendly URLs: ${invalidUrls.join(", ")}` },
        { status: 400 }
      )
    }

    const startTime = parseISO(startDate).toISOString()
    const endTime = addDays(parseISO(endDate), 1).toISOString()

    const availabilityPromises = eventUrls.map((url) => 
      fetchPublicAvailability(url, startTime, endTime)
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