"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Zap, CheckCircle, XCircle, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"
import { useMappingStore } from "@/lib/mapping-store"
import { MappingCommandParser } from "@/lib/mapping-commands"

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  mappingChanges?: any[]
  isProcessing?: boolean
}

interface DynamicMappingChatProps {
  sourceFields: string[]
  targetFields: string[]
  currentMappings: any[]
  onMappingUpdate: (mappings: any[]) => void
  sourceFileName?: string
  targetFileName?: string
}

export function DynamicMappingChat({
  sourceFields,
  targetFields,
  currentMappings,
  onMappingUpdate,
  sourceFileName,
  targetFileName,
}: DynamicMappingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to AI-Powered Dynamic Mapping! 🎯

I can see your current field mappings and I'm ready to help you refine them. Here's what I can do:

**Current Status:**
• Source: ${sourceFileName || "Source file"} (${sourceFields.length} fields)
• Target: ${targetFileName || "Target file"} (${targetFields.length} fields)  
• Active Mappings: ${currentMappings.length}

**Commands I understand:**
• "Map customer_id to user_id" - Create new mapping
• "Delete mapping for old_field" - Remove mapping
• "Change transformation for price to data_type_conversion" - Modify transformation
• "Show me all current mappings" - Display current state
• "Map all customer fields to user fields" - Bulk operations

Try giving me a command and watch the mappings update in real-time!`,
      timestamp: new Date(),
    },
  ])

  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { mappings, updateMapping, addMapping, removeMapping } = useMappingStore()

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  useEffect(() => {
    // Update parent when mappings change
    const activeMappings = mappings.filter((m) => m.status === "active")
    onMappingUpdate(activeMappings)
  }, [mappings, onMappingUpdate])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsProcessing(true)

    // Add processing indicator
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      role: "assistant",
      content: "Processing your mapping instruction...",
      timestamp: new Date(),
      isProcessing: true,
    }

    setMessages((prev) => [...prev, processingMessage])

    try {
      // Parse the command
      const parseResult = MappingCommandParser.parseCommand(userMessage.content, {
        source: sourceFields,
        target: targetFields,
      })

      // Remove processing message
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id))

      if (parseResult.command && parseResult.confidence > 0.6) {
        const { command } = parseResult
        const appliedChanges: any[] = []
        let responseMessage = ""

        switch (command.type) {
          case "create":
            if (command.sourceField && command.targetField) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                updateMapping(existingMapping.id, {
                  target_field: command.targetField,
                  user_command: userMessage.content,
                  reasoning: `Updated via AI command: "${userMessage.content}"`,
                })
                appliedChanges.push({
                  type: "updated",
                  sourceField: command.sourceField,
                  targetField: command.targetField,
                  details: `Updated mapping from ${existingMapping.target_field} to ${command.targetField}`,
                })
                responseMessage = `✅ Updated mapping: ${command.sourceField} → ${command.targetField}`
              } else {
                const newMappingId = addMapping({
                  source_field: command.sourceField,
                  target_field: command.targetField,
                  transformation_type: "direct_mapping",
                  confidence: 0.85,
                  reasoning: `AI-created mapping via command: "${userMessage.content}"`,
                  transformation_logic: `${command.sourceField} -> ${command.targetField}`,
                  potential_issues: [],
                  status: "active",
                  user_modified: true,
                  user_command: userMessage.content,
                })
                appliedChanges.push({
                  type: "created",
                  sourceField: command.sourceField,
                  targetField: command.targetField,
                  details: "Created new mapping",
                })
                responseMessage = `✅ Created mapping: ${command.sourceField} → ${command.targetField}`
              }
            }
            break

          case "delete":
            if (command.sourceField) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                removeMapping(existingMapping.id)
                appliedChanges.push({
                  type: "deleted",
                  sourceField: command.sourceField,
                  targetField: existingMapping.target_field,
                  details: "Deleted mapping",
                })
                responseMessage = `✅ Deleted mapping for: ${command.sourceField}`
              } else {
                responseMessage = `❌ No mapping found for "${command.sourceField}"`
              }
            }
            break

          case "modify_transformation":
            if (command.sourceField && command.transformationType) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                updateMapping(existingMapping.id, {
                  transformation_type: command.transformationType as any,
                  user_command: userMessage.content,
                  reasoning: `Transformation updated via AI: "${userMessage.content}"`,
                })
                appliedChanges.push({
                  type: "modified",
                  sourceField: command.sourceField,
                  targetField: existingMapping.target_field,
                  details: `Changed transformation to ${command.transformationType}`,
                })
                responseMessage = `✅ Updated transformation for ${command.sourceField} to ${command.transformationType}`
              } else {
                responseMessage = `❌ No mapping found for "${command.sourceField}"`
              }
            }
            break

          default:
            responseMessage = "I understand you want to work with mappings, but I need more specific instructions."
        }

        // Handle special queries
        if (
          userMessage.content.toLowerCase().includes("show") &&
          userMessage.content.toLowerCase().includes("mapping")
        ) {
          const activeMappings = mappings.filter((m) => m.status === "active")
          responseMessage = `📋 **Current Mappings (${activeMappings.length}):**\n\n${
            activeMappings.length > 0
              ? activeMappings
                  .map((m) => `• ${m.source_field} → ${m.target_field} (${m.transformation_type})`)
                  .join("\n")
              : "No active mappings found."
          }\n\nYou can modify these by saying things like "Map field X to field Y" or "Delete mapping for field X".`
        }

        const responseMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseMessage,
          timestamp: new Date(),
          mappingChanges: appliedChanges,
        }

        setMessages((prev) => [...prev, responseMsg])

        // Add suggestions if there were ambiguities
        if (parseResult.ambiguities && parseResult.ambiguities.length > 0) {
          setTimeout(() => {
            const suggestionMsg: ChatMessage = {
              id: `suggestion-${Date.now()}`,
              role: "system",
              content: `💡 **Suggestions:**\n${parseResult.suggestions?.join("\n") || "Try being more specific with field names."}`,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, suggestionMsg])
          }, 500)
        }
      } else {
        // Command not recognized
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `❌ I couldn't understand that command. Here are some examples:\n\n• "Map customer_id to user_id"\n• "Delete mapping for old_field"\n• "Show me all current mappings"\n• "Change transformation for price to data_type_conversion"`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    } catch (error) {
      // Remove processing message and show error
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id))

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `❌ Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const renderMappingChanges = (changes: any[]) => {
    if (changes.length === 0) return null

    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
          <Zap className="mr-1 h-4 w-4" />
          Applied Changes ({changes.length})
        </h4>
        <div className="space-y-2">
          {changes.map((change, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              {change.type === "created" && <CheckCircle className="h-4 w-4 text-green-600" />}
              {change.type === "updated" && <RefreshCw className="h-4 w-4 text-blue-600" />}
              {change.type === "deleted" && <XCircle className="h-4 w-4 text-red-600" />}
              {change.type === "modified" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}

              <Badge variant="outline" className="text-xs">
                {change.sourceField}
              </Badge>

              {change.targetField && (
                <>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs">
                    {change.targetField}
                  </Badge>
                </>
              )}

              <span className="text-gray-600">({change.details})</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getMessageIcon = (role: string) => {
    if (role === "user") return <User className="h-4 w-4" />
    if (role === "system") return <AlertTriangle className="h-4 w-4 text-blue-600" />
    return <Bot className="h-4 w-4" />
  }

  const getMessageStyle = (role: string) => {
    if (role === "user") return "bg-[#1a365d] text-white"
    if (role === "system") return "bg-blue-50 text-blue-800 border border-blue-200"
    return "bg-gray-100 text-gray-900"
  }

  return (
    <div className="space-y-4">
      {/* Current Mappings Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[#1a365d]">Live Mapping Status</h4>
              <p className="text-sm text-gray-600">
                {mappings.filter((m) => m.status === "active").length} active mappings • Updates in real-time
              </p>
            </div>
            <Badge variant="outline" className="text-[#1a365d]">
              {sourceFields.length} → {targetFields.length} fields
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center text-[#1a365d]">
            <Zap className="mr-2 h-5 w-5" />
            AI Mapping Assistant
            <Badge variant="secondary" className="ml-2">
              Real-time Updates
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg p-4 ${getMessageStyle(message.role)}`}>
                    <div className="flex items-start space-x-2">
                      {getMessageIcon(message.role)}
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap">{message.content}</div>

                        {message.isProcessing && (
                          <div className="flex items-center space-x-2 mt-2">
                            <LoadingDots variant="primary" />
                            <span className="text-sm">Analyzing instruction...</span>
                          </div>
                        )}

                        {message.mappingChanges && renderMappingChanges(message.mappingChanges)}

                        <div className="text-xs opacity-75 mt-2">{message.timestamp.toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Give me mapping instructions... (e.g., 'Map customer_id to user_id')"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="bg-[#1a365d] hover:bg-[#2d3748]"
              >
                {isProcessing ? <LoadingDots variant="white" size="sm" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Available fields: {sourceFields.length} source, {targetFields.length} target • Mappings update instantly
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Show me all current mappings")}
              disabled={isProcessing}
            >
              Show Mappings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Map all similar fields automatically")}
              disabled={isProcessing}
            >
              Auto Map Similar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Delete all mappings")}
              disabled={isProcessing}
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Validate all mappings for conflicts")}
              disabled={isProcessing}
            >
              Check Conflicts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
