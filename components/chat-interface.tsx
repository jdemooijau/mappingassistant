"use client"

import { useChat } from "@ai-sdk/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, RefreshCw, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { LoadingDots } from "@/components/loading-dots"

interface Document {
  id: string
  name: string
  type: "source" | "target"
  file: File
  content?: string
}

interface ChatInterfaceProps {
  documents: Document[]
  initialPrompt: string
  onBack: () => void
}

export function ChatInterface({ documents, initialPrompt, onBack }: ChatInterfaceProps) {
  const [feedback, setFeedback] = useState<{ [key: string]: "up" | "down" | null }>({})

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload } = useChat({
    api: "/api/chat",
    body: {
      documents: documents.map((doc) => ({
        name: doc.name,
        type: doc.type,
        content: doc.content,
      })),
    },
    initialMessages: [
      {
        id: "1",
        role: "user",
        content: initialPrompt,
      },
    ],
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleFeedback = (messageId: string, type: "up" | "down") => {
    setFeedback((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === type ? null : type,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1a365d]">AI Analysis</h2>
          <p className="text-gray-600">Interactive chat with document analysis</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Upload
        </Button>
      </div>

      {/* Document Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Document Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <Badge
                key={doc.id}
                variant="outline"
                className={doc.type === "source" ? "border-slate-500 text-slate-700" : "border-teal-500 text-teal-700"}
              >
                {doc.type === "source" ? "📄" : "🎯"} {doc.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center text-[#1a365d]">
            <Bot className="mr-2 h-5 w-5" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user" ? "bg-[#1a365d] text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === "assistant" && <Bot className="h-5 w-5 mt-1 text-[#1a365d]" />}
                      {message.role === "user" && <User className="h-5 w-5 mt-1" />}
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap">
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case "text":
                                return <div key={`${message.id}-${i}`}>{part.text}</div>
                            }
                          })}
                        </div>

                        {message.role === "assistant" && (
                          <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-gray-200">
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(message.content)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(message.id, "up")}
                              className={feedback[message.id] === "up" ? "text-[#0f766e]" : ""}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(message.id, "down")}
                              className={feedback[message.id] === "down" ? "text-red-600" : ""}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-w-[80%]">
                    <div className="flex items-center space-x-3">
                      <Bot className="h-5 w-5 text-[#1a365d]" />
                      <LoadingDots variant="primary" />
                      <span className="text-[#1a365d] text-sm font-medium">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Form */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask a follow-up question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-[#1a365d] hover:bg-[#2d3748] disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner size="sm" variant="white" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => reload()}
                disabled={isLoading}
                className="disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner size="sm" variant="primary" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
