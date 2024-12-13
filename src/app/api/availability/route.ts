import { NextResponse } from "next/server";
import OpenAI from "openai";
import { 
  CommonSlot, 
  availabilityRequestSchema
} from "@/lib/types";

async function fetchAvailabilityFromGPT(openai: OpenAI, url: string): Promise<CommonSlot[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [{
        role: "system",
        content: "You are a helpful assistant that extracts availability information from Calendly URLs. For each URL, you must:\n1. Check the calendar month view\n2. Click through each date that shows availability (blue dots or highlights)\n3. For each date, collect all available time slots shown on the right side\n4. Return the data as valid JSON in the format: {\"slots\": [{\"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM\"}]}"
      }, {
        role: "user",
        content: `Extract ALL available dates and time slots from the following Calendly URL: ${url}. Make sure to:\n1. Look at the calendar month view\n2. Click each date that shows availability (marked with blue dots/highlights)\n3. Note all time slots that appear on the right side for each date\n4. Return ALL found slots as JSON in the format: {\"slots\": [{\"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM\"}]}`
      }],
      response_format: { type: "json_object" }
    });

    const result = response.choices[0].message.content;
    if (!result) throw new Error("No response from OpenAI");

    try {
      const parsed = JSON.parse(result);
      return parsed.slots || [];
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Error fetching availability from GPT:", error);
    throw new Error("Failed to fetch availability");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.OPENAI_API_KEY) {
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
    const availabilityPromises = eventUrls.map(url => fetchAvailabilityFromGPT(openai, url));
    const allAvailabilities = await Promise.all(availabilityPromises);

    return NextResponse.json({
      slots: allAvailabilities.flat(),
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
