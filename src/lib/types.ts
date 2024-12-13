import { z } from "zod";

// Base interface for availability slots
export interface CommonSlot {
  date: string;  // Format: YYYY-MM-DD
  time: string;  // Format: HH:MM
}

// Zod schemas for validation
export const commonSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected: YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format. Expected: HH:MM")
});

export const availabilityRequestSchema = z.object({
  eventUrls: z.array(z.string().url()).min(1)
});

export const availabilityResponseSchema = z.object({
  slots: z.array(commonSlotSchema)
});

// Type inference helpers
export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;