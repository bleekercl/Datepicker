// src/components/CalendlyDashboard.tsx
'use client'

import { useState } from 'react'
import { Plus, X, Calendar, Clock, Loader2, AlertCircle, Link } from 'lucide-react'
import { findCommonAvailability } from '@/lib/calendly'
import type { CommonSlot } from '@/lib/types'
import { addDays } from 'date-fns'

const INITIAL_URL = ['']
const URL_EXAMPLE = 'https://calendly.com/username/event-name'

export default function CalendlyDashboard() {
  const [eventUrls, setEventUrls] = useState<string[]>(INITIAL_URL)
  const [commonSlots, setCommonSlots] = useState<CommonSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: addDays(new Date(), 7).toISOString().split('T')[0]
  })

  const addUrlField = () => {
    setEventUrls(prev => [...prev, ''])
  }

  const removeUrlField = (indexToRemove: number) => {
    setEventUrls(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const updateUrl = (index: number, newValue: string) => {
    setEventUrls(prev => {
      const updated = [...prev]
      updated[index] = newValue
      return updated
    })
    setError(null)
  }

  const handleSubmit = async () => {
    if (eventUrls.some(url => !url.trim())) {
      setError('Please fill in all Calendly event URLs')
      return
    }

    if (!eventUrls.every(url => url.includes('calendly.com/'))) {
      setError('Please enter complete Calendly URLs starting with calendly.com/')
      return
    }

    setIsLoading(true)
    setError(null)
    setCommonSlots([])

    try {
      const slots = await findCommonAvailability(
        eventUrls,
        dateRange.startDate,
        dateRange.endDate
      )
      setCommonSlots(slots)
      if (slots.length === 0) {
        setError('No common availability found in the selected date range')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch availability')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
          Multi-User Calendly Dashboard
        </h1>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <Link className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">How to use:</p>
                <ol className="mt-1 list-decimal pl-4">
                  <li>Copy the complete Calendly event URL from each person's scheduling page</li>
                  <li>Paste each URL below (e.g., {URL_EXAMPLE})</li>
                  <li>Select a date range (max 7 days)</li>
                  <li>Click find to see common available slots</li>
                </ol>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {eventUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={e => updateUrl(index, e.target.value)}
                  placeholder="Enter complete Calendly event URL"
                  className="w-full rounded-lg border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
                {eventUrls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Remove field"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setDateRange(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))
                    setError(null)
                  }}
                  className="w-full rounded-lg border-gray-200 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  min={dateRange.startDate}
                  max={addDays(new Date(dateRange.startDate), 7).toISOString().split('T')[0]}
                  onChange={(e) => {
                    setDateRange(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))
                    setError(null)
                  }}
                  className="w-full rounded-lg border-gray-200 text-gray-900"
                />
              </div>
            </div>

            <button
              onClick={addUrlField}
              className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another URL
            </button>

            <button
              onClick={handleSubmit}
              disabled={isLoading || eventUrls.some(u => !u.trim())}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 p-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding Available Slots...
                </>
              ) : (
                'Find Common Available Slots'
              )}
            </button>
          </div>

          {commonSlots.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 font-medium">Available Slots</h2>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {commonSlots.map((slot, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{slot.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span>{slot.time}</span>
                    </div>
                    <span className="text-gray-500">
                      ({slot.duration})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}