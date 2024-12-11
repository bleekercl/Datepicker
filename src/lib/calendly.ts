// src/lib/calendly.ts
import { CommonSlot, CalendlyAvailability, AvailabilityResponse } from '@/lib/types'
import { format } from 'date-fns'

// Function to fetch common availability times from our API
export async function findCommonAvailability(usernames: string[]): Promise<CommonSlot[]> {
  try {
    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usernames }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to fetch availability')
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

// Helper function to format a date object to our desired string format
export function formatSlotTime(date: Date): string {
  return format(date, 'h:mm a')  // "10:00 AM"
}

// Helper function to format a date object to our desired date format
export function formatSlotDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')  // "2024-12-15"
}