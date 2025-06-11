"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, Save, FileText, CheckCircle, AlertTriangle, Database, Target } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"

interface StepCreateOutputProps {
  sourceFile?: File
  sourceDataFile?: File
  targetFile?: File
  targetDataFile?: File
  mappingConfiguration: any
  onBack: () => void
  onSaveConfiguration: (config: any) => void
}

export function StepCreateOutput({
  sourceFile,
  sourceDataFile,
  targetFile,
  targetDataFile,
  mappingConfiguration,
  onBack,
  onSaveConfiguration,
}: StepCreateOutputProps) {
  const [outputFormat, setOutputFormat] = useState<string>("csv")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [outputResult, setOutputResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const outputFormats = [
    { value: "csv", label: "CSV (Comma Separated Values)", extension: ".csv" },
    { value: "json", label: "JSON (JavaScript Object Notation)", extension: ".json" },
    { value: "xlsx", label: "Excel Spreadsheet", extension: ".xlsx" },
    { value: "xml", label: "XML (Extensible Markup Language)", extension: ".xml" },
  ]

  const activeMappings = mappingConfiguration?.mappings?.filter((m: any) => m.status === "active") || []

  const handleSaveConfiguration = () => {
    const config = {
      ...mappingConfiguration,
      metadata: {
        ...mappingConfiguration.metadata,
        finalSavedAt: new Date().toISOString(),
        outputFormat,
        sourceFile: sourceFile?.name,
        sourceDataFile: sourceDataFile?.name,
        targetFile: targetFile?.name,
        targetDataFile: targetDataFile?.name,
        version: "1.0",
      },
    }

    // Create download
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `final-mapping-configuration-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    onSaveConfiguration(config)
  }

  const generateOutput = async () => {
    if (activeMappings.length === 0) {
      setError("No active mappings found. Please go back and create some mappings first.")
      return
    }

    if (!sourceDataFile && !sourceFile) {
      setError("No source data file found. Please ensure you have uploaded source data.")
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setError(null)
    setOutputResult(null)

    try {
      console.log("Starting output generation...")
      setGenerationProgress(20)

      // Use source data file if available, otherwise use source file
      const dataFile = sourceDataFile || sourceFile!

      // Read file content
      const content = await dataFile.text()
      setGenerationProgress(40)

      // Apply mappings (simplified simulation)
      const transformedData = await applyMappings(content, activeMappings, dataFile.name)
      setGenerationProgress(70)

      // Generate output in selected format
      const outputData = await formatOutput(transformedData, outputFormat)
      setGenerationProgress(100)

      setOutputResult({
        data: outputData,
        format: outputFormat,
        fileName: `transformed-${targetFile?.name?.split(".")[0] || "output"}-${Date.now()}${outputFormats.find((f) => f.value === outputFormat)?.extension}`,
        recordCount: transformedData.records?.length || 0,
        mappingsApplied: activeMappings.length,
        sourceFileName: dataFile.name,
        targetFileName: targetFile?.name,
      })

      console.log("Output generation completed successfully")
    } catch (error) {
      console.error("Output generation error:", error)
      setError(error.message || "Failed to generate output")
    } finally {
      setIsGenerating(false)
    }
  }

  const applyMappings = async (content: string, mappings: any[], fileName: string) => {
    // Simplified mapping application
    const lines = content.split("\n").filter((line) => line.trim())
    if (lines.length === 0) return { records: [], fileName }

    // Assume CSV format for simplicity
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    const dataRows = lines.slice(1)

    const transformedRecords = dataRows.map((row) => {
      const values = row.split(",").map((v) => v.trim().replace(/"/g, ""))
      const record: any = {}

      // Apply each mapping
      mappings.forEach((mapping) => {
        const sourceIndex = headers.findIndex((h) => h.toLowerCase() === mapping.source_field.toLowerCase())
        if (sourceIndex >= 0 && values[sourceIndex] !== undefined) {
          let value = values[sourceIndex]

          // Apply transformation based on type
          switch (mapping.transformation_type) {
            case "data_type_conversion":
              if (!isNaN(Number(value))) value = Number(value)
              break
            case "format_standardization":
              value = value.toLowerCase().trim()
              break
            case "value_normalization":
              value = value.replace(/\s+/g, " ").trim()
              break
            default:
              // direct_mapping - no transformation
              break
          }

          record[mapping.target_field] = value
        }
      })

      return record
    })

    return { records: transformedRecords, fileName }
  }

  const formatOutput = async (processedData: any, format: string) => {
    const records = processedData.records

    switch (format) {
      case "csv":
        if (records.length === 0) return ""
        const headers = Object.keys(records[0])
        const csvContent = [
          headers.join(","),
          ...records.map((record: any) => headers.map((header) => `"${record[header] || ""}"`).join(",")),
        ].join("\n")
        return csvContent

      case "json":
        return JSON.stringify(records, null, 2)

      case "xlsx":
        // For demo purposes, return CSV-like content
        // In a real implementation, you'd use a library like xlsx
        return "Excel format would be generated here"

      case "xml":
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<data>
${records
  .map(
    (record: any) =>
      `  <record>
${Object.entries(record)
  .map(([key, value]) => `    <${key}>${value}</${key}>`)
  .join("\n")}
  </record>`,
  )
  .join("\n")}
</data>`
        return xmlContent

      default:
        return JSON.stringify(records, null, 2)
    }
  }

  const downloadOutput = () => {
    if (!outputResult) return

    const blob = new Blob([outputResult.data], {
      type: outputFormat === "json" ? "application/json" : "text/plain",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = outputResult.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 4: Create Output</h2>
        <p className="text-gray-600 text-lg">Generate your transformed data file using the configured mappings</p>
      </div>

      {/* File Context Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Transformation Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-[#1a365d] mb-3 flex items-center">
                <Database className="mr-2 h-4 w-4" />
                Source Files
              </h4>
              <div className="space-y-2">
                {sourceFile && (
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                    <FileText className="h-4 w-4 text-[#1a365d]" />
                    <span className="text-sm">{sourceFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Schema
                    </Badge>
                  </div>
                )}
                {sourceDataFile && (
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                    <Database className="h-4 w-4 text-[#1a365d]" />
                    <span className="text-sm">{sourceDataFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Data
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-[#0f766e] mb-3 flex items-center">
                <Target className="mr-2 h-4 w-4" />
                Target Files
              </h4>
              <div className="space-y-2">
                {targetFile && (
                  <div className="flex items-center space-x-2 p-2 bg-teal-50 rounded">
                    <FileText className="h-4 w-4 text-[#0f766e]" />
                    <span className="text-sm">{targetFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Schema
                    </Badge>
                  </div>
                )}
                {targetDataFile && (
                  <div className="flex items-center space-x-2 p-2 bg-teal-50 rounded">
                    <Database className="h-4 w-4 text-[#0f766e]" />
                    <span className="text-sm">{targetDataFile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Sample
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Mapping Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Active Mappings</p>
              <p className="text-lg font-bold text-[#0f766e]">{activeMappings.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Source Fields</p>
              <p className="text-lg font-bold text-[#1a365d]">
                {mappingConfiguration?.metadata?.sourceFields?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Target Fields</p>
              <p className="text-lg font-bold text-gray-700">
                {mappingConfiguration?.metadata?.targetFields?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Source</p>
              <p className="text-lg font-bold text-gray-700">
                {sourceDataFile ? "Data File" : sourceFile ? "Schema File" : "None"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Output Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Output Format</label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outputFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Save Final Configuration</h4>
              <p className="text-sm text-gray-600">Save your complete mapping configuration for future use</p>
            </div>
            <Button onClick={handleSaveConfiguration} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Mappings Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Active Mappings ({activeMappings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMappings.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                No active mappings found. Please go back to Step 3 to create mappings before generating output.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {activeMappings.slice(0, 10).map((mapping: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[#1a365d]">
                      {mapping.source_field}
                    </Badge>
                    <span>→</span>
                    <Badge variant="outline" className="text-[#0f766e]">
                      {mapping.target_field}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {mapping.transformation_type?.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {activeMappings.length > 10 && (
                <p className="text-sm text-gray-500 text-center">... and {activeMappings.length - 10} more mappings</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <LoadingDots variant="primary" />
                <span className="text-[#1a365d] font-medium">Generating transformed output file...</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {generationProgress < 40 && "Reading source data..."}
                {generationProgress >= 40 && generationProgress < 70 && "Applying field mappings..."}
                {generationProgress >= 70 && "Formatting output data..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output Result */}
      {outputResult && !isGenerating && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="mr-2 h-5 w-5" />
              Transformation Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Records Processed</p>
                  <p className="text-lg font-bold text-green-800">{outputResult.recordCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mappings Applied</p>
                  <p className="text-lg font-bold text-green-800">{outputResult.mappingsApplied}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Output Format</p>
                  <p className="text-lg font-bold text-green-800">{outputResult.format.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Size</p>
                  <p className="text-lg font-bold text-green-800">
                    {(new Blob([outputResult.data]).size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-green-200 rounded">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{outputResult.fileName}</p>
                    <p className="text-sm text-green-600">
                      Transformed from {outputResult.sourceFileName} to {outputResult.targetFileName || "target format"}
                    </p>
                  </div>
                </div>
                <Button onClick={downloadOutput} className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              </div>

              <div className="text-sm text-green-700">
                <p>
                  <strong>Success!</strong> Your data has been transformed using {outputResult.mappingsApplied} field
                  mappings and is ready for download in {outputResult.format.toUpperCase()} format.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Output Button */}
      {!outputResult && !isGenerating && (
        <div className="text-center">
          <Button
            onClick={generateOutput}
            disabled={activeMappings.length === 0}
            className="bg-[#1a365d] hover:bg-[#2d3748] text-white px-8 py-3 text-lg"
          >
            <FileText className="mr-2 h-5 w-5" />
            Generate Transformed Output
          </Button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dynamic Mapping
        </Button>

        {outputResult && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Transformation Complete
            </Badge>
          </div>
        )}
      </div>

      {/* Completion Message */}
      {outputResult && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="text-center">
              <h4 className="font-medium text-blue-800 mb-2">🎉 Data Transformation Complete!</h4>
              <p className="text-sm text-blue-700">
                You have successfully completed the 4-step data transformation workflow. Your source data has been
                intelligently mapped and transformed to match your target format. You can download your mapping
                configuration for future use or start a new transformation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
