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
  message?: string
}

export interface CalendlyTimeSlot {
  start_time: string
  end_time: string
  status: string
  spots_available: number
}

export interface CalendlyEventType {
  uuid: string
  slug: string
  name: string
}

export interface CalendlyAvailabilityResponse {
  collection: CalendlyTimeSlot[]
  pagination: {
    count: number
    next_page?: string
  }
}

export interface CalendlyErrorDetail {
  parameter: string
  message: string
}

export interface CalendlyError {
  type: string
  message: string
  details?: Record<string, CalendlyErrorDetail>
}