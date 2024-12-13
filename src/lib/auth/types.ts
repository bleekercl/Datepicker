// src/lib/auth/types.ts
export interface TokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    scope: string
  }
  
  export class CalendlyAuthError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'CalendlyAuthError'
    }
  }
  
  // Define specific types for error details
  export interface CalendlyErrorDetail {
    parameter: string
    message: string
  }
  
  export interface CalendlyErrorResponse {
    type: string
    message: string
    details?: Record<string, CalendlyErrorDetail>
  }