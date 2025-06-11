"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Edit2, Plus, Trash2, Eye, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"

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
  sourceFields?: string[]
  targetFields?: string[]
}

interface FieldMapping {
  id: string
  sourceField: string
  targetField: string
  transformation: string
  confidence: number
  notes?: string
  valueMappings?: ValueMapping[]
}

interface ValueMapping {
  sourceValue: string
  targetValue: string
}

interface StepReviewMappingProps {
  documents: DocumentSet
  mappings: MappingData
  onComplete: (mappings: MappingData) => void
  onBack: () => void
}

export function StepReviewMapping({ documents, mappings, onComplete, onBack }: StepReviewMappingProps) {
  // Initialize state
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sourceFields, setSourceFields] = useState<string[]>([])
  const [targetFields, setTargetFields] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Extract fields from uploaded files
  useEffect(() => {
    console.log("StepReviewMapping - Component mounted")
    console.log("Initial mappings:", mappings)

    setIsLoading(true)

    // Extract actual fields from the analysis results
    const extractFields = async () => {
      try {
        // If we have source/target files, extract fields from them
        if (documents.sourceFile && documents.targetFile) {
          const sourceFileFields = await extractFileFields(documents.sourceFile)
          const targetFileFields = await extractFileFields(documents.targetFile)

          console.log("Extracted source fields:", sourceFileFields)
          console.log("Extracted target fields:", targetFileFields)

          setSourceFields(sourceFileFields)
          setTargetFields(targetFileFields)

          // Generate initial mappings based on extracted fields
          const initialMappings = generateInitialMappings(sourceFileFields, targetFileFields)
          setFieldMappings(initialMappings)
        } else {
          // Fallback to any fields from the analysis results
          const sourceFieldsFromAnalysis = mappings.sourceFields || []
          const targetFieldsFromAnalysis = mappings.targetFields || []

          setSourceFields(sourceFieldsFromAnalysis)
          setTargetFields(targetFieldsFromAnalysis)

          // Use existing mappings or generate new ones
          if (mappings.fieldMappings && mappings.fieldMappings.length > 0) {
            // Convert to our internal format if needed
            const formattedMappings = mappings.fieldMappings.map((mapping, index) => ({
              id: mapping.id || `mapping-${index}`,
              sourceField: mapping.sourceField || mapping.source_field || "",
              targetField: mapping.targetField || mapping.target_field || "",
              transformation: mapping.transformation || mapping.transformation_type || "direct",
              confidence: mapping.confidence * 100 || 75,
              notes: mapping.notes || mapping.reasoning || "",
            }))
            setFieldMappings(formattedMappings)
          } else {
            // Generate initial mappings
            const initialMappings = generateInitialMappings(sourceFieldsFromAnalysis, targetFieldsFromAnalysis)
            setFieldMappings(initialMappings)
          }
        }
      } catch (error) {
        console.error("Error extracting fields:", error)
        // Fallback to empty arrays
        setSourceFields([])
        setTargetFields([])
        setFieldMappings([])
      } finally {
        setIsLoading(false)
      }
    }

    extractFields()
  }, [documents, mappings])

  // Extract fields from a file
  const extractFileFields = async (file: File): Promise<string[]> => {
    try {
      const extension = file.name.split(".").pop()?.toLowerCase()

      if (extension === "csv") {
        const content = await file.text()
        const lines = content.split("\n")
        if (lines.length > 0) {
          // Assume first line is header
          const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
          return headers.filter(Boolean) // Remove empty headers
        }
      } else if (extension === "json") {
        const content = await file.text()
        try {
          const json = JSON.parse(content)
          if (Array.isArray(json) && json.length > 0) {
            // Get keys from first object
            return Object.keys(json[0])
          } else if (typeof json === "object" && json !== null) {
            // Get top-level keys
            return Object.keys(json)
          }
        } catch (e) {
          console.error("Error parsing JSON:", e)
        }
      }

      // Fallback to sample fields based on file name
      return generateSampleFields(file.name)
    } catch (error) {
      console.error("Error reading file:", error)
      return generateSampleFields(file.name)
    }
  }

  // Generate sample fields based on file name
  const generateSampleFields = (fileName: string): string[] => {
    if (fileName.toLowerCase().includes("user") || fileName.toLowerCase().includes("customer")) {
      return ["id", "name", "email", "age", "department"]
    } else if (fileName.toLowerCase().includes("product")) {
      return ["product_id", "name", "price", "category", "stock"]
    } else if (fileName.toLowerCase().includes("order")) {
      return ["order_id", "customer_id", "date", "total", "status"]
    } else {
      return ["id", "name", "description", "created_at", "updated_at"]
    }
  }

  // Generate initial mappings based on field names
  const generateInitialMappings = (sourceFields: string[], targetFields: string[]): FieldMapping[] => {
    const mappings: FieldMapping[] = []

    // Try to match fields with similar names
    sourceFields.forEach((sourceField, index) => {
      // Find a matching target field
      const matchingTarget = targetFields.find(
        (targetField) =>
          targetField.toLowerCase().includes(sourceField.toLowerCase()) ||
          sourceField.toLowerCase().includes(targetField.toLowerCase()),
      )

      // If we found a match or have a target field at the same index
      const targetField = matchingTarget || (index < targetFields.length ? targetFields[index] : "")

      if (targetField) {
        mappings.push({
          id: `mapping-${index}`,
          sourceField,
          targetField,
          transformation: "direct",
          confidence: matchingTarget ? 85 : 70,
        })
      }
    })

    return mappings
  }

  const transformationTypes = [
    { value: "direct", label: "Direct Copy" },
    { value: "uppercase", label: "Uppercase" },
    { value: "lowercase", label: "Lowercase" },
    { value: "date_format", label: "Date Format" },
    { value: "currency", label: "Currency Format" },
    { value: "concat", label: "Concatenate" },
    { value: "split", label: "Split Field" },
    { value: "value_mapping", label: "Value Mapping" },
    { value: "custom", label: "Custom Transform" },
  ]

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800"
    if (confidence >= 70) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    setFieldMappings((prev) => prev.map((mapping) => (mapping.id === id ? { ...mapping, ...updates } : mapping)))
  }

  const addMapping = () => {
    const newMapping: FieldMapping = {
      id: Date.now().toString(),
      sourceField: "",
      targetField: "",
      transformation: "direct",
      confidence: 50,
    }
    setFieldMappings((prev) => [...prev, newMapping])
    setEditingId(newMapping.id)
  }

  const removeMapping = (id: string) => {
    setFieldMappings((prev) => prev.filter((mapping) => mapping.id !== id))
  }

  const handleContinue = () => {
    // Format mappings to ensure consistency between steps
    const formattedMappings = fieldMappings.map((mapping) => ({
      id: mapping.id,
      sourceField: mapping.sourceField,
      targetField: mapping.targetField,
      transformation: mapping.transformation,
      confidence: mapping.confidence,
      notes: mapping.notes,
      // Ensure compatibility with AI Chat step format
      source_field: mapping.sourceField,
      target_field: mapping.targetField,
      transformation_type: mapping.transformation,
      valueMappings: mapping.valueMappings || [],
    }))

    const updatedMappings: MappingData = {
      ...mappings,
      fieldMappings: formattedMappings,
      finalMappings: formattedMappings,
      sourceFields,
      targetFields,
    }
    onComplete(updatedMappings)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Review Field Mappings</span>
            </div>
            <Button onClick={addMapping} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
              <span className="ml-3">Extracting fields from files...</span>
            </div>
          ) : fieldMappings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No mappings available</AlertTitle>
              <AlertDescription>
                No field mappings could be generated from your files. Click "Add Mapping" to create mappings manually.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-3">Source Field</div>
                <div className="col-span-1 text-center">→</div>
                <div className="col-span-3">Target Field</div>
                <div className="col-span-2">Transformation</div>
                <div className="col-span-2">Confidence</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Mappings */}
              {fieldMappings.map((mapping) => (
                <div key={mapping.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100">
                  {/* Source Field */}
                  <div className="col-span-3">
                    {editingId === mapping.id ? (
                      <Select
                        value={mapping.sourceField}
                        onValueChange={(value) => updateMapping(mapping.id, { sourceField: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source field" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                        {mapping.sourceField || "Select field"}
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 text-center">
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />
                  </div>

                  {/* Target Field */}
                  <div className="col-span-3">
                    {editingId === mapping.id ? (
                      <Select
                        value={mapping.targetField}
                        onValueChange={(value) => updateMapping(mapping.id, { targetField: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target field" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm font-mono bg-green-50 px-2 py-1 rounded">
                        {mapping.targetField || "Select field"}
                      </span>
                    )}
                  </div>

                  {/* Transformation */}
                  <div className="col-span-2">
                    {editingId === mapping.id ? (
                      <Select
                        value={mapping.transformation}
                        onValueChange={(value) => updateMapping(mapping.id, { transformation: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {transformationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">
                        {transformationTypes.find((t) => t.value === mapping.transformation)?.label || "Direct Copy"}
                      </Badge>
                    )}
                  </div>

                  {/* Value Mappings Section */}
                  {editingId === mapping.id && mapping.transformation === "value_mapping" && (
                    <div className="col-span-12 mt-2 p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium">Value Mappings</h4>
                        <Button
                          size="sm"
                          onClick={() => {
                            const updated = [...fieldMappings]
                            const mappingIndex = updated.findIndex((m) => m.id === mapping.id)
                            if (!updated[mappingIndex].valueMappings) {
                              updated[mappingIndex].valueMappings = []
                            }
                            updated[mappingIndex].valueMappings.push({
                              sourceValue: "",
                              targetValue: "",
                            })
                            setFieldMappings(updated)
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Value
                        </Button>
                      </div>

                      {mapping.valueMappings && mapping.valueMappings.length > 0 ? (
                        <div className="space-y-2">
                          {mapping.valueMappings.map((vm, vmIndex) => (
                            <div key={vmIndex} className="flex items-center space-x-2">
                              <Input
                                value={vm.sourceValue}
                                onChange={(e) => {
                                  const updated = [...fieldMappings]
                                  const mappingIndex = updated.findIndex((m) => m.id === mapping.id)
                                  updated[mappingIndex].valueMappings[vmIndex].sourceValue = e.target.value
                                  setFieldMappings(updated)
                                }}
                                placeholder="Source value"
                                className="text-sm"
                              />
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <Input
                                value={vm.targetValue}
                                onChange={(e) => {
                                  const updated = [...fieldMappings]
                                  const mappingIndex = updated.findIndex((m) => m.id === mapping.id)
                                  updated[mappingIndex].valueMappings[vmIndex].targetValue = e.target.value
                                  setFieldMappings(updated)
                                }}
                                placeholder="Target value"
                                className="text-sm"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const updated = [...fieldMappings]
                                  const mappingIndex = updated.findIndex((m) => m.id === mapping.id)
                                  updated[mappingIndex].valueMappings = updated[mappingIndex].valueMappings.filter(
                                    (_, i) => i !== vmIndex,
                                  )
                                  setFieldMappings(updated)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No value mappings defined</p>
                      )}
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="col-span-2">
                    <Badge className={getConfidenceColor(mapping.confidence)}>{mapping.confidence}%</Badge>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex space-x-1">
                    {editingId === mapping.id ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        ✓
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(mapping.id)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeMapping(mapping.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {!isLoading && fieldMappings.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Mapping Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Mappings:</span>
                  <span className="ml-2 font-medium">{fieldMappings.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">High Confidence:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {fieldMappings.filter((m) => m.confidence >= 90).length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Needs Review:</span>
                  <span className="ml-2 font-medium text-yellow-600">
                    {fieldMappings.filter((m) => m.confidence < 70).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analysis
        </Button>
        <Button onClick={handleContinue}>
          Continue to AI Chat
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
