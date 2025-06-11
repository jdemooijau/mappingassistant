"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Save, MessageSquare } from "lucide-react"
import { EnhancedChatInterface } from "@/components/enhanced-chat-interface"
import { DynamicMappingInterface } from "@/components/dynamic-mapping-interface"
import { useMappingStore } from "@/lib/mapping-store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StepChatProps {
  analysisResults?: any
  loadedConfiguration?: any
  onComplete: (data: { mappingConfiguration: any }) => void
  onBack: () => void
  onSaveConfiguration: (config: any) => void
}

export function StepChat({
  analysisResults,
  loadedConfiguration,
  onComplete,
  onBack,
  onSaveConfiguration,
}: StepChatProps) {
  const { mappings, setDocumentMappings, exportMappings } = useMappingStore()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Extract field information
  const sourceFields =
    analysisResults?.sourceDocuments?.flatMap((doc: any) => doc.dataPoints?.map((dp: any) => dp.field) || []) || []

  const targetFields =
    analysisResults?.targetDocuments?.flatMap((doc: any) => doc.dataPoints?.map((dp: any) => dp.field) || []) ||
    sourceFields // Use source fields as target if no target documents

  useEffect(() => {
    // Initialize mapping store with analysis results or loaded configuration
    if (loadedConfiguration) {
      // Load from existing configuration
      const documentId = `loaded-${Date.now()}`
      setDocumentMappings(documentId, loadedConfiguration.mappings || [])
    } else if (analysisResults?.analysis?.field_mappings) {
      // Load from analysis results
      const documentId = `analysis-${Date.now()}`
      setDocumentMappings(documentId, analysisResults.analysis.field_mappings)
    }
  }, [analysisResults, loadedConfiguration, setDocumentMappings])

  useEffect(() => {
    // Track changes to mappings
    setHasUnsavedChanges(true)
  }, [mappings])

  const handleSaveConfiguration = () => {
    const config = {
      mappings: exportMappings(),
      metadata: {
        savedAt: new Date().toISOString(),
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
        sourceFields,
        targetFields,
        version: "1.0",
      },
    }

    onComplete({ mappingConfiguration: config })
  }

  const handleMappingUpdate = (changes: any[]) => {
    setHasUnsavedChanges(true)
    console.log("Mapping changes applied:", changes)
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#1a365d] mb-2">Step 3: AI Chat & Dynamic Mapping</h2>
        <p className="text-gray-600 text-lg">
          Interact with AI to refine your mappings and create the perfect transformation configuration
        </p>
      </div>

      {/* Configuration Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-800">Mapping Configuration Status</h4>
              <p className="text-sm text-blue-700">
                {loadedConfiguration ? "Loaded from existing configuration file" : "Generated from document analysis"} •{" "}
                {mappings.filter((m) => m.status === "active").length} active mappings
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

      {/* Main Interface */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            AI Chat Interface
          </TabsTrigger>
          <TabsTrigger value="mappings">Dynamic Mapping Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <EnhancedChatInterface
            sourceFields={sourceFields}
            targetFields={targetFields}
            documents={[...(analysisResults?.sourceDocuments || []), ...(analysisResults?.targetDocuments || [])]}
            onMappingUpdate={handleMappingUpdate}
          />
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <DynamicMappingInterface
            sourceFields={sourceFields}
            targetFields={targetFields}
            onMappingChange={handleMappingUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">How to Use This Step</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">AI Chat Interface</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Ask questions about your data and mappings</li>
                <li>• Use commands like "Map field X to field Y"</li>
                <li>• Request bulk operations: "Map all customer fields"</li>
                <li>• Get explanations: "Why is this mapping suggested?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Dynamic Mapping Manager</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• View and edit all mappings in detail</li>
                <li>• Resolve conflicts and ambiguities</li>
                <li>• Adjust confidence levels and transformations</li>
                <li>• Use natural language commands</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Mapping
        </Button>

        <Button onClick={handleContinue} className="bg-[#1a365d] hover:bg-[#2d3748] flex items-center">
          Continue to Output
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
