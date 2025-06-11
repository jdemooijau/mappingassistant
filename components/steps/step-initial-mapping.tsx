"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, TrendingUp, FileText, Database, Target } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"

interface StepInitialMappingProps {
  sourceFile?: File
  sourceSpecifications?: File
  targetFile?: File
  targetSpecifications?: File
  onComplete: (data: { initialMappingResults: any }) => void
  onBack: () => void
}

export function StepInitialMapping({
  sourceFile,
  sourceSpecifications,
  targetFile,
  targetSpecifications,
  onComplete,
  onBack,
}: StepInitialMappingProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [mappingResults, setMappingResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedMapping, setSelectedMapping] = useState<number | null>(null)

  useEffect(() => {
    // Auto-start analysis when component mounts
    startInitialMapping()
  }, [])

  const startInitialMapping = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setError(null)

    try {
      console.log("Starting initial mapping analysis...")
      setAnalysisProgress(10)

      const formData = new FormData()

      // Add source files
      if (sourceFile) formData.append("sourceFiles", sourceFile)
      if (sourceSpecifications) formData.append("sourceFiles", sourceSpecifications)

      // Add target files
      if (targetFile) formData.append("targetFiles", targetFile)
      if (targetSpecifications) formData.append("targetFiles", targetSpecifications)

      formData.append("prompt", "Perform comprehensive source-to-target field mapping analysis")

      setAnalysisProgress(30)

      const response = await fetch("/api/analyze-documents", {
        method: "POST",
        body: formData,
      })

      setAnalysisProgress(70)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Initial mapping analysis failed")
      }

      const result = await response.json()
      setAnalysisProgress(100)

      if (result.success) {
        setMappingResults(result)
        console.log("Initial mapping analysis completed:", result)
      } else {
        throw new Error(result.error || "Initial mapping analysis failed")
      }
    } catch (error) {
      console.error("Initial mapping error:", error)
      setError(error.message || "Failed to perform initial mapping analysis")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleContinue = () => {
    if (mappingResults) {
      onComplete({ initialMappingResults: mappingResults })
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
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 2: Initial Mapping</h2>
        <p className="text-gray-600 text-lg">
          AI is analyzing your source and target files to create intelligent field mappings
        </p>
      </div>

      {/* File Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Files Being Analyzed</CardTitle>
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
                      Source
                    </Badge>
                  </div>
                )}
                {sourceSpecifications && (
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                    <FileText className="h-4 w-4 text-[#1a365d]" />
                    <span className="text-sm">{sourceSpecifications.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Specs
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
                      Target
                    </Badge>
                  </div>
                )}
                {targetSpecifications && (
                  <div className="flex items-center space-x-2 p-2 bg-teal-50 rounded">
                    <FileText className="h-4 w-4 text-[#0f766e]" />
                    <span className="text-sm">{targetSpecifications.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Specs
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <LoadingDots variant="primary" />
                <span className="text-[#1a365d] font-medium">Performing initial mapping analysis...</span>
              </div>
              <Progress value={analysisProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {analysisProgress < 30 && "Processing source and target files..."}
                {analysisProgress >= 30 && analysisProgress < 70 && "Analyzing field structures and relationships..."}
                {analysisProgress >= 70 && "Generating intelligent field mappings..."}
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
              <Button onClick={startInitialMapping} size="sm" variant="outline">
                Retry Analysis
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Results */}
      {mappingResults && !isAnalyzing && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-[#1a365d]" />
                  <div>
                    <p className="text-sm text-gray-600">Source Fields</p>
                    <p className="text-lg font-bold text-[#1a365d]">
                      {mappingResults.sourceDocuments?.reduce(
                        (acc: number, doc: any) => acc + (doc.dataPoints?.length || 0),
                        0,
                      ) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-[#0f766e]" />
                  <div>
                    <p className="text-sm text-gray-600">Target Fields</p>
                    <p className="text-lg font-bold text-[#0f766e]">
                      {mappingResults.targetDocuments?.reduce(
                        (acc: number, doc: any) => acc + (doc.dataPoints?.length || 0),
                        0,
                      ) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Generated Mappings</p>
                    <p className="text-lg font-bold text-green-600">
                      {mappingResults.analysis?.field_mappings?.length || 0}
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
                      {Math.round((mappingResults.analysis?.document_summary?.compatibility_score || 0) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results Tabs */}
          <Tabs defaultValue="mappings" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
              <TabsTrigger value="quality">Data Quality</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
            </TabsList>

            <TabsContent value="mappings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1a365d]">Source-to-Target Field Mappings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mappingResults.analysis?.field_mappings?.map((mapping: any, index: number) => (
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
                              <code className="text-sm bg-gray-100 p-2 rounded block">
                                {mapping.transformation_logic}
                              </code>
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

                            {mapping.sample_transformation && (
                              <div>
                                <h4 className="font-medium text-[#1a365d] mb-1">Sample Transformation</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Source:</span>
                                    <code className="block bg-gray-100 p-1 rounded mt-1">
                                      {JSON.stringify(mapping.sample_transformation.input)}
                                    </code>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Target:</span>
                                    <code className="block bg-gray-100 p-1 rounded mt-1">
                                      {JSON.stringify(mapping.sample_transformation.output)}
                                    </code>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )) || <p className="text-gray-500 text-center py-4">No field mappings generated</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1a365d]">Data Quality Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  {mappingResults.analysis?.data_quality_issues?.length > 0 ? (
                    <div className="space-y-3">
                      {mappingResults.analysis.data_quality_issues.map((issue: any, index: number) => (
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
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-gray-600">No significant data quality issues detected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1a365d]">Transformation Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-[#1a365d] mb-2">Approach</h4>
                      <Badge variant="outline" className="text-[#1a365d]">
                        {mappingResults.analysis?.transformation_strategy?.approach?.replace("_", " ") ||
                          "Direct Mapping"}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-[#1a365d] mb-2">Estimated Effort</h4>
                      <Badge
                        variant="outline"
                        className={
                          mappingResults.analysis?.transformation_strategy?.estimated_effort === "high"
                            ? "text-red-600"
                            : mappingResults.analysis?.transformation_strategy?.estimated_effort === "medium"
                              ? "text-yellow-600"
                              : "text-green-600"
                        }
                      >
                        {mappingResults.analysis?.transformation_strategy?.estimated_effort || "Medium"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#1a365d] mb-2">Recommended Tools</h4>
                    <div className="flex flex-wrap gap-2">
                      {(
                        mappingResults.analysis?.transformation_strategy?.recommended_tools || [
                          "Data Transformation Engine",
                        ]
                      ).map((tool: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#1a365d] mb-2">Implementation Steps</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {(
                        mappingResults.analysis?.transformation_strategy?.implementation_steps || [
                          "Review generated field mappings",
                          "Validate transformation logic",
                          "Test with sample data",
                          "Deploy transformation pipeline",
                        ]
                      ).map((step: string, index: number) => (
                        <li key={index} className="text-gray-600">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Success Message */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Initial Mapping Complete!</p>
                  <p className="text-sm text-green-700">
                    AI has analyzed your source and target files and generated{" "}
                    {mappingResults.analysis?.field_mappings?.length || 0} field mappings. You can now proceed to the
                    dynamic mapping step to refine and customize these mappings with AI assistance.
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
          Back to Files
        </Button>

        {mappingResults && !isAnalyzing && (
          <Button onClick={handleContinue} className="bg-[#1a365d] hover:bg-[#2d3748] flex items-center">
            Continue to Dynamic Mapping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
