'use client';

import { useState } from "react";
import { findCommonAvailability } from "@/lib/calendly";
import type { CommonSlot } from "@/lib/types";

const INITIAL_URL = [""];
const URL_EXAMPLE = "https://calendly.com/username/event-name";

export default function CalendlyDashboard() {
  const [eventUrls, setEventUrls] = useState<string[]>(INITIAL_URL);
  const [commonSlots, setCommonSlots] = useState<CommonSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addUrlField = () => {
    setEventUrls((prev) => [...prev, ""]);
  };

  const removeUrlField = (indexToRemove: number) => {
    setEventUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const updateUrl = (index: number, newValue: string) => {
    setEventUrls((prev) => {
      const updated = [...prev];
      updated[index] = newValue;
      return updated;
    });
    setError(null);
  };

  const handleSubmit = async () => {
    if (eventUrls.some((url) => !url.trim())) {
      setError("Please fill in all Calendly event URLs");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCommonSlots([]);

    try {
      const slots = await findCommonAvailability(eventUrls);
      setCommonSlots(slots);
      
      if (slots.length === 0) {
        setError("No common availability found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
          Multi-User Calendly Dashboard
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {eventUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder={URL_EXAMPLE}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {eventUrls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    className="p-2 text-gray-500 hover:text-gray-700 
                             hover:bg-gray-100 rounded-md transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addUrlField}
            className="mt-4 w-full py-2 px-4 bg-gray-100 text-gray-700 
                     rounded-md hover:bg-gray-200 transition-colors"
          >
            + Add Another URL
          </button>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md
                     hover:bg-blue-700 transition-colors disabled:opacity-50 
                     disabled:cursor-not-allowed"
          >
            {isLoading ? "Finding Available Slots..." : "Find Common Available Slots"}
          </button>
        </div>

        {commonSlots.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold">Available Slots</h2>
            <ul className="mt-4 space-y-2">
              {commonSlots.map((slot, index) => (
                <li key={index} className="p-2 bg-gray-50 rounded-md">
                  {slot.date} at {slot.time}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
