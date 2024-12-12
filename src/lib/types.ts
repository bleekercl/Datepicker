// src/lib/types.ts

// Request/Response Types
export interface AvailabilityRequest {
  usernames: string[]
  startDate: string     // Required now
  endDate: string       // Required now
  duration?: number     // in minutes, default 30
}

export interface AvailabilityResponse {
  slots: CommonSlot[]
  error?: string
}

export interface CommonSlot {
  date: string      // Format: "2024-12-15"
  time: string      // Format: "10:00 AM"
  duration: string  // Format: "30min"
}

// Calendly API Response Types
export interface CalendlyUser {
  resource: {
    uri: string
    name: string
    slug: string
    email: string
    scheduling_url: string
    timezone: string
  }
}

export interface CalendlyBusyTime {
  type: 'calendly' | 'external'
  start_time: string
  end_time: string
  buffered_start_time?: string
  buffered_end_time?: string
}

export interface CalendlySchedule {
  collection: Array<{
    uri: string
    default: boolean
    name: string
    timezone: string
    rules: Array<{
      type: 'wday' | 'date'
      intervals: Array<{
        from: string
        to: string
      }>
      wday?: string
      date?: string
    }>
  }>
}