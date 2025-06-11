"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, FileText, Settings, FolderOpen, AlertTriangle, CheckCircle } from "lucide-react"

interface StepSourceTargetProps {
  onComplete: (data: {
    sourceFiles: File[]
    targetFiles: File[]
  }) => void
  onLoadConfiguration: (config: any) => void
}

export function StepSourceTarget({ onComplete, onLoadConfiguration }: StepSourceTargetProps) {
  const [sourceFiles, setSourceFiles] = useState<File[]>([])
  const [targetFiles, setTargetFiles] = useState<File[]>([])
  const [uploadType, setUploadType] = useState<"source" | "target">("source")
  const [fileError, setFileError] = useState<string | null>(null)

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

  const handleContinue = () => {
    if (sourceFiles.length === 0) {
      setFileError("Please upload at least one source file")
      return
    }

    onComplete({
      sourceFiles,
      targetFiles,
    })
  }

  const handleLoadConfig = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const config = JSON.parse(e.target?.result as string)
            onLoadConfiguration(config)
          } catch (error) {
            setFileError("Invalid configuration file format")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 1: Upload Documents</h2>
        <p className="text-gray-600 text-lg">Upload your source and target documents for analysis</p>
      </div>

      {/* Load Configuration */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <FolderOpen className="mr-2 h-5 w-5" />
            Load Existing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">
                Have a saved mapping configuration? Load it to skip to the AI chat step.
              </p>
            </div>
            <Button onClick={handleLoadConfig} variant="outline" className="text-blue-800 border-blue-300">
              <Settings className="mr-2 h-4 w-4" />
              Load Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Error Alert */}
      {fileError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{fileError}</AlertDescription>
        </Alert>
      )}

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Supported File Formats</CardTitle>
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

      {/* File Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Source Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#1a365d]">
              <FileText className="mr-2 h-5 w-5" />
              Source Documents ({sourceFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">No source documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {sourceFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getFileIcon(file.name)}</span>
                      <div>
                        <span className="text-sm font-medium">{file.name}</span>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(file.name, "source")}>
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
              <FileText className="mr-2 h-5 w-5" />
              Target Documents ({targetFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {targetFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">No target documents uploaded (optional)</p>
            ) : (
              <div className="space-y-2">
                {targetFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-teal-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getFileIcon(file.name)}</span>
                      <div>
                        <span className="text-sm font-medium">{file.name}</span>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(file.name, "target")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Source Documents</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Upload the files you want to transform</li>
                <li>• These contain the data you want to map</li>
                <li>• At least one source file is required</li>
                <li>• Multiple files will be analyzed together</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Target Documents (Optional)</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Upload examples of your desired output format</li>
                <li>• Helps AI understand your target structure</li>
                <li>• Can be specifications or sample files</li>
                <li>• If omitted, AI will suggest optimal mappings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      {sourceFiles.length > 0 && (
        <div className="text-center">
          <Button onClick={handleContinue} className="bg-[#1a365d] hover:bg-[#2d3748] text-white px-8 py-3 text-lg">
            <CheckCircle className="mr-2 h-5 w-5" />
            Continue to AI Mapping
          </Button>
        </div>
      )}
    </div>
  )
}
