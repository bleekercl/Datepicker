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

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to fetch availability")
  }

  const data = await response.json() as AvailabilityResponse
  return data.slots
}

export function formatSlotTime(date: string): string {
  return format(parseISO(date), "h:mm a")
}

export function formatSlotDate(date: string): string {
  return format(parseISO(date), "yyyy-MM-dd")
}