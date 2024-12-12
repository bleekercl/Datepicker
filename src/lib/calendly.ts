// src/lib/calendly.ts
import { CommonSlot, AvailabilityResponse, CalendlyEventInfo } from './types'
import { parseISO, format } from 'date-fns'

export function parseCalendlyUrl(url: string): CalendlyEventInfo {
  const cleanUrl = url.trim().toLowerCase()
  const urlPattern = /^(?:https?:\/\/)?(?:www\.)?calendly\.com\/([^\/]+)\/([^\/\?]+)/
  const match = cleanUrl.match(urlPattern)
  
  if (!match) {
    throw new Error('Invalid Calendly URL format')
  }
  
  return {
    username: match[1],
    eventSlug: match[2]
  }
}

export async function findCommonAvailability(
  eventUrls: string[],
  startDate: string,
  endDate: string
): Promise<CommonSlot[]> {
  try {
    // Validate inputs
    if (!eventUrls.length) {
      throw new Error('No event URLs provided')
    }

    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventUrls,
        startDate,
        endDate
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch availability')
    }

    const data = await response.json() as AvailabilityResponse
    return data.slots
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'An unexpected error occurred')
  }
}

export function formatSlotTime(date: string): string {
  return format(parseISO(date), 'h:mm a')
}

export function formatSlotDate(date: string): string {
  return format(parseISO(date), 'yyyy-MM-dd')
}