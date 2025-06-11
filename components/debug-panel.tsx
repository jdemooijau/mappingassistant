"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Bug, FileText } from "lucide-react"

interface DebugPanelProps {
  sourceDocuments?: any[]
  targetDocuments?: any[]
  analysisResults?: any
}

export function DebugPanel({ sourceDocuments = [], targetDocuments = [], analysisResults }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)

  if (!sourceDocuments.length && !targetDocuments.length && !analysisResults) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-orange-800">
          <div className="flex items-center">
            <Bug className="mr-2 h-5 w-5" />
            Debug Information
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-orange-800">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Document Processing Results */}
          {(sourceDocuments.length > 0 || targetDocuments.length > 0) && (
            <div>
              <h4 className="font-medium text-orange-800 mb-2">Processed Documents</h4>
              <div className="space-y-2">
                {[...sourceDocuments, ...targetDocuments].map((doc, index) => (
                  <div key={index} className="border border-orange-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">{doc.name}</span>
                        <Badge variant="outline" className="text-orange-600">
                          {doc.format}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                        className="text-orange-600"
                      >
                        {selectedDoc?.id === doc.id ? "Hide" : "Show"} Details
                      </Button>
                    </div>

                    {selectedDoc?.id === doc.id && (
                      <div className="mt-3 space-y-3 text-sm">
                        <div>
                          <strong>Structure:</strong>
                          <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
                            {JSON.stringify(doc.structure, null, 2)}
                          </pre>
                        </div>

                        <div>
                          <strong>Data Points ({doc.dataPoints.length}):</strong>
                          <div className="bg-white p-2 rounded mt-1">
                            {doc.dataPoints.map((dp: any, dpIndex: number) => (
                              <div key={dpIndex} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                                <div className="font-medium text-orange-700">{dp.field}</div>
                                <div className="text-xs text-gray-600">
                                  Type: {dp.type} | Samples: {JSON.stringify(dp.sample_values)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <strong>Raw Content Preview:</strong>
                          <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto max-h-32">
                            {doc.content}
                          </pre>
                        </div>

                        <div>
                          <strong>Metadata:</strong>
                          <pre className="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">
                            {JSON.stringify(doc.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResults && (
            <div>
              <h4 className="font-medium text-orange-800 mb-2">Analysis Results</h4>
              <div className="bg-white p-3 rounded border border-orange-200">
                <pre className="text-xs overflow-x-auto max-h-64">{JSON.stringify(analysisResults, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Console Logs Reminder */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="font-medium text-yellow-800 mb-1">Console Debugging</h4>
            <p className="text-sm text-yellow-700">
              Open your browser's Developer Tools (F12) and check the Console tab for detailed processing logs. Look for
              messages starting with "=== CSV STRUCTURE ANALYSIS ===" and "=== PROCESSING DOCUMENT ===".
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
