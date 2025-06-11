"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export function ApiStatusNotice() {
  const [apiStatus, setApiStatus] = useState<"checking" | "healthy" | "error" | "no-key">("checking")
  const [isChecking, setIsChecking] = useState(false)

  const checkApiStatus = async () => {
    setIsChecking(true)
    try {
      const response = await fetch("/api/test-openai")
      const result = await response.json()

      if (result.status === "success") {
        setApiStatus("healthy")
      } else if (result.message?.includes("No OpenAI API key")) {
        setApiStatus("no-key")
      } else {
        setApiStatus("error")
      }
    } catch (error) {
      setApiStatus("error")
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkApiStatus()
  }, [])

  const getStatusConfig = () => {
    switch (apiStatus) {
      case "healthy":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          badge: "AI Ready",
          badgeClass: "bg-green-100 text-green-800",
          message: "OpenAI API is connected and ready for intelligent analysis.",
          cardClass: "border-green-200 bg-green-50",
        }
      case "no-key":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          badge: "Demo Mode",
          badgeClass: "bg-yellow-100 text-yellow-800",
          message:
            "Running in demo mode. Document analysis works, but AI features are limited. Configure OPENAI_API_KEY for full functionality.",
          cardClass: "border-yellow-200 bg-yellow-50",
        }
      case "error":
        return {
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          badge: "AI Unavailable",
          badgeClass: "bg-red-100 text-red-800",
          message:
            "AI services are currently unavailable. Document processing will work, but AI features are disabled.",
          cardClass: "border-red-200 bg-red-50",
        }
      default:
        return {
          icon: <RefreshCw className="h-4 w-4 text-gray-600 animate-spin" />,
          badge: "Checking...",
          badgeClass: "bg-gray-100 text-gray-800",
          message: "Checking AI service status...",
          cardClass: "border-gray-200 bg-gray-50",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Card className={`mb-6 ${config.cardClass}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {config.icon}
            <div>
              <Badge className={config.badgeClass}>{config.badge}</Badge>
              <p className="text-sm mt-1">{config.message}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={checkApiStatus} disabled={isChecking}>
            <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
