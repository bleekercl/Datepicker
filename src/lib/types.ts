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
  message?: string
}

export interface CalendlyTimeSlot {
  start_time: string
  end_time: string
  invitees_remaining: number
  scheduling_url: string
  status: string
}

export interface CalendlyPublicAvailabilityResponse {
  collection: CalendlyTimeSlot[]
}