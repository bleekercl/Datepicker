// src/lib/types.ts
// Types for our internal usage
export interface CommonSlot {
    date: string      // Format: "2024-12-15"
    time: string      // Format: "10:00 AM"
    duration: string  // Format: "30min"
  }
  
  // Calendly API Types
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
  
  export interface CalendlySchedulingLink {
    resource: {
      booking_url: string
      owner: string
      owner_type: string
    }
  }
  
  export interface CalendlyAvailability {
    resource: {
      available_times: Array<{
        start_time: string    // ISO date string
        end_time: string      // ISO date string
        status: 'available' | 'unavailable'
      }>
      user: string
      start_time: string
      end_time: string
    }
  }
  
  // API Request/Response Types
  export interface AvailabilityRequest {
    usernames: string[]
    duration?: number        // Duration in minutes
    startDate?: string      // ISO date string
    endDate?: string        // ISO date string
  }
  
  export interface AvailabilityResponse {
    slots: CommonSlot[]
    error?: string
  }