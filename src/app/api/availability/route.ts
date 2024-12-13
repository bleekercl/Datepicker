import { NextResponse } from "next/server";
import OpenAI from "openai";
import { 
  CommonSlot, 
  availabilityRequestSchema
} from "@/lib/types";

async function fetchAvailabilityFromGPT(openai: OpenAI, url: string): Promise<CommonSlot[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "You are a helpful assistant that extracts availability information from Calendly URLs. Return only valid JSON."
      }, {
        role: "user",
        content: `Extract available dates and time slots from the following Calendly URL: ${url}. Return the data as JSON in the format: [{"date": "YYYY-MM-DD", "time": "HH:MM"}]`
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
