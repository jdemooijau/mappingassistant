"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Zap, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"
import { useMappingStore } from "@/lib/mapping-store"
import { AIMappingProcessor, type AIProcessingResult, type MappingChange } from "@/lib/ai-mapping-processor"

interface EnhancedChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  mappingChanges?: MappingChange[]
  processingResult?: AIProcessingResult
  isProcessing?: boolean
}

interface EnhancedChatInterfaceProps {
  sourceFields: string[]
  targetFields: string[]
  documents: any[]
  onMappingUpdate?: (changes: MappingChange[]) => void
}

export function EnhancedChatInterface({
  sourceFields,
  targetFields,
  documents,
  onMappingUpdate,
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I'm ready to help you create and modify field mappings! You can give me instructions like:\n\n• 'Map customer_id to user_id'\n• 'Delete mapping for old_field'\n• 'Map all customer fields to user fields'\n• 'Change transformation for price to data_type_conversion'\n\nI'll apply changes automatically and show you what I've done.",
      timestamp: new Date(),
    },
  ])

  const [inputValue, setInputValue] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [continuousMode, setContinuousMode] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { mappings } = useMappingStore()
  const aiProcessor = AIMappingProcessor.getInstance()

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage: EnhancedChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsProcessing(true)

    // Add processing indicator
    const processingMessage: EnhancedChatMessage = {
      id: `processing-${Date.now()}`,
      role: "assistant",
      content: "Processing your mapping instruction...",
      timestamp: new Date(),
      isProcessing: true,
    }

    setMessages((prev) => [...prev, processingMessage])

    try {
      // Process the instruction with AI
      const result = await aiProcessor.processUserInstruction(userMessage.content, {
        sourceFields,
        targetFields,
        currentMappings: mappings,
        conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
      })

      // Remove processing message and add result
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id))

      const responseMessage: EnhancedChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
        mappingChanges: result.appliedChanges,
        processingResult: result,
      }

      setMessages((prev) => [...prev, responseMessage])

      // Notify parent of mapping changes
      if (result.appliedChanges.length > 0 && onMappingUpdate) {
        onMappingUpdate(result.appliedChanges)
      }

      // Handle clarification questions
      if (result.needsClarification && result.clarificationQuestion) {
        setTimeout(() => {
          const clarificationMessage: EnhancedChatMessage = {
            id: `clarification-${Date.now()}`,
            role: "assistant",
            content: result.clarificationQuestion!,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, clarificationMessage])
        }, 500)
      }

      // Show suggestions if available
      if (result.suggestions && result.suggestions.length > 0) {
        setTimeout(() => {
          const suggestionMessage: EnhancedChatMessage = {
            id: `suggestions-${Date.now()}`,
            role: "system",
            content: `💡 Suggestions:\n${result.suggestions!.join("\n")}`,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, suggestionMessage])
        }, 1000)
      }

      // In continuous mode, prompt for next instruction
      if (continuousMode && result.success) {
        setTimeout(() => {
          const promptMessage: EnhancedChatMessage = {
            id: `prompt-${Date.now()}`,
            role: "assistant",
            content: "What would you like to do next? I'm ready for more mapping instructions!",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, promptMessage])
        }, 1500)
      }
    } catch (error) {
      // Remove processing message and show error
      setMessages((prev) => prev.filter((m) => m.id !== processingMessage.id))

      const errorMessage: EnhancedChatMessage = {
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

  const renderMappingChanges = (changes: MappingChange[]) => {
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
                  <span>→</span>
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

  const getMessageIcon = (role: string, processingResult?: AIProcessingResult) => {
    if (role === "user") return <User className="h-4 w-4" />
    if (role === "system") return <AlertTriangle className="h-4 w-4 text-blue-600" />

    if (processingResult) {
      if (processingResult.success) return <CheckCircle className="h-4 w-4 text-green-600" />
      if (processingResult.needsClarification) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      return <XCircle className="h-4 w-4 text-red-600" />
    }

    return <Bot className="h-4 w-4" />
  }

  const getMessageStyle = (role: string, processingResult?: AIProcessingResult) => {
    if (role === "user") return "bg-[#1a365d] text-white"
    if (role === "system") return "bg-blue-50 text-blue-800 border border-blue-200"

    if (processingResult?.success) return "bg-green-50 text-green-800 border border-green-200"
    if (processingResult?.needsClarification) return "bg-yellow-50 text-yellow-800 border border-yellow-200"
    if (processingResult && !processingResult.success) return "bg-red-50 text-red-800 border border-red-200"

    return "bg-gray-100 text-gray-900"
  }

  return (
    <div className="space-y-4">
      {/* Continuous Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[#1a365d]">Continuous Mapping Mode</h4>
              <p className="text-sm text-gray-600">AI will keep prompting for more instructions after each change</p>
            </div>
            <Button
              variant={continuousMode ? "default" : "outline"}
              size="sm"
              onClick={() => setContinuousMode(!continuousMode)}
              className={continuousMode ? "bg-[#1a365d] hover:bg-[#2d3748]" : ""}
            >
              {continuousMode ? "Enabled" : "Disabled"}
            </Button>
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
              {mappings.filter((m) => m.status === "active").length} Active Mappings
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${getMessageStyle(message.role, message.processingResult)}`}
                  >
                    <div className="flex items-start space-x-2">
                      {getMessageIcon(message.role, message.processingResult)}
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
              Available fields: {sourceFields.length} source, {targetFields.length} target
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
              onClick={() => setInputValue("Map all similar fields automatically")}
              disabled={isProcessing}
            >
              Auto Map Similar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Show me all current mappings")}
              disabled={isProcessing}
            >
              List Mappings
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
