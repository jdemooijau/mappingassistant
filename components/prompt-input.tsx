"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquare, Send } from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"

interface PromptInputProps {
  onPromptSubmit: (prompt: string) => void
  isLoading?: boolean
}

export function PromptInput({ onPromptSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      onPromptSubmit(prompt.trim())
    }
  }

  const suggestedPrompts = [
    "Compare the source and target documents and identify key differences",
    "Analyze the content structure and provide recommendations",
    "Extract key insights from the uploaded documents",
    "Summarize the main points from all documents",
    "Identify potential improvements based on the document analysis",
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1a365d] mb-2">Enter Your Prompt</h2>
        <p className="text-gray-600">Describe what you'd like the AI to analyze or help you with</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-[#1a365d]">
            <MessageSquare className="mr-2 h-5 w-5" />
            Your Analysis Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="min-h-[120px] mt-2"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="w-full bg-[#1a365d] hover:bg-[#2d3748] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" variant="white" className="mr-2" />
                  Processing...
                </div>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Prompt
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Suggested Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Suggested Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suggestedPrompts.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full text-left justify-start h-auto p-3"
                onClick={() => setPrompt(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
