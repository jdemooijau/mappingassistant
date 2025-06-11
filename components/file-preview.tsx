"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"

interface FilePreviewProps {
  file: File
}

export function FilePreview({ file }: FilePreviewProps) {
  const [content, setContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const loadContent = async () => {
    if (content) {
      setIsVisible(!isVisible)
      return
    }

    setIsLoading(true)
    try {
      const text = await file.text()
      setContent(text)
      setIsVisible(true)
    } catch (error) {
      console.error("Error reading file:", error)
      setContent("Error reading file content")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" onClick={loadContent} disabled={isLoading} className="text-xs">
        {isLoading ? (
          "Loading..."
        ) : isVisible ? (
          <>
            <EyeOff className="h-3 w-3 mr-1" />
            Hide Content
          </>
        ) : (
          <>
            <Eye className="h-3 w-3 mr-1" />
            Preview Content
          </>
        )}
      </Button>

      {isVisible && content && (
        <Card className="mt-2">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">File Content Preview</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <pre className="text-xs bg-gray-50 p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap">
              {content.substring(0, 1000)}
              {content.length > 1000 && "\n... (truncated)"}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
