"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, ArrowRight, Download, FileText, CheckCircle, AlertCircle } from "lucide-react"

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

interface StepConversionProps {
  documents: DocumentSet
  mappings: MappingData
  onComplete: () => void
  onBack: () => void
}

export function StepConversion({ documents, mappings, onComplete, onBack }: StepConversionProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState("")
  const [conversionComplete, setConversionComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputFile, setOutputFile] = useState<string | null>(null)

  const startConversion = async () => {
    setIsConverting(true)
    setError(null)
    setProgress(0)

    try {
      // Step 1: Prepare conversion
      setCurrentTask("Preparing data transformation...")
      setProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Step 2: Apply mappings
      setCurrentTask("Applying field mappings...")
      setProgress(30)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Step 3: Transform data
      setCurrentTask("Transforming data values...")
      setProgress(60)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 4: Generate output
      setCurrentTask("Generating output file...")
      setProgress(85)
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Step 5: Finalize
      setCurrentTask("Finalizing conversion...")
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Simulate file generation
      const targetExtension = documents.targetFile?.name.split(".").pop() || "json"
      const outputFileName = `transformed_data.${targetExtension}`
      setOutputFile(outputFileName)
      setConversionComplete(true)
      setCurrentTask("Conversion complete!")
    } catch (error) {
      console.error("Conversion error:", error)
      setError(error instanceof Error ? error.message : "Conversion failed")
      setProgress(0)
      setCurrentTask("")
    } finally {
      setIsConverting(false)
    }
  }

  const downloadFile = () => {
    // Simulate file download
    const sampleData = {
      metadata: {
        source: documents.sourceFile?.name,
        target: documents.targetFile?.name,
        mappings: mappings.finalMappings.length,
        timestamp: new Date().toISOString(),
      },
      data: [
        { name: "John Doe", email: "john@example.com", date: "2024-01-15", amount: "$1,250.00" },
        { name: "Jane Smith", email: "jane@example.com", date: "2024-01-16", amount: "$890.50" },
        { name: "Bob Johnson", email: "bob@example.com", date: "2024-01-17", amount: "$2,100.75" },
      ],
    }

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = outputFile || "transformed_data.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>File Conversion</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Conversion Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Source File</div>
              <div className="font-medium">{documents.sourceFile?.name}</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <ArrowRight className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Mappings</div>
              <div className="font-medium">{mappings.finalMappings.length} fields</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Target Format</div>
              <div className="font-medium">{documents.targetFile?.name}</div>
            </div>
          </div>

          {/* Conversion Progress */}
          {(isConverting || conversionComplete) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conversion Progress</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {currentTask && (
                <div className="text-sm text-gray-600 flex items-center space-x-2">
                  {conversionComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{currentTask}</span>
                </div>
              )}
            </div>
          )}

          {/* Conversion Steps */}
          {(isConverting || conversionComplete) && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Conversion Steps:</h3>
              <div className="space-y-2">
                {[
                  { step: "Data Preparation", completed: progress >= 10 },
                  { step: "Field Mapping", completed: progress >= 30 },
                  { step: "Value Transformation", completed: progress >= 60 },
                  { step: "Output Generation", completed: progress >= 85 },
                  { step: "File Finalization", completed: progress >= 100 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {item.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={`text-sm ${item.completed ? "text-green-700" : "text-gray-500"}`}>
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {conversionComplete && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-800">Conversion Successful!</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>• Processed {mappings.finalMappings.length} field mappings</p>
                <p>• Applied transformations successfully</p>
                <p>• Generated output file: {outputFile}</p>
                <p>• Ready for download</p>
              </div>
              <Button onClick={downloadFile} className="mt-3" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Converted File
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{error}</p>
                  <Button variant="outline" size="sm" onClick={startConversion}>
                    Retry Conversion
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Start Conversion Button */}
          {!isConverting && !conversionComplete && !error && (
            <div className="text-center">
              <Button onClick={startConversion} size="lg">
                Start File Conversion
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                This will transform your source data using the configured mappings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to AI Chat
        </Button>
        {conversionComplete && (
          <Button onClick={onComplete}>
            Save Configuration
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
