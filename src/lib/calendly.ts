import { 
  CommonSlot, 
  availabilityResponseSchema 
} from "@/lib/types";

export async function findCommonAvailability(eventUrls: string[]): Promise<CommonSlot[]> {
  if (!eventUrls.length) {
    return [];
  }

  try {
    const response = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventUrls }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch availability");
    }

    // Validate the response data
    const parseResult = availabilityResponseSchema.safeParse(data);
    if (!parseResult.success) {
      console.error("Invalid response format:", parseResult.error);
      throw new Error("Invalid response format from server");
    }

    return parseResult.data.slots;
  } catch (error) {
    console.error("Error in findCommonAvailability:", error);
    throw error instanceof Error 
      ? error 
      : new Error("An unexpected error occurred");
  }
}