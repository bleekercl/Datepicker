// src/lib/calendly.ts
import { CommonSlot, AvailabilityResponse } from "./types"
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

export function extractEventUuid(url: string): string {
  try {
    const urlParts = new URL(url).pathname.split("/")
    // The event type should be the last part of the URL
    return urlParts[urlParts.length - 1]
  } catch (error) {
    throw new Error(`Invalid Calendly URL: ${url}`)
  }
}