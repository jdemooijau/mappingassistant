"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Edit, Trash2, AlertTriangle, Zap, RefreshCw, Save, X } from "lucide-react"
import { useMappingStore, type DynamicMapping, type MappingConflict } from "@/lib/mapping-store"
import { MappingCommandParser } from "@/lib/mapping-commands"
import { MappingStatusIndicator } from "@/components/mapping-status-indicator"

interface DynamicMappingInterfaceProps {
  sourceFields: string[]
  targetFields: string[]
  onMappingChange?: (mappings: DynamicMapping[]) => void
}

export function DynamicMappingInterface({ sourceFields, targetFields, onMappingChange }: DynamicMappingInterfaceProps) {
  const {
    mappings,
    conflicts,
    updateMapping,
    addMapping,
    removeMapping,
    resolveConflict,
    validateMappings,
    exportMappings,
  } = useMappingStore()

  const [selectedMapping, setSelectedMapping] = useState<string | null>(null)
  const [editingMapping, setEditingMapping] = useState<DynamicMapping | null>(null)
  const [showConflictDialog, setShowConflictDialog] = useState<MappingConflict | null>(null)
  const [commandInput, setCommandInput] = useState("")
  const [commandResult, setCommandResult] = useState<any>(null)
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)

  useEffect(() => {
    if (onMappingChange) {
      onMappingChange(exportMappings())
    }
  }, [mappings, onMappingChange, exportMappings])

  const handleCommandSubmit = async () => {
    if (!commandInput.trim()) return

    setIsProcessingCommand(true)
    setCommandResult(null)

    try {
      const parseResult = MappingCommandParser.parseCommand(commandInput, {
        source: sourceFields,
        target: targetFields,
      })

      if (parseResult.command) {
        const { command } = parseResult

        switch (command.type) {
          case "create":
            if (command.sourceField && command.targetField) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                setCommandResult({
                  type: "conflict",
                  message: `Mapping for "${command.sourceField}" already exists. Update it instead?`,
                  action: () => {
                    updateMapping(existingMapping.id, {
                      target_field: command.targetField!,
                      user_command: commandInput,
                    })
                    setCommandInput("")
                    setCommandResult(null)
                  },
                })
              } else {
                const newMappingId = addMapping({
                  source_field: command.sourceField,
                  target_field: command.targetField,
                  transformation_type: "direct_mapping",
                  confidence: 0.8,
                  reasoning: `User-created mapping via command: "${commandInput}"`,
                  transformation_logic: `${command.sourceField} -> ${command.targetField}`,
                  potential_issues: [],
                  status: "active",
                  user_modified: true,
                  user_command: commandInput,
                })

                setCommandResult({
                  type: "success",
                  message: `Created mapping: ${command.sourceField} → ${command.targetField}`,
                })
                setCommandInput("")
              }
            }
            break

          case "update":
            if (command.sourceField && command.targetField) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                updateMapping(existingMapping.id, {
                  target_field: command.targetField,
                  user_command: commandInput,
                })
                setCommandResult({
                  type: "success",
                  message: `Updated mapping: ${command.sourceField} → ${command.targetField}`,
                })
                setCommandInput("")
              } else {
                setCommandResult({
                  type: "error",
                  message: `No existing mapping found for "${command.sourceField}"`,
                })
              }
            }
            break

          case "delete":
            if (command.sourceField) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                removeMapping(existingMapping.id)
                setCommandResult({
                  type: "success",
                  message: `Deleted mapping for "${command.sourceField}"`,
                })
                setCommandInput("")
              } else {
                setCommandResult({
                  type: "error",
                  message: `No mapping found for "${command.sourceField}"`,
                })
              }
            }
            break

          case "modify_transformation":
            if (command.sourceField && command.transformationType) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                updateMapping(existingMapping.id, {
                  transformation_type: command.transformationType as any,
                  user_command: commandInput,
                })
                setCommandResult({
                  type: "success",
                  message: `Updated transformation type for "${command.sourceField}" to "${command.transformationType}"`,
                })
                setCommandInput("")
              } else {
                setCommandResult({
                  type: "error",
                  message: `No mapping found for "${command.sourceField}"`,
                })
              }
            }
            break

          case "set_confidence":
            if (command.sourceField && command.confidence !== undefined) {
              const existingMapping = mappings.find(
                (m) => m.source_field === command.sourceField && m.status === "active",
              )

              if (existingMapping) {
                updateMapping(existingMapping.id, {
                  confidence: command.confidence,
                  user_command: commandInput,
                })
                setCommandResult({
                  type: "success",
                  message: `Updated confidence for "${command.sourceField}" to ${Math.round(command.confidence * 100)}%`,
                })
                setCommandInput("")
              } else {
                setCommandResult({
                  type: "error",
                  message: `No mapping found for "${command.sourceField}"`,
                })
              }
            }
            break

          default:
            setCommandResult({
              type: "error",
              message: "Command not recognized",
              suggestions: parseResult.suggestions,
            })
        }
      } else {
        setCommandResult({
          type: "error",
          message: "Could not parse command",
          suggestions: parseResult.suggestions,
        })
      }

      if (parseResult.ambiguities.length > 0) {
        setCommandResult((prev) => ({
          ...prev,
          ambiguities: parseResult.ambiguities,
          suggestions: parseResult.suggestions,
        }))
      }
    } catch (error) {
      setCommandResult({
        type: "error",
        message: "Error processing command",
      })
    } finally {
      setIsProcessingCommand(false)
    }
  }

  const handleEditMapping = (mapping: DynamicMapping) => {
    setEditingMapping({ ...mapping })
  }

  const handleSaveEdit = () => {
    if (editingMapping) {
      updateMapping(editingMapping.id, {
        source_field: editingMapping.source_field,
        target_field: editingMapping.target_field,
        transformation_type: editingMapping.transformation_type,
        confidence: editingMapping.confidence,
        reasoning: editingMapping.reasoning,
        transformation_logic: editingMapping.transformation_logic,
      })
      setEditingMapping(null)
    }
  }

  const getStatusColor = (status: DynamicMapping["status"]) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50 border-green-200"
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "conflict":
        return "text-red-600 bg-red-50 border-red-200"
      case "disabled":
        return "text-gray-600 bg-gray-50 border-gray-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const activeMappings = mappings.filter((m) => m.status === "active")
  const conflictMappings = mappings.filter((m) => m.status === "conflict")

  return (
    <div className="space-y-6">
      <MappingStatusIndicator />
      {/* Command Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-[#1a365d]">
            <Zap className="mr-2 h-5 w-5" />
            AI Mapping Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Try: 'Map customer_id to user_id' or 'Delete mapping for old_field'"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleCommandSubmit()
                }
              }}
              disabled={isProcessingCommand}
            />
            <Button
              onClick={handleCommandSubmit}
              disabled={!commandInput.trim() || isProcessingCommand}
              className="bg-[#1a365d] hover:bg-[#2d3748]"
            >
              {isProcessingCommand ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            </Button>
          </div>

          {commandResult && (
            <div
              className={`p-3 rounded border ${
                commandResult.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : commandResult.type === "conflict"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{commandResult.message}</p>
                  {commandResult.ambiguities && (
                    <ul className="mt-1 text-sm list-disc list-inside">
                      {commandResult.ambiguities.map((ambiguity: string, index: number) => (
                        <li key={index}>{ambiguity}</li>
                      ))}
                    </ul>
                  )}
                  {commandResult.suggestions && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Suggestions:</p>
                      <ul className="text-sm list-disc list-inside">
                        {commandResult.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {commandResult.action && (
                    <Button size="sm" onClick={commandResult.action} variant="outline">
                      Apply
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setCommandResult(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Example commands:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>"Map customer_name to user_name"</li>
              <li>"Delete mapping for old_field"</li>
              <li>"Change transformation for price to data_type_conversion"</li>
              <li>"Set confidence for email to 95%"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Mapping Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="p-3 bg-white border border-red-200 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-red-800">{conflict.description}</p>
                      <p className="text-sm text-red-600 mt-1">{conflict.suggested_resolution}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowConflictDialog(conflict)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappings Display */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Mappings ({activeMappings.length})</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts ({conflictMappings.length})</TabsTrigger>
          <TabsTrigger value="all">All Mappings ({mappings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {activeMappings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No active mappings. Use AI commands to create mappings.</p>
              </CardContent>
            </Card>
          ) : (
            activeMappings.map((mapping) => (
              <Card
                key={mapping.id}
                className={`cursor-pointer transition-colors ${
                  selectedMapping === mapping.id ? "border-[#1a365d] bg-blue-50" : "hover:border-gray-300"
                }`}
                onClick={() => setSelectedMapping(selectedMapping === mapping.id ? null : mapping.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-[#1a365d]">
                        {mapping.source_field}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Badge variant="outline" className="text-[#0f766e]">
                        {mapping.target_field}
                      </Badge>
                      {mapping.user_modified && (
                        <Badge variant="secondary" className="text-xs">
                          User Modified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(mapping.status)}>{mapping.status}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditMapping(mapping)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeMapping(mapping.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedMapping === mapping.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-[#1a365d] mb-1">Transformation</h4>
                          <Badge variant="secondary">{mapping.transformation_type.replace("_", " ")}</Badge>
                        </div>
                        <div>
                          <h4 className="font-medium text-[#1a365d] mb-1">Last Updated</h4>
                          <p className="text-sm text-gray-600">{new Date(mapping.updated_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#1a365d] mb-1">Reasoning</h4>
                        <p className="text-sm text-gray-600">{mapping.reasoning}</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#1a365d] mb-1">Transformation Logic</h4>
                        <code className="text-sm bg-gray-100 p-2 rounded block">{mapping.transformation_logic}</code>
                      </div>

                      {mapping.user_command && (
                        <div>
                          <h4 className="font-medium text-[#1a365d] mb-1">User Command</h4>
                          <p className="text-sm text-gray-600 italic">"{mapping.user_command}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-3">
          {conflictMappings.map((mapping) => (
            <Card key={mapping.id} className="border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-red-600">
                      {mapping.source_field}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <Badge variant="outline" className="text-red-600">
                      {mapping.target_field}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="text-red-600 bg-red-50 border-red-200">conflict</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleEditMapping(mapping)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {mapping.conflict_reason && <p className="text-sm text-red-600 mt-2">{mapping.conflict_reason}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {mappings.map((mapping) => (
            <Card key={mapping.id} className={mapping.status === "conflict" ? "border-red-200" : ""}>
              <CardContent className="p-4">
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
                    <Badge className={getStatusColor(mapping.status)}>{mapping.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit Mapping Dialog */}
      {editingMapping && (
        <Dialog open={!!editingMapping} onOpenChange={() => setEditingMapping(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Mapping</DialogTitle>
              <DialogDescription>Modify the mapping configuration</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Source Field</label>
                  <Select
                    value={editingMapping.source_field}
                    onValueChange={(value) => setEditingMapping({ ...editingMapping, source_field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Target Field</label>
                  <Select
                    value={editingMapping.target_field}
                    onValueChange={(value) => setEditingMapping({ ...editingMapping, target_field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Transformation Type</label>
                <Select
                  value={editingMapping.transformation_type}
                  onValueChange={(value) => setEditingMapping({ ...editingMapping, transformation_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_mapping">Direct Mapping</SelectItem>
                    <SelectItem value="data_type_conversion">Data Type Conversion</SelectItem>
                    <SelectItem value="format_standardization">Format Standardization</SelectItem>
                    <SelectItem value="value_normalization">Value Normalization</SelectItem>
                    <SelectItem value="field_combination">Field Combination</SelectItem>
                    <SelectItem value="field_splitting">Field Splitting</SelectItem>
                    <SelectItem value="lookup_transformation">Lookup Transformation</SelectItem>
                    <SelectItem value="conditional_mapping">Conditional Mapping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Reasoning</label>
                <Textarea
                  value={editingMapping.reasoning}
                  onChange={(e) => setEditingMapping({ ...editingMapping, reasoning: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Transformation Logic</label>
                <Textarea
                  value={editingMapping.transformation_logic}
                  onChange={(e) => setEditingMapping({ ...editingMapping, transformation_logic: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMapping(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="bg-[#1a365d] hover:bg-[#2d3748]">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && (
        <Dialog open={!!showConflictDialog} onOpenChange={() => setShowConflictDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Mapping Conflict</DialogTitle>
              <DialogDescription>{showConflictDialog.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <strong>Suggested Resolution:</strong> {showConflictDialog.suggested_resolution}
              </p>

              <div className="space-y-2">
                <h4 className="font-medium">Affected Mappings:</h4>
                {showConflictDialog.affected_mappings.map((mappingId) => {
                  const mapping = mappings.find((m) => m.id === mappingId)
                  return mapping ? (
                    <div key={mappingId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <Badge variant="outline">{mapping.source_field}</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="outline">{mapping.target_field}</Badge>
                    </div>
                  ) : null
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resolveConflict(showConflictDialog.id, "reject")
                  setShowConflictDialog(null)
                }}
              >
                Disable Conflicting
              </Button>
              <Button
                onClick={() => {
                  resolveConflict(showConflictDialog.id, "accept")
                  setShowConflictDialog(null)
                }}
                className="bg-[#1a365d] hover:bg-[#2d3748]"
              >
                Accept As-Is
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
