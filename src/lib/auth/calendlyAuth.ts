// src/lib/auth/calendlyAuth.ts
import { TokenResponse, CalendlyAuthError } from '@/lib/auth/types'

class TokenManager {
  private static instance: TokenManager
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null
  
  private constructor() {}
  
  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  private async fetchNewToken(): Promise<TokenResponse> {
    if (!process.env.CALENDLY_CLIENT_ID || !process.env.CALENDLY_CLIENT_SECRET) {
      throw new CalendlyAuthError('Missing Calendly OAuth credentials')
    }

    const response = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CALENDLY_CLIENT_ID,
        client_secret: process.env.CALENDLY_CLIENT_SECRET,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new CalendlyAuthError(`Failed to fetch token: ${error}`)
    }

    const data = await response.json()
    return data as TokenResponse
  }

  public async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    // Fetch new token
    try {
      const tokenData = await this.fetchNewToken()
      this.accessToken = tokenData.access_token
      // Set expiry to slightly before actual expiry to ensure we don't use an expired token
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 60) * 1000)
      return this.accessToken
    } catch (error) {
      this.accessToken = null
      this.tokenExpiry = null
      throw error
    }
  }

  public async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getAccessToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }
}

export const tokenManager = TokenManager.getInstance()