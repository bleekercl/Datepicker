// src/lib/calendly.ts
import { CommonSlot, AvailabilityResponse, CalendlyEventInfo } from './types'
import { parseISO, format, differenceInDays } from 'date-fns'

export function parseCalendlyUrl(url: string): CalendlyEventInfo {
  try {
    // Handle different URL formats
    const cleanUrl = url.trim().toLowerCase()
    
    // Match URLs like: https://calendly.com/jeroen-stolk/20min-adviesgesprek
    const urlPattern = /^(?:https?:\/\/)?(?:www\.)?calendly\.com\/([^\/]+)\/([^\/\?]+)/
    const match = cleanUrl.match(urlPattern)
    
    if (!match) {
      throw new Error('Invalid Calendly URL format')
    }
    
    return {
      username: match[1],
      eventSlug: match[2]
    }
  } catch (error) {
    throw new Error(`Invalid Calendly URL: ${url}`)
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

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dayDiff = differenceInDays(end, start)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format')
    }

    if (dayDiff > 7) {
      throw new Error('Date range cannot exceed 7 days')
    }

    if (dayDiff < 0) {
      throw new Error('End date must be after start date')
    }

    // Parse all URLs first to validate them
    const eventInfos = eventUrls.map(url => parseCalendlyUrl(url))

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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to find common availability: ${error.message}`)
    }
    throw new Error('An unexpected error occurred')
  }
}

export function formatSlotTime(date: string): string {
  return format(parseISO(date), 'h:mm a')
}

export function formatSlotDate(date: string): string {
  return format(parseISO(date), 'yyyy-MM-dd')
}