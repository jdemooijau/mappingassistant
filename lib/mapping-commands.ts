export interface MappingCommand {
  type: "create" | "update" | "delete" | "modify_transformation" | "set_confidence" | "unknown"
  sourceField?: string
  targetField?: string
  transformationType?: string
  confidence?: number
  reasoning?: string
  mappingId?: string
  originalCommand: string
  parameters?: Record<string, any>
}

export interface CommandParseResult {
  command: MappingCommand | null
  confidence: number
  ambiguities: string[]
  suggestions: string[]
}

export class MappingCommandParser {
  private static readonly COMMAND_PATTERNS = [
    // Create mapping patterns
    {
      pattern: /map\s+(?:field\s+)?["`']?([^"`'\s]+)["`']?\s+to\s+["`']?([^"`'\s]+)["`']?/i,
      type: "create" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
        targetField: match[2],
      }),
    },
    {
      pattern: /create\s+(?:a\s+)?mapping\s+(?:from\s+)?["`']?([^"`'\s]+)["`']?\s+(?:to\s+)?["`']?([^"`'\s]+)["`']?/i,
      type: "create" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
        targetField: match[2],
      }),
    },
    {
      pattern: /connect\s+["`']?([^"`'\s]+)["`']?\s+(?:with|to)\s+["`']?([^"`'\s]+)["`']?/i,
      type: "create" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
        targetField: match[2],
      }),
    },

    // Update mapping patterns
    {
      pattern:
        /(?:update|change|modify)\s+(?:the\s+)?mapping\s+(?:for\s+)?["`']?([^"`'\s]+)["`']?\s+to\s+["`']?([^"`'\s]+)["`']?/i,
      type: "update" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
        targetField: match[2],
      }),
    },

    // Delete mapping patterns
    {
      pattern: /(?:delete|remove|unmap)\s+(?:the\s+)?mapping\s+(?:for\s+)?["`']?([^"`'\s]+)["`']?/i,
      type: "delete" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
      }),
    },

    // Transformation type patterns
    {
      pattern:
        /(?:set|change)\s+(?:the\s+)?transformation\s+(?:type\s+)?(?:for\s+)?["`']?([^"`'\s]+)["`']?\s+to\s+([a-z_]+)/i,
      type: "modify_transformation" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
        transformationType: match[2],
      }),
    },

    // Confidence patterns
    {
      pattern: /(?:set|change)\s+(?:the\s+)?confidence\s+(?:for\s+)?["`']?([^"`'\s]+)["`']?\s+to\s+(\d+(?:\.\d+)?)/i,
      type: "set_confidence" as const,
      extract: (match: RegExpMatchArray) => ({
        sourceField: match[1],
        confidence: Number.parseFloat(match[2]),
      }),
    },
  ]

  static parseCommand(command: string, availableFields: { source: string[]; target: string[] }): CommandParseResult {
    const normalizedCommand = command.trim().toLowerCase()

    for (const pattern of this.COMMAND_PATTERNS) {
      const match = normalizedCommand.match(pattern.pattern)
      if (match) {
        const extracted = pattern.extract(match)
        const ambiguities: string[] = []
        const suggestions: string[] = []

        // Validate field names and suggest corrections
        if (extracted.sourceField) {
          const exactMatch = availableFields.source.find((f) => f.toLowerCase() === extracted.sourceField.toLowerCase())
          if (exactMatch) {
            extracted.sourceField = exactMatch
          } else {
            const similarFields = this.findSimilarFields(extracted.sourceField, availableFields.source)
            if (similarFields.length > 0) {
              ambiguities.push(`Source field "${extracted.sourceField}" not found`)
              suggestions.push(`Did you mean: ${similarFields.join(", ")}?`)
            }
          }
        }

        if (extracted.targetField) {
          const exactMatch = availableFields.target.find((f) => f.toLowerCase() === extracted.targetField.toLowerCase())
          if (exactMatch) {
            extracted.targetField = exactMatch
          } else {
            const similarFields = this.findSimilarFields(extracted.targetField, availableFields.target)
            if (similarFields.length > 0) {
              ambiguities.push(`Target field "${extracted.targetField}" not found`)
              suggestions.push(`Did you mean: ${similarFields.join(", ")}?`)
            }
          }
        }

        // Validate confidence values
        if (extracted.confidence !== undefined) {
          if (extracted.confidence > 1) {
            extracted.confidence = extracted.confidence / 100 // Convert percentage to decimal
          }
          if (extracted.confidence < 0 || extracted.confidence > 1) {
            ambiguities.push("Confidence must be between 0 and 1 (or 0% and 100%)")
          }
        }

        const mappingCommand: MappingCommand = {
          type: pattern.type,
          originalCommand: command,
          ...extracted,
        }

        return {
          command: mappingCommand,
          confidence: ambiguities.length === 0 ? 0.9 : 0.6,
          ambiguities,
          suggestions,
        }
      }
    }

    // Try to extract field names even if pattern doesn't match
    const fieldMentions = this.extractFieldMentions(command, availableFields)
    if (fieldMentions.length > 0) {
      return {
        command: {
          type: "unknown",
          originalCommand: command,
        },
        confidence: 0.3,
        ambiguities: ["Command not recognized"],
        suggestions: [
          'Try: "Map [source field] to [target field]"',
          'Try: "Delete mapping for [field name]"',
          'Try: "Change transformation for [field] to [type]"',
          `Detected fields: ${fieldMentions.join(", ")}`,
        ],
      }
    }

    return {
      command: null,
      confidence: 0,
      ambiguities: ["No mapping command detected"],
      suggestions: [
        'Try: "Map field1 to field2"',
        'Try: "Delete mapping for field1"',
        'Try: "Update mapping for field1 to field3"',
      ],
    }
  }

  private static findSimilarFields(target: string, fields: string[]): string[] {
    const targetLower = target.toLowerCase()
    return fields
      .filter((field) => {
        const fieldLower = field.toLowerCase()
        return (
          fieldLower.includes(targetLower) ||
          targetLower.includes(fieldLower) ||
          this.levenshteinDistance(targetLower, fieldLower) <= 2
        )
      })
      .slice(0, 3) // Limit to top 3 suggestions
  }

  private static extractFieldMentions(
    command: string,
    availableFields: { source: string[]; target: string[] },
  ): string[] {
    const allFields = [...availableFields.source, ...availableFields.target]
    const mentions: string[] = []

    allFields.forEach((field) => {
      if (command.toLowerCase().includes(field.toLowerCase())) {
        mentions.push(field)
      }
    })

    return [...new Set(mentions)] // Remove duplicates
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
      }
    }

    return matrix[str2.length][str1.length]
  }
}
