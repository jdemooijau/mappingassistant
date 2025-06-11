"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, File, X, CheckCircle, FileText, Database, Code, AlertTriangle } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DebugPanel } from "@/components/debug-panel"
import { FilePreview } from "@/components/file-preview"
import { SetupGuide } from "@/components/setup-guide"

interface EnhancedDocumentUploadProps {
  onAnalysisComplete: (analysis: any) => void
  onError: (error: string) => void
}

export function EnhancedDocumentUpload({ onAnalysisComplete, onError }: EnhancedDocumentUploadProps) {
  const [sourceFiles, setSourceFiles] = useState<File[]>([])
  const [targetFiles, setTargetFiles] = useState<File[]>([])
  const [uploadType, setUploadType] = useState<"source" | "target">("source")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [analysisPrompt, setAnalysisPrompt] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)
  const [processedDocuments, setProcessedDocuments] = useState<any[]>([])

  const supportedFormats = ["csv", "txt", "json", "xml", "xlsx", "pdf", "docx"]
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFileError(null)

      // Check file formats
      const validFiles = acceptedFiles.filter((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase()
        return supportedFormats.includes(extension || "")
      })

      if (validFiles.length !== acceptedFiles.length) {
        setFileError("Some files were rejected. Only CSV, TXT, JSON, XML, XLSX, PDF, and DOCX files are supported.")
      }

      // Check file sizes
      const oversizedFiles = validFiles.filter((file) => file.size > MAX_FILE_SIZE)
      if (oversizedFiles.length > 0) {
        setFileError(`Files exceeding 10MB limit: ${oversizedFiles.map((f) => f.name).join(", ")}`)
        return
      }

      const filesToAdd = validFiles.filter((file) => file.size <= MAX_FILE_SIZE)

      if (uploadType === "source") {
        setSourceFiles((prev) => [...prev, ...filesToAdd])
      } else {
        setTargetFiles((prev) => [...prev, ...filesToAdd])
      }
    },
    [uploadType],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".txt"],
      "application/json": [".json"],
      "application/xml": [".xml"],
      "text/xml": [".xml"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  })

  const removeFile = (fileName: string, type: "source" | "target") => {
    if (type === "source") {
      setSourceFiles((prev) => prev.filter((file) => file.name !== fileName))
    } else {
      setTargetFiles((prev) => prev.filter((file) => file.name !== fileName))
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "csv":
      case "xlsx":
        return <Database className="h-4 w-4" />
      case "json":
      case "xml":
        return <Code className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const testAPIHealth = async () => {
    try {
      console.log("Testing API health...")
      const response = await fetch("/api/health")
      const result = await response.json()
      console.log("Health check result:", result)
      return result.status === "healthy"
    } catch (error) {
      console.error("Health check failed:", error)
      return false
    }
  }

  const analyzeDocuments = async () => {
    if (sourceFiles.length === 0) {
      onError("Please upload at least one source document")
      return
    }

    // Test API health first
    const isHealthy = await testAPIHealth()
    if (!isHealthy) {
      onError("API is not responding. Please refresh the page and try again.")
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)
    setFileError(null)

    try {
      console.log("=== Starting Document Analysis ===")
      console.log(
        "Source files:",
        sourceFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      )
      console.log(
        "Target files:",
        targetFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      )

      const formData = new FormData()

      sourceFiles.forEach((file, index) => {
        console.log(`Adding source file ${index + 1}: ${file.name}`)
        formData.append("sourceFiles", file)
      })

      targetFiles.forEach((file, index) => {
        console.log(`Adding target file ${index + 1}: ${file.name}`)
        formData.append("targetFiles", file)
      })

      const prompt = analysisPrompt || "Analyze these documents and suggest optimal mapping strategies"
      formData.append("prompt", prompt)
      console.log("Analysis prompt:", prompt)

      setProcessingProgress(25)

      console.log("Sending request to /api/analyze-documents...")

      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        body: formData,
      })

      setProcessingProgress(75)

      console.log("Response received:")
      console.log("- Status:", response.status)
      console.log("- Status Text:", response.statusText)
      console.log("- Content-Type:", response.headers.get("content-type"))
      console.log("- OK:", response.ok)

      // Get response text first to see what we actually received
      const responseText = await response.text()
      console.log("Raw response text:", responseText.substring(0, 500) + "...")

      // Check if response looks like JSON
      if (!responseText.trim().startsWith("{") && !responseText.trim().startsWith("[")) {
        console.error("Response is not JSON:", responseText)
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}...`)
      }

      // Try to parse JSON
      let result
      try {
        result = JSON.parse(responseText)
        console.log("Successfully parsed JSON result:", result)
      } catch (jsonError) {
        console.error("JSON parsing failed:", jsonError)
        console.error("Response text:", responseText)
        throw new Error("Failed to parse server response as JSON")
      }

      if (result.success) {
        setProcessingProgress(100)
        console.log("Analysis completed successfully")

        if (result.note) {
          console.log("Note:", result.note)
        }

        setProcessedDocuments([...result.sourceDocuments, ...result.targetDocuments])
        onAnalysisComplete(result)
      } else {
        console.error("Analysis failed:", result)
        throw new Error(result.error || "Analysis failed with unknown error")
      }
    } catch (error) {
      console.error("=== ANALYSIS ERROR ===")
      console.error("Error type:", typeof error)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)

      let errorMessage = "Analysis failed. Please try again."

      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection and try again."
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Try with smaller files."
      } else if (error.message.includes("JSON")) {
        errorMessage = "Server response error. Please try again."
      } else if (error.message.includes("non-JSON")) {
        errorMessage = "Server error. Please refresh the page and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      onError(errorMessage)
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1a365d] mb-2">Document Analysis</h2>
        <p className="text-gray-600">Upload documents for intelligent mapping and transformation analysis</p>
      </div>

      {/* File Error Alert */}
      {fileError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">{fileError}</AlertDescription>
        </Alert>
      )}

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Supported Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {supportedFormats.map((format) => (
              <Badge key={format} variant="outline" className="text-[#1a365d]">
                {format.toUpperCase()}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">Maximum file size: 10MB per file</p>
        </CardContent>
      </Card>

      {/* Upload Type Selector */}
      <div className="flex justify-center space-x-4">
        <Button
          variant={uploadType === "source" ? "default" : "outline"}
          onClick={() => setUploadType("source")}
          className="bg-[#1a365d] hover:bg-[#2d3748]"
        >
          Source Documents
        </Button>
        <Button
          variant={uploadType === "target" ? "default" : "outline"}
          onClick={() => setUploadType("target")}
          className="bg-[#0f766e] hover:bg-[#0d5d56]"
        >
          Target Documents (Optional)
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-[#1a365d] transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer ${isDragActive ? "text-[#1a365d]" : "text-gray-500"}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Drop files here" : `Upload ${uploadType} documents`}
            </p>
            <p className="text-sm">Drag and drop files here, or click to select files</p>
            <p className="text-xs text-gray-400 mt-2">Supports CSV, TXT, JSON, XML, XLSX, PDF, DOCX (max 10MB each)</p>
          </div>
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <LoadingDots variant="primary" />
                <span className="text-[#1a365d] font-medium">Processing documents...</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {processingProgress < 25 && "Uploading files..."}
                {processingProgress >= 25 && processingProgress < 75 && "Analyzing document structure..."}
                {processingProgress >= 75 && "Generating mapping suggestions..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Source Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#1a365d]">
              <File className="mr-2 h-5 w-5" />
              Source Documents ({sourceFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">No source documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {sourceFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.name)}
                      <div>
                        <span className="text-sm font-medium">{file.name}</span>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        <FilePreview file={file} />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.name, "source")}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#0f766e]">
              <File className="mr-2 h-5 w-5" />
              Target Documents ({targetFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {targetFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">No target documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {targetFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-2 bg-teal-50 rounded">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.name)}
                      <div>
                        <span className="text-sm font-medium">{file.name}</span>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        <FilePreview file={file} />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.name, "target")}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Analysis Instructions (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={analysisPrompt}
            onChange={(e) => setAnalysisPrompt(e.target.value)}
            placeholder="Describe specific mapping requirements or focus areas..."
            className="w-full p-3 border rounded-md resize-none"
            rows={3}
            disabled={isProcessing}
          />
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Quick Start Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Start with simple CSV or TXT files to test the system</li>
            <li>Ensure files are under 10MB and in supported formats</li>
            <li>Check browser console (F12) for detailed error information</li>
            <li>Try uploading one file at a time if you encounter issues</li>
          </ul>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <SetupGuide />

      {/* Debug Panel */}
      <DebugPanel
        sourceDocuments={processedDocuments.filter((doc) => sourceFiles.some((f) => f.name === doc.name))}
        targetDocuments={processedDocuments.filter((doc) => targetFiles.some((f) => f.name === doc.name))}
      />

      {/* Analyze Button */}
      {sourceFiles.length > 0 && (
        <div className="text-center">
          <Button
            onClick={analyzeDocuments}
            disabled={isProcessing}
            className="bg-[#1a365d] hover:bg-[#2d3748] text-white px-8 py-2"
          >
            {isProcessing ? (
              <div className="flex items-center">
                <LoadingDots variant="white" className="mr-2" />
                Analyzing...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Analyze Documents
              </div>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
