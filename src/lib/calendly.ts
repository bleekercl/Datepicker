import type { CommonSlot, AvailabilityResponse } from "./types"
import { parseISO, format } from "date-fns"

export async function findCommonAvailability(
  eventUrls: string[],
  startDate: string,
  endDate: string
): Promise<CommonSlot[]> {
  const response = await fetch("/api/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventUrls, startDate, endDate }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch availability")
  }

  return (data as AvailabilityResponse).slots
}

export function formatSlotTime(date: string): string {
  return format(parseISO(date), "h:mm a")
}

export function formatSlotDate(date: string): string {
  return format(parseISO(date), "EEE, MMM d, yyyy")
}

export function extractUsername(url: string): string {
  try {
    const urlPath = new URL(url).pathname.split("/")
    const username = urlPath[1]
    
    if (!username) {
      throw new Error("Invalid URL format: missing username")
    }
    
    return username
  } catch (error) {
    throw new Error(
      error instanceof Error 
        ? `Invalid Calendly URL: ${error.message}`
        : "Invalid Calendly URL"
    )
  }
}

export function extractEventSlug(url: string): string {
  try {
    const urlPath = new URL(url).pathname.split("/")
    const eventSlug = urlPath[2]
    
    if (!eventSlug) {
      throw new Error("Invalid URL format: missing event slug")
    }
    
    // Remove query parameters if present
    return eventSlug.split("?")[0]
  } catch (error) {
    throw new Error(
      error instanceof Error 
        ? `Invalid Calendly URL: ${error.message}`
        : "Invalid Calendly URL"
    )
  }
}