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
    body: JSON.stringify({ eventUrls, startDate, endDate })
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

export function validateCalendlyUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes("calendly.com") && parsed.pathname.split("/").length >= 3
  } catch {
    return false
  }
}