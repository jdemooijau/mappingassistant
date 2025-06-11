"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Edit, Trash2, Database, Target } from "lucide-react"

interface MappingVisualizationProps {
  sourceFields: string[]
  targetFields: string[]
  currentMappings: any[]
  onMappingUpdate: (mappings: any[]) => void
}

export function MappingVisualization({
  sourceFields,
  targetFields,
  currentMappings,
  onMappingUpdate,
}: MappingVisualizationProps) {
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null)

  const getMappedTargetFields = () => {
    return currentMappings.map((m) => m.target_field)
  }

  const getMappedSourceFields = () => {
    return currentMappings.map((m) => m.source_field)
  }

  const getUnmappedSourceFields = () => {
    const mapped = getMappedSourceFields()
    return sourceFields.filter((field) => !mapped.includes(field))
  }

  const getUnmappedTargetFields = () => {
    const mapped = getMappedTargetFields()
    return targetFields.filter((field) => !mapped.includes(field))
  }

  return (
    <div className="space-y-6">
      {/* Mapping Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a365d]">Mapping Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#1a365d]">{currentMappings.length}</p>
              <p className="text-sm text-gray-600">Active Mappings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{getMappedSourceFields().length}</p>
              <p className="text-sm text-gray-600">Mapped Source Fields</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{getUnmappedSourceFields().length}</p>
              <p className="text-sm text-gray-600">Unmapped Source Fields</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{getUnmappedTargetFields().length}</p>
              <p className="text-sm text-gray-600">Available Target Fields</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Mapping Display */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Source Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#1a365d]">
              <Database className="mr-2 h-5 w-5" />
              Source Fields ({sourceFields.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {sourceFields.map((field) => {
              const isMapped = getMappedSourceFields().includes(field)
              const mapping = currentMappings.find((m) => m.source_field === field)

              return (
                <div
                  key={field}
                  className={`p-3 rounded border transition-colors ${
                    isMapped ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 hover:border-[#1a365d]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{field}</span>
                      {mapping && <div className="text-xs text-gray-600 mt-1">→ {mapping.target_field}</div>}
                    </div>
                    <div className="flex items-center space-x-1">
                      {isMapped ? (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          Mapped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600 text-xs">
                          Available
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Active Mappings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <ArrowRight className="mr-2 h-5 w-5" />
              Active Mappings ({currentMappings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {currentMappings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No active mappings</p>
                <p className="text-xs">Use the AI chat to create mappings</p>
              </div>
            ) : (
              currentMappings.map((mapping, index) => (
                <div
                  key={mapping.id || index}
                  className={`p-3 rounded border transition-colors cursor-pointer ${
                    selectedMapping === mapping.id
                      ? "border-[#1a365d] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedMapping(selectedMapping === mapping.id ? null : mapping.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-[#1a365d] text-xs">
                          {mapping.source_field}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <Badge variant="outline" className="text-[#0f766e] text-xs">
                          {mapping.target_field}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {mapping.transformation_type?.replace("_", " ") || "direct"}
                      </Badge>
                      <span className="text-xs text-gray-600">{Math.round((mapping.confidence || 0.8) * 100)}%</span>
                    </div>

                    {selectedMapping === mapping.id && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                        <p className="text-gray-600">{mapping.reasoning || "User-defined mapping"}</p>
                        {mapping.user_command && <p className="text-blue-600 italic mt-1">"{mapping.user_command}"</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Target Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#0f766e]">
              <Target className="mr-2 h-5 w-5" />
              Target Fields ({targetFields.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {targetFields.map((field) => {
              const isMapped = getMappedTargetFields().includes(field)
              const mapping = currentMappings.find((m) => m.target_field === field)

              return (
                <div
                  key={field}
                  className={`p-3 rounded border transition-colors ${
                    isMapped ? "bg-teal-50 border-teal-200" : "bg-gray-50 border-gray-200 hover:border-[#0f766e]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{field}</span>
                      {mapping && <div className="text-xs text-gray-600 mt-1">← {mapping.source_field}</div>}
                    </div>
                    <div className="flex items-center space-x-1">
                      {isMapped ? (
                        <Badge variant="outline" className="text-teal-600 text-xs">
                          Mapped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600 text-xs">
                          Available
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Unmapped Fields Summary */}
      {(getUnmappedSourceFields().length > 0 || getUnmappedTargetFields().length > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Unmapped Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {getUnmappedSourceFields().length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Unmapped Source Fields ({getUnmappedSourceFields().length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {getUnmappedSourceFields()
                      .slice(0, 10)
                      .map((field) => (
                        <Badge key={field} variant="outline" className="text-yellow-700 text-xs">
                          {field}
                        </Badge>
                      ))}
                    {getUnmappedSourceFields().length > 10 && (
                      <Badge variant="outline" className="text-yellow-700 text-xs">
                        +{getUnmappedSourceFields().length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {getUnmappedTargetFields().length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Available Target Fields ({getUnmappedTargetFields().length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {getUnmappedTargetFields()
                      .slice(0, 10)
                      .map((field) => (
                        <Badge key={field} variant="outline" className="text-yellow-700 text-xs">
                          {field}
                        </Badge>
                      ))}
                    {getUnmappedTargetFields().length > 10 && (
                      <Badge variant="outline" className="text-yellow-700 text-xs">
                        +{getUnmappedTargetFields().length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 text-sm text-yellow-700">
              💡 Use the AI chat to create mappings for these fields. Try: "Map {getUnmappedSourceFields()[0]} to{" "}
              {getUnmappedTargetFields()[0]}"
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
