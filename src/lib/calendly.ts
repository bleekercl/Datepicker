// src/lib/calendly.ts
import { CommonSlot, AvailabilityResponse } from './types' // Removed CalendlyUser
import { parseISO, format } from 'date-fns'

// Removed unused CALENDLY_API_BASE

export function extractCalendlyUsername(url: string): string {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/').filter(Boolean)
  return pathParts[0]
}

export async function findCommonAvailability(
  eventUrls: string[],
  startDate: string,
  endDate: string
): Promise<CommonSlot[]> {
  try {
    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventUrls, startDate, endDate }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch availability')
    }

    return (await response.json() as AvailabilityResponse).slots
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    throw new Error(`Failed to find common availability: ${message}`)
  }
}

export function formatDateForDisplay(date: string): string {
  return format(parseISO(date), 'yyyy-MM-dd')
}

export function formatTimeForDisplay(date: string): string {
  return format(parseISO(date), 'h:mm a')
}
