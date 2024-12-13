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