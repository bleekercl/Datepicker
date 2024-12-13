import { NextResponse } from "next/server"
import type { 
  AvailabilityRequest, 
  CommonSlot, 
  CalendlyTimeSlot,
  CalendlyPublicAvailabilityResponse
} from "@/lib/types"
import { formatSlotTime, formatSlotDate } from "@/lib/calendly"
import { parseISO, addDays } from "date-fns"

const CALENDLY_API = "https://api.calendly.com"

async function fetchPublicAvailability(
  url: string,
  startTime: string,
  endTime: string
): Promise<CalendlyTimeSlot[]> {
  try {
    // Parse the URL and get just the pathname without query parameters
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname.replace(/\/$/, "") // Remove trailing slash if present

    // Make the availability request
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime
    })

    const response = await fetch(
      `${CALENDLY_API}/scheduling_links${pathname}/available_times?${params}`,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    )

    // If the request fails, get the error details
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Calendly API Error:", {
        status: response.status,
        url: pathname,
        error: errorText
      })
      throw new Error(`Failed to fetch availability: ${response.status}`)
    }

    const data = await response.json() as CalendlyPublicAvailabilityResponse
    return data.collection
  } catch (error) {
    console.error("Availability Error:", error)
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
        (slot.invitees_remaining > 0 || slot.invitees_remaining === undefined)
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
        const pathParts = parsed.pathname.split('/').filter(Boolean)
        return !parsed.hostname.includes("calendly.com") || pathParts.length < 2
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

    // Process each URL in parallel
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
    console.error("API Error:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}