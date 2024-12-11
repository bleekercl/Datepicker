// src/lib/calendly.ts
import type { CommonSlot, AvailabilityResponse } from './types'
import { format } from 'date-fns'

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

export function formatSlotTime(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatSlotDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}