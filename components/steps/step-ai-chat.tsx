"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, ArrowRight, Send, MessageSquare, Bot, User, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DocumentSet {
  sourceFile: File | null
  sourceSpecs: File[]
  targetFile: File | null
  targetSpecs: File[]
}

interface MappingData {
  fieldMappings: any[]
  analysisResults: any
  chatHistory: any[]
  finalMappings: any[]
}

interface StepAiChatProps {
  documents: DocumentSet
  mappings: MappingData
  loadedConfiguration: any | null
  onComplete: (mappings: MappingData) => void
  onBack: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  mappingChanges?: any[]
}

interface ValueMapping {
  sourceValue: string
  targetValue: string
}

export function StepAiChat({ documents, mappings, loadedConfiguration, onComplete, onBack }: StepAiChatProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    mappings.chatHistory.length > 0
      ? mappings.chatHistory
      : [
          {
            id: "1",
            role: "assistant",
            content: `Hello! I've analyzed your document mappings and I'm ready to help you refine them. 

Current mappings:
${mappings.fieldMappings.map((m) => `• ${m.sourceField} → ${m.targetField}`).join("\n")}

You can ask me to:
- Modify existing mappings
- Add new field mappings
- Change transformation rules
- Explain mapping decisions
- Validate data transformations

What would you like to adjust?`,
            timestamp: new Date(),
          },
        ],
  )
  const [currentMessage, setCurrentMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentMappings, setCurrentMappings] = useState(
    mappings.fieldMappings.length > 0
      ? mappings.fieldMappings.map((m, i) => ({
          id: m.id || `mapping-${i}`,
          sourceField: m.sourceField || m.source_field || `source_${i}`,
          targetField: m.targetField || m.target_field || `target_${i}`,
          transformation: m.transformation || m.transformation_type || "Direct Copy",
          valueMappings: m.valueMappings || [],
        }))
      : [
          { id: "1", sourceField: "id", targetField: "user_id", transformation: "Direct Copy", valueMappings: [] },
          { id: "2", sourceField: "name", targetField: "full_name", transformation: "Direct Copy", valueMappings: [] },
          {
            id: "3",
            sourceField: "email",
            targetField: "email_address",
            transformation: "Direct Copy",
            valueMappings: [],
          },
          { id: "4", sourceField: "age", targetField: "years_old", transformation: "Direct Copy", valueMappings: [] },
          {
            id: "5",
            sourceField: "department",
            targetField: "dept_name",
            transformation: "Value Mapping",
            valueMappings: [
              { sourceValue: "IT", targetValue: "Information Technology" },
              { sourceValue: "HR", targetValue: "Human Resources" },
            ],
          },
        ],
  )
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Debug function to log mapping changes
  const logMappingChanges = (message: string, data: any) => {
    console.log(message, data)
    setDebugInfo((prev) => `${prev}\n${message}: ${JSON.stringify(data)}`)
  }

  useEffect(() => {
    // Scroll to bottom when new messages are added
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        } else {
          // Fallback for direct scrolling
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
      }
    }

    // Use setTimeout to ensure DOM is updated
    setTimeout(scrollToBottom, 100)
  }, [chatHistory])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        } else {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
      }
    }, 100)
  }

  // Function to parse value mappings from a message
  const parseValueMappings = (message: string): ValueMapping[] => {
    const valueMappings: ValueMapping[] = []

    // Pattern: "X = Y" or "X is Y" or "X -> Y"
    const singleMappingRegex = /(\w+|\d+)\s*(?:=|is|->)\s*(\w+)/gi
    let match

    while ((match = singleMappingRegex.exec(message)) !== null) {
      valueMappings.push({
        sourceValue: match[1].trim(),
        targetValue: match[2].trim(),
      })
    }

    // Pattern: "X = Y and Z = W" or similar with commas
    const multiMappingRegex = /(\d+|\w+)\s*(?:=|is|->)\s*(\w+)(?:\s*(?:and|,)\s*(\d+|\w+)\s*(?:=|is|->)\s*(\w+))+/gi
    match = multiMappingRegex.exec(message)

    if (match) {
      // The full pattern matched, now extract individual mappings
      const fullText = match[0]
      const parts = fullText.split(/\s*(?:and|,)\s*/i)

      parts.forEach((part) => {
        const singleMatch = part.match(/(\d+|\w+)\s*(?:=|is|->)\s*(\w+)/i)
        if (singleMatch) {
          valueMappings.push({
            sourceValue: singleMatch[1].trim(),
            targetValue: singleMatch[2].trim(),
          })
        }
      })
    }

    return valueMappings
  }

  // Function to directly update a mapping
  const updateMapping = (
    sourceField: string,
    targetField: string,
    options: {
      confidence?: number
      transformation?: string
      valueMappings?: ValueMapping[]
    } = {},
  ) => {
    const { confidence = 70, transformation, valueMappings } = options

    // Determine if this should be a value mapping based on provided value mappings
    const isValueMapping = valueMappings && valueMappings.length > 0
    const mappingType = isValueMapping ? "Value Mapping" : transformation || "Direct Copy"

    logMappingChanges(`Updating mapping: ${sourceField} → ${targetField}`, {
      sourceField,
      targetField,
      confidence,
      transformation: mappingType,
      valueMappings,
    })

    setCurrentMappings((prev) => {
      // Find if the source field already exists
      const existingIndex = prev.findIndex((m) => m.sourceField.toLowerCase() === sourceField.toLowerCase())

      if (existingIndex >= 0) {
        // Update existing mapping
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          targetField: targetField,
          confidence: confidence,
          transformation: mappingType,
          valueMappings: valueMappings || updated[existingIndex].valueMappings || [],
        }
        return updated
      } else {
        // Add new mapping
        return [
          ...prev,
          {
            id: Date.now().toString(),
            sourceField,
            targetField,
            transformation: mappingType,
            confidence,
            valueMappings: valueMappings || [],
          },
        ]
      }
    })
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentMessage,
      timestamp: new Date(),
    }

    setChatHistory((prev) => [...prev, userMessage])
    scrollToBottom()
    setCurrentMessage("")
    setIsLoading(true)

    // Check for direct mapping commands in the message
    const mapRegex = /map\s+['""]?(\w+)['""]?\s+to\s+['""]?(\w+)['""]?/i
    const mapMatch = currentMessage.match(mapRegex)

    if (mapMatch) {
      const [, sourceField, targetField] = mapMatch
      logMappingChanges("Direct mapping command detected", { sourceField, targetField })

      // Check for value mappings in the message
      const valueMappings = parseValueMappings(currentMessage)
      logMappingChanges("Parsed value mappings", valueMappings)

      // Immediately update the mapping with value mappings if present
      updateMapping(sourceField, targetField, {
        valueMappings: valueMappings.length > 0 ? valueMappings : undefined,
        transformation: valueMappings.length > 0 ? "Value Mapping" : "Direct Copy",
      })
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an AI assistant helping with data mapping. Current mappings: ${JSON.stringify(currentMappings)}. Help the user modify these mappings based on their requests.`,
            },
            ...chatHistory.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "user",
              content: currentMessage,
            },
          ],
          mappings: currentMappings,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response:", text)
        throw new Error("Server returned non-JSON response")
      }

      const data = await response.json()
      logMappingChanges("API response data", data)

      // Process mapping changes from the API response
      if (data.mappingChanges && Array.isArray(data.mappingChanges) && data.mappingChanges.length > 0) {
        logMappingChanges("Applying mapping changes from API", data.mappingChanges)
        setCurrentMappings(data.mappingChanges)
      } else if (data.action === "map" && data.sourceField && data.targetField) {
        logMappingChanges("Applying mapping from action", {
          sourceField: data.sourceField,
          targetField: data.targetField,
        })

        // Check if we have value mappings from the API
        if (data.valueMappings && data.valueMappings.length > 0) {
          updateMapping(data.sourceField, data.targetField, {
            confidence: data.confidence || 70,
            valueMappings: data.valueMappings,
            transformation: "Value Mapping",
          })
        } else {
          updateMapping(data.sourceField, data.targetField, {
            confidence: data.confidence || 70,
          })
        }
      } else if (data.action === "delete_mapping" && data.sourceField) {
        logMappingChanges("Deleting mapping", { sourceField: data.sourceField })
        setCurrentMappings((prev) => prev.filter((m) => m.sourceField.toLowerCase() !== data.sourceField.toLowerCase()))
      }

      // Add the assistant message to the chat
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "I understand your request. Let me help you with that mapping adjustment.",
        timestamp: new Date(),
        mappingChanges: data.mappingChanges,
      }

      setChatHistory((prev) => [...prev, assistantMessage])
      scrollToBottom()
    } catch (error) {
      console.error("Chat error:", error)

      // If we detected a mapping command earlier, we can still provide a response
      if (mapMatch) {
        const [, sourceField, targetField] = mapMatch
        const valueMappings = parseValueMappings(currentMessage)

        // Create a fallback response
        let responseContent = `I've updated the mapping from "${sourceField}" to "${targetField}".`

        if (valueMappings.length > 0) {
          responseContent += ` I've also set up value mappings: ${valueMappings
            .map((vm) => `${vm.sourceValue} → ${vm.targetValue}`)
            .join(", ")}. This is now a Value Mapping transformation.`
        } else {
          responseContent += ` The previous mapping for "${sourceField}" has been replaced.`
        }

        const fallbackResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        }

        setChatHistory((prev) => [...prev, fallbackResponse])
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I apologize, but I'm having trouble processing your request right now. Error: ${error.message}. Please try again or rephrase your question.`,
          timestamp: new Date(),
        }
        setChatHistory((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleContinue = () => {
    const updatedMappings: MappingData = {
      ...mappings,
      chatHistory,
      finalMappings: currentMappings,
      fieldMappings: currentMappings,
    }
    onComplete(updatedMappings)
  }

  const quickActions = [
    "Add a new field mapping",
    "Map Sex to Gender with 1 = Male and 2 = Female",
    "Explain the confidence scores",
    "Validate all current mappings",
    "Show me unmapped fields",
  ]

  // Add this useEffect after the existing useEffect
  useEffect(() => {
    logMappingChanges("Current mappings updated", currentMappings)
  }, [currentMappings])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>AI Mapping Assistant</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 pr-4 h-[calc(100%-120px)]" ref={scrollAreaRef}>
                <div className="space-y-4 pb-4" id="chat-messages-container">
                  {chatHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Actions */}
              <div className="space-y-2 flex-shrink-0">
                <p className="text-sm text-gray-500">Quick actions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMessage(action)}
                      disabled={isLoading}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="flex space-x-2 flex-shrink-0">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me to modify mappings, add new fields, or explain decisions..."
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={!currentMessage.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Mappings Panel */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Current Mappings
                <Button
                  size="sm"
                  onClick={() => {
                    const newMapping = {
                      id: Date.now().toString(),
                      sourceField: "new_field",
                      targetField: "new_target",
                      transformation: "Direct Copy",
                      confidence: 75,
                      valueMappings: [],
                    }
                    setCurrentMappings((prev) => [...prev, newMapping])
                  }}
                >
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {currentMappings.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No mappings yet</p>
                      <p className="text-xs">Use AI chat to create mappings</p>
                    </div>
                  ) : (
                    currentMappings.map((mapping, index) => (
                      <div key={mapping.id || index} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Input
                            value={mapping.sourceField || ""}
                            onChange={(e) => {
                              const updated = [...currentMappings]
                              updated[index] = { ...updated[index], sourceField: e.target.value }
                              setCurrentMappings(updated)
                            }}
                            className="text-xs h-6 bg-blue-50"
                            placeholder="Source field"
                          />
                          <ArrowRight className="h-3 w-3 text-gray-400 mx-2" />
                          <Input
                            value={mapping.targetField || ""}
                            onChange={(e) => {
                              const updated = [...currentMappings]
                              updated[index] = { ...updated[index], targetField: e.target.value }
                              setCurrentMappings(updated)
                            }}
                            className="text-xs h-6 bg-green-50"
                            placeholder="Target field"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <select
                              value={mapping.transformation || "Direct Copy"}
                              onChange={(e) => {
                                const updated = [...currentMappings]
                                updated[index] = { ...updated[index], transformation: e.target.value }
                                setCurrentMappings(updated)
                              }}
                              className="text-xs border rounded px-2 py-1 bg-white"
                            >
                              <option value="Direct Copy">Direct Copy</option>
                              <option value="Value Mapping">Value Mapping</option>
                              <option value="Data Type Conversion">Data Type Conversion</option>
                              <option value="Format Standardization">Format Standardization</option>
                              <option value="Field Combination">Field Combination</option>
                            </select>

                            {mapping.valueMappings && mapping.valueMappings.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="ml-1">
                                      <Info className="h-4 w-4 text-blue-500" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium text-xs">Value Mappings:</p>
                                    <ul className="text-xs list-disc pl-4">
                                      {mapping.valueMappings.map((vm, i) => (
                                        <li key={i}>
                                          {vm.sourceValue} → {vm.targetValue}
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updated = currentMappings.filter((_, i) => i !== index)
                                setCurrentMappings(updated)
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </div>
                        </div>

                        {/* Value Mappings Display */}
                        {mapping.transformation === "Value Mapping" && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">Value Mappings</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 text-xs"
                                onClick={() => {
                                  const updated = [...currentMappings]
                                  if (!updated[index].valueMappings) {
                                    updated[index].valueMappings = []
                                  }
                                  updated[index].valueMappings.push({
                                    sourceValue: "",
                                    targetValue: "",
                                  })
                                  setCurrentMappings(updated)
                                }}
                              >
                                + Add
                              </Button>
                            </div>

                            {!mapping.valueMappings || mapping.valueMappings.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">No value mappings defined</p>
                            ) : (
                              <div className="space-y-1">
                                {mapping.valueMappings.map((vm, vmIndex) => (
                                  <div key={vmIndex} className="flex items-center space-x-1">
                                    <Input
                                      value={vm.sourceValue}
                                      onChange={(e) => {
                                        const updated = [...currentMappings]
                                        updated[index].valueMappings[vmIndex].sourceValue = e.target.value
                                        setCurrentMappings(updated)
                                      }}
                                      className="text-xs h-5 w-1/3"
                                      placeholder="Source"
                                    />
                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                    <Input
                                      value={vm.targetValue}
                                      onChange={(e) => {
                                        const updated = [...currentMappings]
                                        updated[index].valueMappings[vmIndex].targetValue = e.target.value
                                        setCurrentMappings(updated)
                                      }}
                                      className="text-xs h-5 w-1/3"
                                      placeholder="Target"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const updated = [...currentMappings]
                                        updated[index].valueMappings = updated[index].valueMappings.filter(
                                          (_, i) => i !== vmIndex,
                                        )
                                        setCurrentMappings(updated)
                                      }}
                                      className="h-5 w-5 p-0 text-red-500"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review
        </Button>
        <Button onClick={handleContinue}>
          Continue to Conversion
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
