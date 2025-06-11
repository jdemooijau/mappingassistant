"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, X, CheckCircle, AlertCircle, Settings } from "lucide-react"

interface DocumentSet {
  sourceFile: File | null
  sourceSpecs: File[]
  targetFile: File | null
  targetSpecs: File[]
}

interface StepUploadProps {
  documents: DocumentSet
  onComplete: (documents: DocumentSet) => void
  onLoadConfiguration: (config: any) => void
}

const ACCEPTED_DATA_FORMATS = [".txt", ".json", ".xml", ".xlsx", ".csv"]
const ACCEPTED_SPEC_FORMATS = [".docx", ".xlsx", ".txt", ".pdf"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function StepUpload({ documents, onComplete, onLoadConfiguration }: StepUploadProps) {
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [localDocuments, setLocalDocuments] = useState<DocumentSet>(documents)

  const validateFile = (file: File, type: "data" | "spec"): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large (max 10MB)`
    }

    const extension = "." + file.name.split(".").pop()?.toLowerCase()
    const acceptedFormats = type === "data" ? ACCEPTED_DATA_FORMATS : ACCEPTED_SPEC_FORMATS

    if (!acceptedFormats.includes(extension)) {
      return `File "${file.name}" has unsupported format. Expected: ${acceptedFormats.join(", ")}`
    }

    return null
  }

  const handleDrop = useCallback((e: React.DragEvent, section: string) => {
    e.preventDefault()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    const newErrors: string[] = []

    files.forEach((file) => {
      if (section.includes("File")) {
        const error = validateFile(file, "data")
        if (error) {
          newErrors.push(error)
          return
        }

        setLocalDocuments((prev) => ({
          ...prev,
          [section]: file,
        }))
      } else {
        const error = validateFile(file, "spec")
        if (error) {
          newErrors.push(error)
          return
        }

        setLocalDocuments((prev) => ({
          ...prev,
          [section]: [...(prev[section as keyof DocumentSet] as File[]), file],
        }))
      }
    })

    setErrors(newErrors)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, section: string) => {
    const files = Array.from(e.target.files || [])
    const newErrors: string[] = []

    files.forEach((file) => {
      if (section.includes("File")) {
        const error = validateFile(file, "data")
        if (error) {
          newErrors.push(error)
          return
        }

        setLocalDocuments((prev) => ({
          ...prev,
          [section]: file,
        }))
      } else {
        const error = validateFile(file, "spec")
        if (error) {
          newErrors.push(error)
          return
        }

        setLocalDocuments((prev) => ({
          ...prev,
          [section]: [...(prev[section as keyof DocumentSet] as File[]), file],
        }))
      }
    })

    setErrors(newErrors)
  }

  const removeFile = (section: string, index?: number) => {
    if (section.includes("File")) {
      setLocalDocuments((prev) => ({
        ...prev,
        [section]: null,
      }))
    } else {
      setLocalDocuments((prev) => ({
        ...prev,
        [section]: (prev[section as keyof DocumentSet] as File[]).filter((_, i) => i !== index),
      }))
    }
  }

  const handleConfigurationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string)
        onLoadConfiguration(config)
      } catch (error) {
        setErrors(["Invalid configuration file format"])
      }
    }
    reader.readAsText(file)
  }

  const canProceed = localDocuments.sourceFile && localDocuments.targetFile

  const DropZone = ({
    section,
    title,
    description,
    accept,
    multiple = false,
  }: {
    section: string
    title: string
    description: string
    accept: string
    multiple?: boolean
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)

    const handleClick = () => {
      inputRef.current?.click()
    }

    return (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver === section ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(section)
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, section)}
        onClick={handleClick}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-3">{description}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileInput(e, section)}
          className="hidden"
        />
        <Button variant="outline" size="sm" type="button">
          Choose Files
        </Button>
      </div>
    )
  }

  const FileList = ({ files, section }: { files: File[]; section: string }) => (
    <div className="space-y-2 mt-3">
      {files.map((file, index) => (
        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">{file.name}</span>
            <Badge variant="outline" className="text-xs">
              {(file.size / 1024).toFixed(1)} KB
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeFile(section, index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Configuration Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Load Existing Configuration (Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".json"
              onChange={handleConfigurationUpload}
              className="hidden"
              id="config-upload"
              ref={(input) => {
                if (input) {
                  const button = document.getElementById("config-button")
                  if (button) {
                    button.onclick = () => input.click()
                  }
                }
              }}
            />
            <Button variant="outline" id="config-button" type="button">
              Load Configuration
            </Button>
            <p className="text-sm text-gray-500">
              Skip manual setup by loading a previously saved mapping configuration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Source Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Source Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone
            section="sourceFile"
            title="Source Data File"
            description="Upload your source data file (TXT, JSON, XML, Excel, CSV)"
            accept=".txt,.json,.xml,.xlsx,.csv"
          />
          {localDocuments.sourceFile && (
            <div className="flex items-center justify-between bg-green-50 p-3 rounded">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{localDocuments.sourceFile.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile("sourceFile")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <DropZone
            section="sourceSpecs"
            title="Source Specifications (Optional)"
            description="Upload documentation files (DOCX, XLSX, TXT, PDF)"
            accept=".docx,.xlsx,.txt,.pdf"
            multiple
          />
          {localDocuments.sourceSpecs.length > 0 && (
            <FileList files={localDocuments.sourceSpecs} section="sourceSpecs" />
          )}
        </CardContent>
      </Card>

      {/* Target Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Target Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DropZone
            section="targetFile"
            title="Target Data File"
            description="Upload your target data file (TXT, JSON, XML, Excel, CSV)"
            accept=".txt,.json,.xml,.xlsx,.csv"
          />
          {localDocuments.targetFile && (
            <div className="flex items-center justify-between bg-green-50 p-3 rounded">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{localDocuments.targetFile.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile("targetFile")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <DropZone
            section="targetSpecs"
            title="Target Specifications (Optional)"
            description="Upload documentation files (DOCX, XLSX, TXT, PDF)"
            accept=".docx,.xlsx,.txt,.pdf"
            multiple
          />
          {localDocuments.targetSpecs.length > 0 && (
            <FileList files={localDocuments.targetSpecs} section="targetSpecs" />
          )}
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button onClick={() => onComplete(localDocuments)} disabled={!canProceed} size="lg">
          Continue to AI Analysis
        </Button>
      </div>
    </div>
  )
}
