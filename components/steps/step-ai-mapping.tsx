"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Brain, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Loader2, FileText, Target } from "lucide-react"

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

interface StepAiMappingProps {
  documents: DocumentSet
  onComplete: (mappings: MappingData) => void
  onBack: () => void
}

export function StepAiMapping({ documents, onComplete, onBack }: StepAiMappingProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<any>(null)

  const analyzeDocuments = async () => {
    setIsAnalyzing(true)
    setError(null)
    setProgress(0)
    setAnalysisResults(null)

    try {
      // Step 1: Prepare files
      setCurrentTask("Preparing documents for analysis...")
      setProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 800))

      const formData = new FormData()

      if (documents.sourceFile) {
        formData.append("sourceFile", documents.sourceFile)
        console.log("Added source file:", documents.sourceFile.name)
      }
      if (documents.targetFile) {
        formData.append("targetFile", documents.targetFile)
        console.log("Added target file:", documents.targetFile.name)
      }

      documents.sourceSpecs.forEach((file, index) => {
        formData.append(`sourceSpec${index}`, file)
        console.log("Added source spec:", file.name)
      })

      documents.targetSpecs.forEach((file, index) => {
        formData.append(`targetSpec${index}`, file)
        console.log("Added target spec:", file.name)
      })

      // Step 2: Upload and analyze
      setCurrentTask("Uploading files to AI analysis service...")
      setProgress(30)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("Sending request to /api/analyze-documents...")

      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        body: formData,
      })

      console.log("Response received:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`)
      }

      setCurrentTask("AI is analyzing document structures...")
      setProgress(60)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const results = await response.json()
      console.log("Analysis results received:", results)

      if (!results.success) {
        throw new Error(results.error || "Analysis failed")
      }

      // Step 3: Process results
      setCurrentTask("Processing analysis results...")
      setProgress(80)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setCurrentTask("Generating field mappings...")
      setProgress(95)
      await new Promise((resolve) => setTimeout(resolve, 500))

      setProgress(100)
      setCurrentTask("Analysis complete!")
      setAnalysisResults(results)

      console.log("Analysis completed successfully")
    } catch (error) {
      console.error("Analysis error:", error)
      const errorMessage = error instanceof Error ? error.message : "Analysis failed"
      setError(errorMessage)
      setProgress(0)
      setCurrentTask("")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleContinue = () => {
    if (analysisResults) {
      const mappingData: MappingData = {
        fieldMappings: analysisResults.analysis?.field_mappings || [],
        analysisResults: analysisResults,
        chatHistory: [],
        finalMappings: analysisResults.analysis?.field_mappings || [],
      }
      console.log("Proceeding with mapping data:", mappingData)
      onComplete(mappingData)
    }
  }

  useEffect(() => {
    // Auto-start analysis when component mounts
    if (documents.sourceFile && documents.targetFile) {
      analyzeDocuments()
    } else {
      setError("Source and target files are required for analysis")
    }
  }, [])

  const retry = () => {
    setError(null)
    analyzeDocuments()
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "csv":
      case "xlsx":
        return "📊"
      case "json":
      case "xml":
        return "📋"
      case "pdf":
        return "📄"
      case "docx":
        return "📝"
      default:
        return "📄"
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 2: AI Analysis</h2>
        <p className="text-gray-600 text-lg">AI is analyzing your documents to create intelligent field mappings</p>
      </div>

      {/* Document Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Documents Being Analyzed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-[#1a365d] mb-3 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Source Documents
              </h4>
              <div className="space-y-2">
                {documents.sourceFile && (
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                    <span>{getFileIcon(documents.sourceFile.name)}</span>
                    <span className="text-sm font-medium">{documents.sourceFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Data
                    </Badge>
                  </div>
                )}
                {documents.sourceSpecs.map((file) => (
                  <div key={file.name} className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                    <span>{getFileIcon(file.name)}</span>
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Spec
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-[#0f766e] mb-3 flex items-center">
                <Target className="mr-2 h-4 w-4" />
                Target Documents
              </h4>
              <div className="space-y-2">
                {documents.targetFile && (
                  <div className="flex items-center space-x-2 p-2 bg-teal-50 rounded">
                    <span>{getFileIcon(documents.targetFile.name)}</span>
                    <span className="text-sm font-medium">{documents.targetFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Data
                    </Badge>
                  </div>
                )}
                {documents.targetSpecs.map((file) => (
                  <div key={file.name} className="flex items-center space-x-2 p-2 bg-teal-50 rounded">
                    <span>{getFileIcon(file.name)}</span>
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Spec
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Document Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Analysis Progress</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            {currentTask && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{currentTask}</span>
              </div>
            )}
          </div>

          {/* Analysis Steps */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Analysis Steps:</h3>
            <div className="space-y-2">
              {[
                { step: "Document Upload", completed: progress >= 30 },
                { step: "Structure Analysis", completed: progress >= 60 },
                { step: "Field Identification", completed: progress >= 80 },
                { step: "Mapping Generation", completed: progress >= 95 },
                { step: "Results Processing", completed: progress >= 100 },
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {item.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`text-sm ${item.completed ? "text-green-700" : "text-gray-500"}`}>{item.step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Results Preview */}
          {analysisResults && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-800">Analysis Complete!</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>• Found {analysisResults.sourceFields?.length || 0} source fields</p>
                <p>• Found {analysisResults.targetFields?.length || 0} target fields</p>
                <p>• Generated {analysisResults.mappings?.length || 0} field mappings</p>
                <p>• Overall confidence: {analysisResults.confidence || 0}%</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Analysis Failed:</strong> {error}
                  </p>
                  <Button variant="outline" size="sm" onClick={retry}>
                    Retry Analysis
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>

        {analysisResults && !isAnalyzing && (
          <Button onClick={handleContinue} className="bg-[#1a365d] hover:bg-[#2d3748]">
            Continue to Review Mappings
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
