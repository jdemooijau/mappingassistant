"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ArrowRight, Save, MessageSquare, Eye } from "lucide-react"
import { DynamicMappingChat } from "@/components/dynamic-mapping-chat"
import { MappingVisualization } from "@/components/mapping-visualization"
import { useMappingStore } from "@/lib/mapping-store"

interface StepDynamicMappingProps {
  initialMappingResults?: any
  loadedConfiguration?: any
  sourceFile?: File
  targetFile?: File
  onComplete: (data: { finalMappingConfiguration: any }) => void
  onBack: () => void
  onSaveConfiguration: (config: any) => void
}

export function StepDynamicMapping({
  initialMappingResults,
  loadedConfiguration,
  sourceFile,
  targetFile,
  onComplete,
  onBack,
  onSaveConfiguration,
}: StepDynamicMappingProps) {
  const { mappings, setDocumentMappings, exportMappings } = useMappingStore()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentMappings, setCurrentMappings] = useState<any[]>([])

  // Extract field information
  const sourceFields =
    initialMappingResults?.sourceDocuments?.flatMap((doc: any) => doc.dataPoints?.map((dp: any) => dp.field) || []) ||
    []

  const targetFields =
    initialMappingResults?.targetDocuments?.flatMap((doc: any) => doc.dataPoints?.map((dp: any) => dp.field) || []) ||
    sourceFields // Use source fields as target if no target documents

  useEffect(() => {
    // Initialize mapping store with analysis results or loaded configuration
    if (loadedConfiguration) {
      // Load from existing configuration
      const documentId = `loaded-${Date.now()}`
      setDocumentMappings(documentId, loadedConfiguration.mappings || [])
    } else if (initialMappingResults?.analysis?.field_mappings) {
      // Load from analysis results
      const documentId = `analysis-${Date.now()}`
      setDocumentMappings(documentId, initialMappingResults.analysis.field_mappings)
    }
  }, [initialMappingResults, loadedConfiguration, setDocumentMappings])

  useEffect(() => {
    // Track changes to mappings and update current mappings
    setHasUnsavedChanges(true)
    setCurrentMappings(mappings.filter((m) => m.status === "active"))
  }, [mappings])

  const handleSaveConfiguration = () => {
    const config = {
      mappings: exportMappings(),
      metadata: {
        savedAt: new Date().toISOString(),
        sourceFile: sourceFile?.name,
        targetFile: targetFile?.name,
        sourceFields,
        targetFields,
        version: "1.0",
      },
    }

    // Create download
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mapping-configuration-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    onSaveConfiguration(config)
    setHasUnsavedChanges(false)
  }

  const handleContinue = () => {
    const config = {
      mappings: exportMappings(),
      metadata: {
        completedAt: new Date().toISOString(),
        sourceFile: sourceFile?.name,
        targetFile: targetFile?.name,
        sourceFields,
        targetFields,
        version: "1.0",
      },
    }

    onComplete({ finalMappingConfiguration: config })
  }

  const handleMappingUpdate = (updatedMappings: any[]) => {
    setCurrentMappings(updatedMappings)
    setHasUnsavedChanges(true)
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 3: AI-Powered Dynamic Mapping</h2>
        <p className="text-gray-600 text-lg">
          Interact with AI to refine your field mappings and create the perfect transformation configuration
        </p>
      </div>

      {/* Configuration Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-800">Current Mapping Configuration</h4>
              <p className="text-sm text-blue-700">
                {loadedConfiguration
                  ? "Loaded from existing configuration file"
                  : "Generated from initial mapping analysis"}{" "}
                • {mappings.filter((m) => m.status === "active").length} active mappings
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && <span className="text-sm text-yellow-600 font-medium">Unsaved changes</span>}
              <Button onClick={handleSaveConfiguration} variant="outline" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">File Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-[#1a365d] mb-2">Source</h4>
              <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                <span className="text-sm">{sourceFile?.name || "No source file"}</span>
                <Badge variant="outline" className="text-xs">
                  {sourceFields.length} fields
                </Badge>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-[#0f766e] mb-2">Target</h4>
              <div className="flex items-center space-x-2 p-2 bg-teal-50 rounded">
                <span className="text-sm">{targetFile?.name || "No target file"}</span>
                <Badge variant="outline" className="text-xs">
                  {targetFields.length} fields
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            AI Chat Interface
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            Mapping Visualization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <DynamicMappingChat
            sourceFields={sourceFields}
            targetFields={targetFields}
            currentMappings={currentMappings}
            onMappingUpdate={handleMappingUpdate}
            sourceFileName={sourceFile?.name}
            targetFileName={targetFile?.name}
          />
        </TabsContent>

        <TabsContent value="visualization" className="space-y-4">
          <MappingVisualization
            sourceFields={sourceFields}
            targetFields={targetFields}
            currentMappings={currentMappings}
            onMappingUpdate={handleMappingUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">How to Use Dynamic Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">AI Chat Commands</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• "Map field X to field Y" - Create new mapping</li>
                <li>• "Delete mapping for field X" - Remove mapping</li>
                <li>• "Change transformation for X to Y" - Modify transformation</li>
                <li>• "Show me all mappings" - Display current state</li>
                <li>• "Map all customer fields to user fields" - Bulk operations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Real-time Features</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Mappings update instantly as you chat</li>
                <li>• Conflict detection and resolution</li>
                <li>• Visual feedback on changes</li>
                <li>• Persistent configuration across sessions</li>
                <li>• Export/import mapping configurations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Initial Mapping
        </Button>

        <Button onClick={handleContinue} className="bg-[#1a365d] hover:bg-[#2d3748] flex items-center">
          Continue to Create Output
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
