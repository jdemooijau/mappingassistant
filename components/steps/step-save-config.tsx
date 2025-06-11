"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, RefreshCw, CheckCircle } from "lucide-react"

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

interface StepSaveConfigProps {
  documents: DocumentSet
  mappings: MappingData
  onComplete: () => void
  onBack: () => void
  onStartNew: () => void
}

export function StepSaveConfig({ documents, mappings, onComplete, onBack, onStartNew }: StepSaveConfigProps) {
  const [configName, setConfigName] = useState("")
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveComplete, setSaveComplete] = useState(false)

  const generateConfigName = () => {
    const sourceExt = documents.sourceFile?.name.split(".").pop() || "unknown"
    const targetExt = documents.targetFile?.name.split(".").pop() || "unknown"
    const timestamp = new Date().toISOString().split("T")[0]
    return `${sourceExt}_to_${targetExt}_${timestamp}`
  }

  const saveConfiguration = async () => {
    setIsSaving(true)

    try {
      const config = {
        name: configName || generateConfigName(),
        description,
        created: new Date().toISOString(),
        sourceFormat: documents.sourceFile?.name.split(".").pop(),
        targetFormat: documents.targetFile?.name.split(".").pop(),
        mappings: mappings.finalMappings,
        metadata: {
          totalMappings: mappings.finalMappings.length,
          highConfidenceMappings: mappings.finalMappings.filter((m) => m.confidence >= 90).length,
          chatInteractions: mappings.chatHistory.length,
        },
      }

      // Simulate save delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Download configuration file
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${config.name}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSaveComplete(true)
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Save className="h-5 w-5" />
            <span>Save Mapping Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!saveComplete ? (
            <>
              {/* Configuration Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Configuration Name</label>
                  <Input
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder={generateConfigName()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this mapping configuration..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Configuration Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Source Format:</span>
                    <Badge variant="outline" className="ml-2">
                      {documents.sourceFile?.name.split(".").pop()?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Target Format:</span>
                    <Badge variant="outline" className="ml-2">
                      {documents.targetFile?.name.split(".").pop()?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Mappings:</span>
                    <span className="ml-2 font-medium">{mappings.finalMappings.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">High Confidence:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {mappings.finalMappings.filter((m) => m.confidence >= 90).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Chat Interactions:</span>
                    <span className="ml-2 font-medium">{mappings.chatHistory.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Mapping Preview */}
              <div className="space-y-3">
                <h3 className="font-medium">Field Mappings Preview</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {mappings.finalMappings.slice(0, 5).map((mapping, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white border rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono bg-blue-50 px-2 py-1 rounded">{mapping.sourceField}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-xs font-mono bg-green-50 px-2 py-1 rounded">{mapping.targetField}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {mapping.transformation}
                      </Badge>
                    </div>
                  ))}
                  {mappings.finalMappings.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      ... and {mappings.finalMappings.length - 5} more mappings
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="text-center">
                <Button onClick={saveConfiguration} disabled={isSaving} size="lg">
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving Configuration...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save & Download Configuration
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Configuration Saved Successfully!</h3>
                <p className="text-gray-500 mt-1">Your mapping configuration has been saved and downloaded.</p>
              </div>

              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">What's Next?</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Use this configuration file to skip setup in future transformations</li>
                      <li>Share the configuration with team members</li>
                      <li>Modify and reuse for similar data transformations</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center space-x-4">
                <Button onClick={onStartNew} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start New Transformation
                </Button>
                <Button onClick={onComplete}>Complete Workflow</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {!saveComplete && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversion
          </Button>
        </div>
      )}
    </div>
  )
}
