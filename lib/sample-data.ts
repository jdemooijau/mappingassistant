import type { MappingSuggestion } from "@/lib/mapping-schemas"

export const generateSampleMappings = (sourceFields: string[], targetFields: string[]): MappingSuggestion[] => {
  const mappings: MappingSuggestion[] = []

  // Create some intelligent mappings based on field name similarity
  sourceFields.forEach((sourceField, index) => {
    // Find the best matching target field
    let bestMatch = targetFields[0]
    let bestScore = 0

    targetFields.forEach((targetField) => {
      const score = calculateFieldSimilarity(sourceField, targetField)
      if (score > bestScore) {
        bestScore = score
        bestMatch = targetField
      }
    })

    // Only create mapping if there's a reasonable match or for demonstration
    if (bestScore > 0.3 || index < 3) {
      mappings.push({
        source_field: sourceField,
        target_field: bestMatch,
        transformation_type: getTransformationType(sourceField, bestMatch),
        confidence: Math.max(0.6, bestScore),
        reasoning: `Field name similarity suggests mapping ${sourceField} to ${bestMatch}`,
        transformation_logic: `${sourceField} -> ${bestMatch}`,
        potential_issues: generatePotentialIssues(sourceField, bestMatch),
        sample_transformation: {
          input: generateSampleValue(sourceField),
          output: generateSampleValue(bestMatch),
        },
      })
    }
  })

  return mappings
}

function calculateFieldSimilarity(field1: string, field2: string): number {
  const f1 = field1.toLowerCase().replace(/[_-]/g, "")
  const f2 = field2.toLowerCase().replace(/[_-]/g, "")

  // Exact match
  if (f1 === f2) return 1.0

  // Contains match
  if (f1.includes(f2) || f2.includes(f1)) return 0.8

  // Common prefixes/suffixes
  const commonWords = ["id", "name", "email", "phone", "address", "date", "time", "user", "customer", "order"]
  for (const word of commonWords) {
    if (f1.includes(word) && f2.includes(word)) return 0.6
  }

  // Levenshtein distance
  const distance = levenshteinDistance(f1, f2)
  const maxLength = Math.max(f1.length, f2.length)
  return Math.max(0, 1 - distance / maxLength)
}

function getTransformationType(sourceField: string, targetField: string): MappingSuggestion["transformation_type"] {
  const source = sourceField.toLowerCase()
  const target = targetField.toLowerCase()

  if (source.includes("date") || target.includes("date")) return "format_standardization"
  if (source.includes("phone") || target.includes("phone")) return "format_standardization"
  if (source.includes("email") || target.includes("email")) return "value_normalization"
  if (source.includes("name") && target.includes("name")) return "value_normalization"
  if (source.includes("id") && target.includes("id")) return "direct_mapping"

  return "direct_mapping"
}

function generatePotentialIssues(sourceField: string, targetField: string): string[] {
  const issues: string[] = []

  if (sourceField.toLowerCase().includes("date") && !targetField.toLowerCase().includes("date")) {
    issues.push("Date format conversion may be required")
  }

  if (sourceField.toLowerCase().includes("phone") && !targetField.toLowerCase().includes("phone")) {
    issues.push("Phone number format standardization needed")
  }

  if (sourceField.length > targetField.length + 10) {
    issues.push("Source field may contain more data than target can accommodate")
  }

  return issues
}

function generateSampleValue(fieldName: string): any {
  const field = fieldName.toLowerCase()

  if (field.includes("id")) return Math.floor(Math.random() * 10000)
  if (field.includes("name")) return "John Doe"
  if (field.includes("email")) return "john.doe@example.com"
  if (field.includes("phone")) return "+1-555-123-4567"
  if (field.includes("date")) return "2024-01-15"
  if (field.includes("price") || field.includes("amount")) return 99.99
  if (field.includes("address")) return "123 Main St, City, State"

  return "Sample Value"
}

function levenshteinDistance(str1: string, str2: string): number {
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
