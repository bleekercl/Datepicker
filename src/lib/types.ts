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

// Define specific types for API errors
export interface CalendlyAPIErrorDetail {
  parameter: string
  message: string
}

export interface CalendlyAPIError {
  type: string
  message: string
  details?: Record<string, CalendlyAPIErrorDetail>
}

export interface CalendlyAPIResponse<T> {
  data: T
  error?: CalendlyAPIError
}