// src/lib/types.ts
export interface AvailabilityRequest {
  eventUrls: string[]
  startDate: string
  endDate: string
}

export interface CommonSlot {
  date: string
  time: string
  duration: string
}

export interface AvailabilityResponse {
  slots: CommonSlot[]
  error?: string
}

export interface CalendlyTimeSlot {
  start_time: string
  end_time: string
  status: string
  spots_available: number
}

export interface CalendlyAvailabilityResponse {
  collection: CalendlyTimeSlot[]
  pagination: {
    count: number
    next_page?: string
  }
}