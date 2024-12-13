// Interface definitions for Calendly integration
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

export interface CalendlyResource {
  uri: string
  name: string
  slug: string
}

export interface CalendlyUser {
  resource: CalendlyResource
}

export interface CalendlyEventType {
  uri: string
  uuid: string
  slug: string
  name: string
  duration: number
  type: string
}

export interface CalendlyPagination {
  count: number
  next_page?: string
  previous_page?: string
}

export interface CalendlyAvailabilityResponse {
  collection: CalendlyTimeSlot[]
  pagination: CalendlyPagination
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