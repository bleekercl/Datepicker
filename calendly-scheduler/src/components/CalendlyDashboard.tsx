// src/components/CalendlyDashboard.tsx
'use client'

import { useState } from 'react'
import { Plus, X, Calendar, Clock, Loader2 } from 'lucide-react'
import { findCommonAvailability } from '@/lib/calendly'
import type { CommonSlot } from '@/lib/types'

export default function CalendlyDashboard() {
  const [usernames, setUsernames] = useState<string[]>([''])
  const [commonSlots, setCommonSlots] = useState<CommonSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addUsernameField = () => {
    setUsernames([...usernames, ''])
  }

  const removeUsernameField = (index: number) => {
    const newUsernames = usernames.filter((_, i) => i !== index)
    setUsernames(newUsernames)
  }

  const handleUsernameChange = (index: number, value: string) => {
    const newUsernames = [...usernames]
    newUsernames[index] = value
    setUsernames(newUsernames)
  }

  const handleFindSlots = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const slots = await findCommonAvailability(usernames)
      setCommonSlots(slots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch availability')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Multi-User Calendly Dashboard
        </h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {usernames.map((username, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(index, e.target.value)}
                placeholder="Enter Calendly username"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {usernames.length > 1 && (
                <button
                  onClick={() => removeUsernameField(index)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  aria-label="Remove username field"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button
            onClick={addUsernameField}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="inline-block w-4 h-4 mr-2" />
            Add Another Username
          </button>

          <button
            onClick={handleFindSlots}
            disabled={isLoading || usernames.some(u => !u.trim())}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin" />
                Finding Common Slots...
              </>
            ) : (
              'Find Common Available Slots'
            )}
          </button>
        </div>

        {commonSlots.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Common Available Slots:
            </h2>
            <div className="space-y-2">
              {commonSlots.map((slot, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 p-4 rounded-md flex items-center gap-4"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>{slot.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span>{slot.time}</span>
                  </div>
                  <span className="text-gray-500">({slot.duration})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}