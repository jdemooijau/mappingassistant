import { MappingCommandParser, type MappingCommand } from "@/lib/mapping-commands"
import { useMappingStore, type DynamicMapping } from "@/lib/mapping-store"

export interface AIProcessingResult {
  success: boolean
  message: string
  appliedChanges: MappingChange[]
  suggestions?: string[]
  needsClarification?: boolean
  clarificationQuestion?: string
}

export interface MappingChange {
  type: "created" | "updated" | "deleted" | "modified"
  mappingId?: string
  sourceField: string
  targetField?: string
  details: string
}

export class AIMappingProcessor {
  private static instance: AIMappingProcessor
  private processingQueue: string[] = []
  private isProcessing = false

  static getInstance(): AIMappingProcessor {
    if (!this.instance) {
      this.instance = new AIMappingProcessor()
    }
    return this.instance
  }

  async processUserInstruction(
    instruction: string,
    context: {
      sourceFields: string[]
      targetFields: string[]
      currentMappings: DynamicMapping[]
      conversationHistory?: Array<{ role: string; content: string }>
    },
  ): Promise<AIProcessingResult> {
    // Add to processing queue
    this.processingQueue.push(instruction)

    if (this.isProcessing) {
      return {
        success: false,
        message: "Processing previous instruction, please wait...",
        appliedChanges: [],
      }
    }

    this.isProcessing = true

    try {
      const result = await this.processInstruction(instruction, context)
      this.processingQueue = this.processingQueue.filter((i) => i !== instruction)
      return result
    } finally {
      this.isProcessing = false

      // Process next instruction in queue if any
      if (this.processingQueue.length > 0) {
        const nextInstruction = this.processingQueue[0]
        setTimeout(() => {
          this.processUserInstruction(nextInstruction, context)
        }, 100)
      }
    }
  }

  private async processInstruction(
    instruction: string,
    context: {
      sourceFields: string[]
      targetFields: string[]
      currentMappings: DynamicMapping[]
      conversationHistory?: Array<{ role: string; content: string }>
    },
  ): Promise<AIProcessingResult> {
    const { sourceFields, targetFields, currentMappings } = context

    // First, try direct command parsing
    const parseResult = MappingCommandParser.parseCommand(instruction, {
      source: sourceFields,
      target: targetFields,
    })

    if (parseResult.command && parseResult.confidence > 0.6) {
      return await this.executeCommand(parseResult.command, currentMappings)
    }

    // If direct parsing fails, try AI-enhanced interpretation
    return await this.aiEnhancedProcessing(instruction, context)
  }

  private async executeCommand(
    command: MappingCommand,
    currentMappings: DynamicMapping[],
  ): Promise<AIProcessingResult> {
    const store = useMappingStore.getState()
    const appliedChanges: MappingChange[] = []

    try {
      switch (command.type) {
        case "create":
          if (command.sourceField && command.targetField) {
            const existingMapping = currentMappings.find(
              (m) => m.source_field === command.sourceField && m.status === "active",
            )

            if (existingMapping) {
              // Update existing mapping
              store.updateMapping(existingMapping.id, {
                target_field: command.targetField,
                user_command: command.originalCommand,
                reasoning: `Updated via AI command: "${command.originalCommand}"`,
              })

              appliedChanges.push({
                type: "updated",
                mappingId: existingMapping.id,
                sourceField: command.sourceField,
                targetField: command.targetField,
                details: `Updated mapping from ${existingMapping.target_field} to ${command.targetField}`,
              })

              return {
                success: true,
                message: `✅ Updated mapping: ${command.sourceField} → ${command.targetField}`,
                appliedChanges,
              }
            } else {
              // Create new mapping
              const newMappingId = store.addMapping({
                source_field: command.sourceField,
                target_field: command.targetField,
                transformation_type: "direct_mapping",
                confidence: 0.85,
                reasoning: `AI-created mapping via command: "${command.originalCommand}"`,
                transformation_logic: `${command.sourceField} -> ${command.targetField}`,
                potential_issues: [],
                status: "active",
                user_modified: true,
                user_command: command.originalCommand,
              })

              appliedChanges.push({
                type: "created",
                mappingId: newMappingId,
                sourceField: command.sourceField,
                targetField: command.targetField,
                details: `Created new mapping`,
              })

              return {
                success: true,
                message: `✅ Created mapping: ${command.sourceField} → ${command.targetField}`,
                appliedChanges,
              }
            }
          }
          break

        case "delete":
          if (command.sourceField) {
            const existingMapping = currentMappings.find(
              (m) => m.source_field === command.sourceField && m.status === "active",
            )

            if (existingMapping) {
              store.removeMapping(existingMapping.id)

              appliedChanges.push({
                type: "deleted",
                mappingId: existingMapping.id,
                sourceField: command.sourceField,
                targetField: existingMapping.target_field,
                details: `Deleted mapping`,
              })

              return {
                success: true,
                message: `✅ Deleted mapping for: ${command.sourceField}`,
                appliedChanges,
              }
            } else {
              return {
                success: false,
                message: `❌ No mapping found for "${command.sourceField}"`,
                appliedChanges: [],
                suggestions: [`Available source fields: ${currentMappings.map((m) => m.source_field).join(", ")}`],
              }
            }
          }
          break

        case "modify_transformation":
          if (command.sourceField && command.transformationType) {
            const existingMapping = currentMappings.find(
              (m) => m.source_field === command.sourceField && m.status === "active",
            )

            if (existingMapping) {
              store.updateMapping(existingMapping.id, {
                transformation_type: command.transformationType as any,
                user_command: command.originalCommand,
                reasoning: `Transformation updated via AI: "${command.originalCommand}"`,
              })

              appliedChanges.push({
                type: "modified",
                mappingId: existingMapping.id,
                sourceField: command.sourceField,
                targetField: existingMapping.target_field,
                details: `Changed transformation to ${command.transformationType}`,
              })

              return {
                success: true,
                message: `✅ Updated transformation for ${command.sourceField} to ${command.transformationType}`,
                appliedChanges,
              }
            }
          }
          break

        case "set_confidence":
          if (command.sourceField && command.confidence !== undefined) {
            const existingMapping = currentMappings.find(
              (m) => m.source_field === command.sourceField && m.status === "active",
            )

            if (existingMapping) {
              store.updateMapping(existingMapping.id, {
                confidence: command.confidence,
                user_command: command.originalCommand,
              })

              appliedChanges.push({
                type: "modified",
                mappingId: existingMapping.id,
                sourceField: command.sourceField,
                targetField: existingMapping.target_field,
                details: `Set confidence to ${Math.round(command.confidence * 100)}%`,
              })

              return {
                success: true,
                message: `✅ Set confidence for ${command.sourceField} to ${Math.round(command.confidence * 100)}%`,
                appliedChanges,
              }
            }
          }
          break
      }

      return {
        success: false,
        message: "❌ Could not execute command",
        appliedChanges: [],
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error executing command: ${error.message}`,
        appliedChanges: [],
      }
    }
  }

  private async aiEnhancedProcessing(
    instruction: string,
    context: {
      sourceFields: string[]
      targetFields: string[]
      currentMappings: DynamicMapping[]
      conversationHistory?: Array<{ role: string; content: string }>
    },
  ): Promise<AIProcessingResult> {
    // Try to extract multiple commands from complex instructions
    const multipleCommands = this.extractMultipleCommands(instruction, context)

    if (multipleCommands.length > 0) {
      const results: AIProcessingResult[] = []
      const allChanges: MappingChange[] = []

      for (const command of multipleCommands) {
        const result = await this.executeCommand(command, context.currentMappings)
        results.push(result)
        allChanges.push(...result.appliedChanges)
      }

      const successCount = results.filter((r) => r.success).length
      const totalCount = results.length

      return {
        success: successCount > 0,
        message: `✅ Applied ${successCount}/${totalCount} mapping changes`,
        appliedChanges: allChanges,
        suggestions: results.flatMap((r) => r.suggestions || []),
      }
    }

    // Try contextual interpretation
    return this.contextualInterpretation(instruction, context)
  }

  private extractMultipleCommands(
    instruction: string,
    context: { sourceFields: string[]; targetFields: string[] },
  ): MappingCommand[] {
    const commands: MappingCommand[] = []

    // Split by common separators
    const parts = instruction.split(/(?:,|\sand\s|\sthen\s|\salso\s)/i)

    for (const part of parts) {
      const parseResult = MappingCommandParser.parseCommand(part.trim(), {
        source: context.sourceFields,
        target: context.targetFields,
      })

      if (parseResult.command && parseResult.confidence > 0.5) {
        commands.push(parseResult.command)
      }
    }

    return commands
  }

  private contextualInterpretation(
    instruction: string,
    context: {
      sourceFields: string[]
      targetFields: string[]
      currentMappings: DynamicMapping[]
      conversationHistory?: Array<{ role: string; content: string }>
    },
  ): AIProcessingResult {
    const lowerInstruction = instruction.toLowerCase()

    // Pattern matching for common scenarios
    if (lowerInstruction.includes("all") && lowerInstruction.includes("map")) {
      return this.handleBulkMapping(instruction, context)
    }

    if (lowerInstruction.includes("similar") || lowerInstruction.includes("like")) {
      return this.handleSimilarFieldMapping(instruction, context)
    }

    if (lowerInstruction.includes("remove") || lowerInstruction.includes("clear")) {
      return this.handleBulkRemoval(instruction, context)
    }

    // Check for field mentions without explicit commands
    const mentionedFields = this.extractFieldMentions(instruction, context.sourceFields, context.targetFields)

    if (mentionedFields.source.length > 0 && mentionedFields.target.length > 0) {
      return {
        success: false,
        message: `I detected fields but need clarification on the mapping action.`,
        appliedChanges: [],
        needsClarification: true,
        clarificationQuestion: `Do you want to map ${mentionedFields.source.join(", ")} to ${mentionedFields.target.join(", ")}?`,
        suggestions: [
          `Try: "Map ${mentionedFields.source[0]} to ${mentionedFields.target[0]}"`,
          `Try: "Delete mapping for ${mentionedFields.source[0]}"`,
        ],
      }
    }

    return {
      success: false,
      message: "I couldn't understand that instruction. Please be more specific.",
      appliedChanges: [],
      suggestions: [
        'Try: "Map [source field] to [target field]"',
        'Try: "Delete mapping for [field name]"',
        'Try: "Map all customer fields to user fields"',
      ],
    }
  }

  private handleBulkMapping(
    instruction: string,
    context: { sourceFields: string[]; targetFields: string[] },
  ): AIProcessingResult {
    // Simple bulk mapping based on field name similarity
    const store = useMappingStore.getState()
    const appliedChanges: MappingChange[] = []

    let mappedCount = 0
    const maxMappings = 5 // Limit bulk operations

    for (const sourceField of context.sourceFields.slice(0, maxMappings)) {
      const bestMatch = this.findBestFieldMatch(sourceField, context.targetFields)
      if (bestMatch.score > 0.6) {
        const mappingId = store.addMapping({
          source_field: sourceField,
          target_field: bestMatch.field,
          transformation_type: "direct_mapping",
          confidence: bestMatch.score,
          reasoning: `Bulk mapping via AI: "${instruction}"`,
          transformation_logic: `${sourceField} -> ${bestMatch.field}`,
          potential_issues: [],
          status: "active",
          user_modified: true,
          user_command: instruction,
        })

        appliedChanges.push({
          type: "created",
          mappingId,
          sourceField,
          targetField: bestMatch.field,
          details: `Auto-mapped based on similarity`,
        })

        mappedCount++
      }
    }

    return {
      success: mappedCount > 0,
      message: `✅ Created ${mappedCount} automatic mappings`,
      appliedChanges,
    }
  }

  private handleSimilarFieldMapping(
    instruction: string,
    context: { sourceFields: string[]; targetFields: string[]; currentMappings: DynamicMapping[] },
  ): AIProcessingResult {
    // Find fields mentioned in the instruction
    const mentionedFields = this.extractFieldMentions(instruction, context.sourceFields, context.targetFields)

    if (mentionedFields.source.length === 0) {
      return {
        success: false,
        message: "Please specify which field you want to find similar mappings for.",
        appliedChanges: [],
      }
    }

    const referenceField = mentionedFields.source[0]
    const similarFields = context.sourceFields.filter((field) => {
      const similarity = this.calculateFieldSimilarity(referenceField, field)
      return similarity > 0.6 && field !== referenceField
    })

    if (similarFields.length === 0) {
      return {
        success: false,
        message: `No similar fields found for "${referenceField}"`,
        appliedChanges: [],
      }
    }

    return {
      success: false,
      message: `Found similar fields: ${similarFields.join(", ")}`,
      appliedChanges: [],
      needsClarification: true,
      clarificationQuestion: `Should I create mappings for these similar fields: ${similarFields.join(", ")}?`,
    }
  }

  private handleBulkRemoval(instruction: string, context: { currentMappings: DynamicMapping[] }): AIProcessingResult {
    const store = useMappingStore.getState()
    const appliedChanges: MappingChange[] = []

    // Remove all mappings or specific ones based on instruction
    const mappingsToRemove = context.currentMappings.filter((m) => m.status === "active")

    for (const mapping of mappingsToRemove) {
      store.removeMapping(mapping.id)
      appliedChanges.push({
        type: "deleted",
        mappingId: mapping.id,
        sourceField: mapping.source_field,
        targetField: mapping.target_field,
        details: "Bulk removal",
      })
    }

    return {
      success: appliedChanges.length > 0,
      message: `✅ Removed ${appliedChanges.length} mappings`,
      appliedChanges,
    }
  }

  private extractFieldMentions(
    instruction: string,
    sourceFields: string[],
    targetFields: string[],
  ): { source: string[]; target: string[] } {
    const mentionedSource: string[] = []
    const mentionedTarget: string[] = []

    const instructionLower = instruction.toLowerCase()

    sourceFields.forEach((field) => {
      if (instructionLower.includes(field.toLowerCase())) {
        mentionedSource.push(field)
      }
    })

    targetFields.forEach((field) => {
      if (instructionLower.includes(field.toLowerCase())) {
        mentionedTarget.push(field)
      }
    })

    return { source: mentionedSource, target: mentionedTarget }
  }

  private findBestFieldMatch(sourceField: string, targetFields: string[]): { field: string; score: number } {
    let bestMatch = targetFields[0]
    let bestScore = 0

    targetFields.forEach((targetField) => {
      const score = this.calculateFieldSimilarity(sourceField, targetField)
      if (score > bestScore) {
        bestScore = score
        bestMatch = targetField
      }
    })

    return { field: bestMatch, score: bestScore }
  }

  private calculateFieldSimilarity(field1: string, field2: string): number {
    const f1 = field1.toLowerCase().replace(/[_-]/g, "")
    const f2 = field2.toLowerCase().replace(/[_-]/g, "")

    if (f1 === f2) return 1.0
    if (f1.includes(f2) || f2.includes(f1)) return 0.8

    const commonWords = ["id", "name", "email", "phone", "address", "date", "time", "user", "customer", "order"]
    for (const word of commonWords) {
      if (f1.includes(word) && f2.includes(word)) return 0.6
    }

    return 0
  }
}
