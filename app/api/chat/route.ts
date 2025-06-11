import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, mappings, stream = false } = body

    console.log("Chat API called with:", { messagesCount: messages.length, mappingsCount: mappings?.length })

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key is not configured, using intelligent mock responses")
      const lastUserMessage = messages[messages.length - 1]?.content || ""
      const mockResponse = generateIntelligentMockResponse(lastUserMessage, mappings)

      return new Response(
        JSON.stringify({
          content: mockResponse.content,
          role: "assistant",
          status: "mock_response",
          mappingChanges: mockResponse.mappingChanges,
          newMapping: mockResponse.newMapping,
          action: mockResponse.action,
          sourceField: mockResponse.sourceField,
          targetField: mockResponse.targetField,
          valueMappings: mockResponse.valueMappings,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Prepare system prompt for mapping assistance
    const systemPrompt = `You are an AI assistant specialized in data field mapping. You help users create, modify, and manage field mappings between source and target data structures.

Current mappings: ${JSON.stringify(mappings)}

When users ask you to:
1. "Map [source] to [target]" - Create or update a mapping
2. "Add mapping for [field]" - Create a new mapping
3. "Delete mapping for [field]" - Remove a mapping
4. "Change transformation for [field]" - Modify transformation type

Respond with helpful explanations and include mapping changes in your response.`

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        messages: messages.filter((msg) => msg.role !== "system"),
      })

      // Parse the response for mapping commands
      const mappingChanges = parseMappingCommands(result.text, mappings)

      return new Response(
        JSON.stringify({
          content: result.text,
          role: "assistant",
          status: "success",
          mappingChanges: mappingChanges.updatedMappings,
          newMapping: mappingChanges.newMapping,
          action: mappingChanges.action,
          sourceField: mappingChanges.sourceField,
          targetField: mappingChanges.targetField,
          valueMappings: mappingChanges.valueMappings,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (openaiError) {
      console.error("OpenAI API Error:", openaiError)

      // Fallback to intelligent mock response
      const lastUserMessage = messages[messages.length - 1]?.content || ""
      const mockResponse = generateIntelligentMockResponse(lastUserMessage, mappings)

      return new Response(
        JSON.stringify({
          content: mockResponse.content,
          role: "assistant",
          status: "api_fallback",
          mappingChanges: mockResponse.mappingChanges,
          newMapping: mockResponse.newMapping,
          action: mockResponse.action,
          sourceField: mockResponse.sourceField,
          targetField: mockResponse.targetField,
          valueMappings: mockResponse.valueMappings,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Chat API Error:", error)
    return new Response(
      JSON.stringify({
        content: "I'm experiencing technical difficulties. Please try again.",
        role: "assistant",
        status: "error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

function parseValueMappings(message) {
  const valueMappings = []

  // Pattern: "X = Y" or "X is Y" or "X -> Y"
  const singleMappingRegex = /(\w+|\d+)\s*(?:=|is|->)\s*(\w+)/gi
  let match

  while ((match = singleMappingRegex.exec(message)) !== null) {
    valueMappings.push({
      sourceValue: match[1].trim(),
      targetValue: match[2].trim(),
    })
  }

  return valueMappings
}

function generateIntelligentMockResponse(userMessage: string, currentMappings: any[]) {
  const lowerMessage = userMessage.toLowerCase()
  console.log("Processing user message:", userMessage)
  console.log("Current mappings before processing:", currentMappings)

  // Parse mapping commands with more flexible regex
  if (lowerMessage.includes("map") && lowerMessage.includes("to")) {
    // More flexible regex to catch various formats
    const mapMatch =
      userMessage.match(/map\s+['""]?(\w+)['""]?\s+to\s+['""]?(\w+)['""]?/i) ||
      userMessage.match(/(\w+)\s+to\s+(\w+)/i) ||
      userMessage.match(/map\s+(\w+)\s*→\s*(\w+)/i)

    if (mapMatch) {
      const [, sourceField, targetField] = mapMatch
      console.log(`Parsed mapping: ${sourceField} → ${targetField}`)

      // Check for value mappings
      const valueMappings = parseValueMappings(userMessage)
      const isValueMapping = valueMappings.length > 0

      // Create updated mappings array
      const updatedMappings = currentMappings.map((mapping) => {
        if (mapping.sourceField.toLowerCase() === sourceField.toLowerCase()) {
          console.log(`Updating existing mapping: ${mapping.sourceField} from ${mapping.targetField} to ${targetField}`)
          return {
            ...mapping,
            targetField: targetField,
            confidence: 70,
            transformation: isValueMapping ? "Value Mapping" : "Direct Copy",
            valueMappings: isValueMapping ? valueMappings : mapping.valueMappings || [],
          }
        }
        return mapping
      })

      // Check if we found an existing mapping to update
      const foundExisting = updatedMappings.some(
        (mapping) =>
          mapping.sourceField.toLowerCase() === sourceField.toLowerCase() &&
          mapping.targetField.toLowerCase() === targetField.toLowerCase(),
      )

      // If no existing mapping was found, add a new one
      if (!foundExisting) {
        console.log(`Adding new mapping: ${sourceField} → ${targetField}`)
        updatedMappings.push({
          id: Date.now().toString(),
          sourceField: sourceField,
          targetField: targetField,
          transformation: isValueMapping ? "Value Mapping" : "Direct Copy",
          confidence: 70,
          valueMappings: isValueMapping ? valueMappings : [],
        })
      }

      console.log("Updated mappings:", updatedMappings)

      // Generate response content that matches what we see in the chat
      let responseContent = `- **${sourceField} → ${targetField}** (new mapping)\n\nThe previous mapping for "${sourceField}" will be removed.\n\nUpdated mappings:`

      // Add all mappings to the response
      updatedMappings.forEach((m, index) => {
        const isUpdated = m.sourceField.toLowerCase() === sourceField.toLowerCase()
        const prefix = isUpdated ? `**${m.sourceField} → ${m.targetField}**` : `${m.sourceField} → ${m.targetField}`
        responseContent += `\n- ${prefix}`

        // Add (new mapping) tag if this is the updated mapping
        if (isUpdated) {
          responseContent += ` (new mapping)`
        }
      })

      // Add value mapping details if present
      if (isValueMapping) {
        responseContent += `\n\nI've set up value mappings for "${sourceField}":`
        valueMappings.forEach((vm) => {
          responseContent += `\n- ${vm.sourceValue} → ${vm.targetValue}`
        })
        responseContent += `\n\nThis is now a Value Mapping transformation instead of Direct Copy.`
      }

      responseContent += `\n\nIf you need any further changes or additions, just let me know!`

      return {
        content: responseContent,
        mappingChanges: updatedMappings,
        action: "map",
        sourceField,
        targetField,
        valueMappings: isValueMapping ? valueMappings : undefined,
      }
    }
  }

  if (lowerMessage.includes("add") && lowerMessage.includes("mapping")) {
    return {
      content: `I can help you add a new mapping. Please specify the source and target fields like: "Map customer_id to user_id"`,
      action: "request_clarification",
    }
  }

  if (lowerMessage.includes("delete") || lowerMessage.includes("remove")) {
    const fieldMatch = userMessage.match(/(?:delete|remove).*?(\w+)/i)
    if (fieldMatch && currentMappings.length > 0) {
      const fieldToRemove = fieldMatch[1]
      const updatedMappings = currentMappings.filter(
        (m) => !m.sourceField.toLowerCase().includes(fieldToRemove.toLowerCase()),
      )

      return {
        content: `✅ I've removed the mapping for "${fieldToRemove}". The mapping has been deleted from your current mappings.`,
        mappingChanges: updatedMappings,
        action: "delete_mapping",
        sourceField: fieldToRemove,
      }
    }
  }

  if (lowerMessage.includes("change") && lowerMessage.includes("transformation")) {
    const fieldMatch = userMessage.match(/transformation.*?for\s+(\w+)/i)
    if (fieldMatch && currentMappings.length > 0) {
      const fieldName = fieldMatch[1]
      const updatedMappings = currentMappings.map((m) => {
        if (m.sourceField.toLowerCase().includes(fieldName.toLowerCase())) {
          return { ...m, transformation: "Value Mapping", confidence: 90 }
        }
        return m
      })

      return {
        content: `✅ I've updated the transformation for "${fieldName}" to Value Mapping with increased confidence to 90%.`,
        mappingChanges: updatedMappings,
        action: "update_transformation",
        sourceField: fieldName,
      }
    }
  }

  if (lowerMessage.includes("explain")) {
    return {
      content: `The confidence scores indicate how certain the AI is about each mapping:
      
• **90-100%**: High confidence - Direct field matches or obvious mappings
• **70-89%**: Medium confidence - Good matches with minor differences  
• **Below 70%**: Low confidence - Requires manual review`,
      action: "explain_confidence",
    }
  }

  // Default response
  return {
    content: `I can help you with field mappings. Try commands like:
• "Map customer_id to user_id"
• "Map Sex to Gender with 1 = Male and 2 = Female"  
• "Delete mapping for old_field"
• "Change transformation for name field"
• "Explain the confidence scores"

What would you like to do with your mappings?`,
    action: "show_help",
  }
}

function parseMappingCommands(aiResponse: string, currentMappings: any[]) {
  // This would contain more sophisticated parsing logic
  // For now, return the current mappings unchanged
  return {
    updatedMappings: null,
    newMapping: null,
    action: null,
  }
}
