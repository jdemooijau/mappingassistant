"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, TrendingUp, FileText } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"

interface StepMappingProps {
  sourceFiles: File[]
  sourceSpecifications?: File[]
  onComplete: (data: { analysisResults: any }) => void
  onBack: () => void
}

export function StepMapping({ sourceFiles, sourceSpecifications, onComplete, onBack }: StepMappingProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedMapping, setSelectedMapping] = useState<number | null>(null)

  useEffect(() => {
    // Auto-start analysis when component mounts
    startAnalysis()
  }, [])

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setError(null)

    try {
      console.log("Starting document analysis...")
      setAnalysisProgress(10)

      const formData = new FormData()

      // Add source files
      sourceFiles.forEach((file) => {
        formData.append("sourceFiles", file)
      })

      // Add specification files if any
      if (sourceSpecifications) {
        sourceSpecifications.forEach((file) => {
          formData.append("targetFiles", file)
        })
      }

      formData.append("prompt", "Analyze these documents and create comprehensive field mappings")

      setAnalysisProgress(30)

      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        body: formData,
      })

      setAnalysisProgress(70)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Analysis failed")
      }

      const result = await response.json()
      setAnalysisProgress(100)

      if (result.success) {
        setAnalysisResults(result)
        console.log("Analysis completed successfully:", result)
      } else {
        throw new Error(result.error || "Analysis failed")
      }
    } catch (error) {
      console.error("Analysis error:", error)
      setError(error.message || "Failed to analyze documents")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleContinue = () => {
    if (analysisResults) {
      onComplete({ analysisResults })
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 2: AI Mapping Analysis</h2>
        <p className="text-gray-600 text-lg">
          AI is analyzing your documents and generating intelligent field mappings
        </p>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <LoadingDots variant="primary" />
                <span className="text-[#1a365d] font-medium">Analyzing documents...</span>
              </div>
              <Progress value={analysisProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {analysisProgress < 30 && "Processing uploaded files..."}
                {analysisProgress >= 30 && analysisProgress < 70 && "Analyzing document structure and content..."}
                {analysisProgress >= 70 && "Generating field mappings and recommendations..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
            <div className="mt-2">
              <Button onClick={startAnalysis} size="sm" variant="outline">
                Retry Analysis
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysisResults && !isAnalyzing && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-[#1a365d]" />
                  <div>
                    <p className="text-sm text-gray-600">Documents</p>
                    <p className="text-lg font-bold text-[#1a365d]">
                      {(analysisResults.sourceDocuments?.length || 0) + (analysisResults.targetDocuments?.length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5 text-[#0f766e]" />
                  <div>
                    <p className="text-sm text-gray-600">Mappings</p>
                    <p className="text-lg font-bold text-[#0f766e]">
                      {analysisResults.analysis?.field_mappings?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Issues</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {analysisResults.analysis?.data_quality_issues?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-[#1a365d]" />
                  <div>
                    <p className="text-sm text-gray-600">Compatibility</p>
                    <p className="text-lg font-bold text-[#1a365d]">
                      {Math.round((analysisResults.analysis?.document_summary?.compatibility_score || 0) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Field Mappings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1a365d]">Generated Field Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResults.analysis?.field_mappings?.map((mapping: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMapping === index
                        ? "border-[#1a365d] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedMapping(selectedMapping === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-[#1a365d]">
                          {mapping.source_field}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline" className="text-[#0f766e]">
                          {mapping.target_field}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{mapping.transformation_type?.replace("_", " ")}</Badge>
                        <span className={`text-sm font-medium ${getConfidenceColor(mapping.confidence)}`}>
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {selectedMapping === index && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <h4 className="font-medium text-[#1a365d] mb-1">Reasoning</h4>
                          <p className="text-sm text-gray-600">{mapping.reasoning}</p>
                        </div>

                        <div>
                          <h4 className="font-medium text-[#1a365d] mb-1">Transformation Logic</h4>
                          <code className="text-sm bg-gray-100 p-2 rounded block">{mapping.transformation_logic}</code>
                        </div>

                        {mapping.potential_issues?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-yellow-600 mb-1">Potential Issues</h4>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {mapping.potential_issues.map((issue: string, i: number) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )) || <p className="text-gray-500 text-center py-4">No field mappings generated</p>}
              </div>
            </CardContent>
          </Card>

          {/* Data Quality Issues */}
          {analysisResults.analysis?.data_quality_issues?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[#1a365d]">Data Quality Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResults.analysis.data_quality_issues.map((issue: any, index: number) => (
                    <div key={index} className={`p-4 border rounded-lg ${getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-[#1a365d]">
                              {issue.field}
                            </Badge>
                            <Badge variant="secondary">{issue.issue_type?.replace("_", " ")}</Badge>
                            <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                          </div>
                          <p className="text-sm mb-2">{issue.description}</p>
                          <p className="text-sm font-medium">Suggested Fix: {issue.suggested_fix}</p>
                          <p className="text-xs text-gray-500 mt-1">Affects {issue.affected_records} records</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Analysis Complete!</p>
                  <p className="text-sm text-green-700">
                    Your documents have been analyzed and initial mappings have been generated. You can now proceed to
                    the AI chat step to refine and customize these mappings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Upload
        </Button>

        {analysisResults && !isAnalyzing && (
          <Button onClick={handleContinue} className="bg-[#1a365d] hover:bg-[#2d3748] flex items-center">
            Continue to AI Chat
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
