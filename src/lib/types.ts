// src/lib/types.ts
export interface CommonSlot {
  date: string      // Format: "2024-12-15"
  time: string      // Format: "10:00 AM"
  duration: string  // Format: "30min"
}

export interface AvailabilityRequest {
  usernames: string[]
  duration?: number
  startDate?: string
  endDate?: string
}

export interface AvailabilityResponse {
  slots: CommonSlot[]
  error?: string
}