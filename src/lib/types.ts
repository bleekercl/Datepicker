// src/lib/types.ts
export interface AvailabilityRequest {
  eventUrls: string[]
  startDate: string
  endDate: string
}

export interface CommonSlot {
  date: string      // Format: "2024-12-15"
  time: string      // Format: "10:00 AM"
  duration: string  // Format: "30min"
}

export interface AvailabilityResponse {
  slots: CommonSlot[]
  error?: string
}

export interface CalendlyUser {
  uri: string
  email: string
  name: string
  scheduling_url: string
  timezone: string
}

export interface CalendlySchedulingInfo {
  uri: string
  available_times: Array<{
    start_time: string
    invitees_remaining: number
  }>
}