// src/lib/calendly.ts
import { CommonSlot, AvailabilityResponse, CalendlyBusyTime, CalendlySchedule } from './types'
import { parseISO, format, differenceInDays } from 'date-fns'

export async function findCommonAvailability(
  usernames: string[],
  startDate: string,
  endDate: string,
  duration: number = 30
): Promise<CommonSlot[]> {
  // Validate date range
  const start = new Date(startDate)
  const end = new Date(endDate)
  const dayDiff = differenceInDays(end, start)

  if (dayDiff > 7) {
    throw new Error('Date range cannot exceed 7 days')
  }

  if (dayDiff < 0) {
    throw new Error('End date must be after start date')
  }

  try {
    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames,
        startDate,
        endDate,
        duration
      }),
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

export function formatSlotTime(date: string): string {
  return format(parseISO(date), 'h:mm a')
}

export function formatSlotDate(date: string): string {
  return format(parseISO(date), 'yyyy-MM-dd')
}

export function generateTimeSlots(
  start: string,
  end: string,
  durationMinutes: number
): Date[] {
  const slots: Date[] = []
  let currentSlot = new Date(start)
  const endTime = new Date(end)

  while (currentSlot < endTime) {
    slots.push(new Date(currentSlot))
    currentSlot = new Date(currentSlot.getTime() + durationMinutes * 60000)
  }

  return slots
}

export function isWithinWorkingHours(
  slot: Date,
  schedule: CalendlySchedule
): boolean {
  const dayOfWeek = format(slot, 'EEEE').toLowerCase()
  const timeString = format(slot, 'HH:mm')

  const rule = schedule.collection[0]?.rules.find(r => 
    r.type === 'wday' && r.wday === dayOfWeek
  )

  if (!rule) return false

  return rule.intervals.some(interval => {
    return timeString >= interval.from && timeString <= interval.to
  })
}

export function hasNoConflicts(
  slot: Date,
  duration: number,
  busyTimes: CalendlyBusyTime[]
): boolean {
  const slotEnd = new Date(slot.getTime() + duration * 60000)

  return !busyTimes.some(busy => {
    const busyStart = new Date(busy.start_time)
    const busyEnd = new Date(busy.end_time)

    return (
      (slot >= busyStart && slot < busyEnd) ||
      (slotEnd > busyStart && slotEnd <= busyEnd) ||
      (slot <= busyStart && slotEnd >= busyEnd)
    )
  })
}