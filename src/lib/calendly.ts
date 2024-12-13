// src/lib/calendly.ts
import { CommonSlot, AvailabilityResponse, CalendlyAPIError } from "./types"
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
    // Handle OAuth and API-specific errors
    if (response.status === 401) {
      throw new Error("Authentication failed. Please check your Calendly settings.")
    }
    throw new Error(data.error || "Failed to fetch availability")
  }

  return (data as AvailabilityResponse).slots
}

export function formatSlotTime(date: string): string {
  return format(parseISO(date), "h:mm a")
}

export function formatSlotDate(date: string): string {
  return format(parseISO(date), "yyyy-MM-dd")
}

export function isCalendlyError(error: unknown): error is CalendlyAPIError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error
  )
}