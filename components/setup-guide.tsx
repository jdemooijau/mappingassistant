"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  ChevronUp,
  Key,
  Settings,
  CreditCard,
  AlertTriangle,
  TestTube,
  CheckCircle,
  XCircle,
} from "lucide-react"

export function SetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)

  const testOpenAI = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/test-openai")
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        status: "error",
        message: "Failed to test API",
        error_message: error.message,
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-800">
          <div className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Setup Guide - Enable Full AI Features
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-blue-800">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <Key className="mr-2 h-4 w-4" />
              Configure OpenAI API Key
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <Badge variant="outline" className="text-blue-800 mb-2">
                  Step 1
                </Badge>
                <p className="text-blue-700">
                  Get an OpenAI API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    https://platform.openai.com/api-keys
                  </a>
                </p>
              </div>

              <div>
                <Badge variant="outline" className="text-blue-800 mb-2">
                  Step 2
                </Badge>
                <p className="text-blue-700">Add the API key to your environment variables:</p>
                <code className="block bg-white p-2 rounded mt-1 text-xs">OPENAI_API_KEY=your_api_key_here</code>
              </div>

              <div>
                <Badge variant="outline" className="text-blue-800 mb-2">
                  Step 3
                </Badge>
                <p className="text-blue-700">Restart your application to apply the changes</p>
              </div>

              <div>
                <Badge variant="outline" className="text-blue-800 mb-2">
                  Step 4
                </Badge>
                <p className="text-blue-700">Test your API connection:</p>
                <div className="mt-2">
                  <Button
                    onClick={testOpenAI}
                    disabled={isTesting}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    {isTesting ? "Testing..." : "Test OpenAI API"}
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`mt-2 p-3 rounded border ${
                      testResult.status === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      {testResult.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mr-2" />
                      )}
                      <span
                        className={`font-medium text-sm ${
                          testResult.status === "success" ? "text-green-800" : "text-red-800"
                        }`}
                      >
                        {testResult.message}
                      </span>
                    </div>
                    {testResult.response && <p className="text-xs text-green-700">Response: {testResult.response}</p>}
                    {testResult.error_message && (
                      <p className="text-xs text-red-700">Error: {testResult.error_message}</p>
                    )}
                    {testResult.error_code && <p className="text-xs text-red-600">Code: {testResult.error_code}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing & Quota Management
            </h4>
            <div className="space-y-2 text-sm">
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-blue-700 mb-2">
                  <strong>Important:</strong> OpenAI API usage requires billing setup and has usage quotas.
                </p>
                <ul className="text-blue-600 space-y-1 text-xs">
                  <li>
                    • Check your usage at{" "}
                    <a
                      href="https://platform.openai.com/account/usage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      platform.openai.com/account/usage
                    </a>
                  </li>
                  <li>
                    • Manage billing at{" "}
                    <a
                      href="https://platform.openai.com/account/billing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      platform.openai.com/account/billing
                    </a>
                  </li>
                  <li>• We use GPT-4o-mini to minimize costs</li>
                  <li>• Document analysis works without AI</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="font-medium text-yellow-800 mb-1 flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Still Getting Quota Errors?
            </h4>
            <p className="text-sm text-yellow-700 mb-2">If you've added credits but still see quota errors:</p>
            <ul className="text-xs text-yellow-600 space-y-1">
              <li>• Wait 2-5 minutes for billing updates to propagate</li>
              <li>• Refresh this page completely (Ctrl+F5 or Cmd+Shift+R)</li>
              <li>• Check that your payment method was charged successfully</li>
              <li>• Verify your API key has the correct permissions</li>
              <li>• Try the "Test OpenAI API" button above</li>
            </ul>
          </div>

          <div className="bg-white p-3 rounded border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-1">What you'll get with full AI:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Interactive AI chat about your documents</li>
              <li>• Intelligent field mapping suggestions</li>
              <li>• Advanced data quality analysis</li>
              <li>• Custom transformation recommendations</li>
              <li>• Real-time answers to your questions</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
