import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { 
  CommonSlot, 
  availabilityRequestSchema
} from "@/lib/types";

// Custom error types for better error handling
class CalendlyError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
    this.name = 'CalendlyError';
  }
}

// Interface for the expected response structure
interface GPTResponse {
  slots?: Array<{
    date?: string;
    time?: string;
  }>;
}

// Validate Calendly URL format
function isValidCalendlyUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.includes('calendly.com');
  } catch {
    return false;
  }
}

async function fetchAvailabilityFromGPT(openai: OpenAI, url: string): Promise<CommonSlot[]> {
  // Validate URL format first
  if (!isValidCalendlyUrl(url)) {
    throw new CalendlyError(`Invalid Calendly URL format: ${url}`, 400);
  }

  try {
    const messages: Array<ChatCompletionMessageParam> = [
      {
        role: "system",
        content: "You are a helpful assistant that extracts availability information from Calendly URLs. You must return ONLY valid JSON in the exact format: {\"slots\": [{\"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM\"}]}. For each URL:\n1. Check the calendar month view\n2. Click through each date that shows availability (blue dots or highlights)\n3. For each date, collect all available time slots shown on the right side\n4. If you encounter any errors, still return valid JSON with an empty slots array: {\"slots\": []}"
      },
      {
        role: "user",
        content: `Extract ALL available dates and time slots from the following Calendly URL: ${url}. Return ONLY valid JSON, no explanations or error messages. Format: {\"slots\": [{\"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM\"}]}. If you encounter any issues, return {\"slots\": []}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 2000
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new CalendlyError("Empty response from OpenAI", 500);
    }

    console.log("Raw GPT response for URL:", url, "Response:", result);

    try {
      const parsed = JSON.parse(result) as GPTResponse;
      
      // Validate response structure
      if (!parsed || typeof parsed !== 'object') {
        throw new CalendlyError("Invalid response format from OpenAI", 500);
      }
      
      if (!parsed.slots || !Array.isArray(parsed.slots)) {
        console.error("Invalid response structure:", parsed);
        return [];
      }

      const validSlots = parsed.slots.filter((slot): slot is CommonSlot => {
        return Boolean(
          slot?.date != null && 
          slot?.time != null &&
          typeof slot.date === 'string' && 
          typeof slot.time === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(slot.date) &&
          /^\d{2}:\d{2}$/.test(slot.time)
        );
      });

      return validSlots;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", result);
      console.error("Parse error:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Error fetching availability from GPT:", error);
    
    if (error instanceof CalendlyError) {
      throw error;
    }
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new CalendlyError("Rate limit exceeded. Please try again later.", 429);
      }
      throw new CalendlyError(`OpenAI API error: ${error.message}`, error.status || 500);
    }

    throw new CalendlyError("Failed to fetch availability", 500);
  }
}

// Find slots that are common across all calendars
function findCommonSlots(allAvailabilities: Array<CommonSlot[]>): CommonSlot[] {
  if (allAvailabilities.length === 0) return [];
  if (allAvailabilities.length === 1) return allAvailabilities[0];

  let commonSlots = allAvailabilities[0];

  for (let i = 1; i < allAvailabilities.length; i++) {
    commonSlots = commonSlots.filter(slot1 => 
      allAvailabilities[i].some(slot2 => 
        slot1.date === slot2.date && slot1.time === slot2.time
      )
    );

    if (commonSlots.length === 0) {
      return [];
    }
  }

  return commonSlots.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not configured");
    return NextResponse.json({ 
      error: "Server configuration error",
      message: "OpenAI API key is not configured"
    }, { status: 500 });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const body = await request.json();
    
    const parseResult = availabilityRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: "Invalid request format",
        details: parseResult.error.issues 
      }, { status: 400 });
    }

    const { eventUrls } = parseResult.data;

    if (eventUrls.length > 5) {
      return NextResponse.json({
        error: "Too many URLs",
        message: "Maximum of 5 URLs allowed per request"
      }, { status: 400 });
    }

    const invalidUrls = eventUrls.filter(url => !isValidCalendlyUrl(url));
    if (invalidUrls.length > 0) {
      return NextResponse.json({
        error: "Invalid URLs",
        message: "One or more URLs are not valid Calendly URLs",
        invalidUrls
      }, { status: 400 });
    }

    const availabilityPromises = eventUrls.map(url => fetchAvailabilityFromGPT(openai, url));
    const allAvailabilities = await Promise.all(availabilityPromises);
    const commonSlots = findCommonSlots(allAvailabilities);

    return NextResponse.json({
      slots: commonSlots,
      metadata: {
        processedUrls: eventUrls.length,
        timestamp: new Date().toISOString(),
        totalSlotsFound: commonSlots.length
      }
    });
  } catch (error) {
    console.error("Error processing request:", error);

    if (error instanceof CalendlyError) {
      return NextResponse.json({ 
        error: error.name,
        message: error.message
      }, { status: error.statusCode });
    }

    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
