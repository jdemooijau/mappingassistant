import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export async function GET() {
  try {
    console.log("Testing OpenAI API connection...")

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({
        status: "error",
        message: "No OpenAI API key configured",
        details: "OPENAI_API_KEY environment variable is not set",
      })
    }

    console.log("API key is present, testing connection...")

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: "Say 'Hello, API is working!' if you can respond.",
      maxTokens: 20,
    })

    console.log("OpenAI API test successful:", result.text)

    return Response.json({
      status: "success",
      message: "OpenAI API is working correctly",
      response: result.text,
      model: "gpt-4o-mini",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("OpenAI API test failed:", error)

    return Response.json({
      status: "error",
      message: "OpenAI API test failed",
      error_type: error.type || "unknown",
      error_code: error.code || "unknown",
      error_message: error.message || "Unknown error",
      details: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
