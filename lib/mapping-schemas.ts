import { z } from "zod"

export const DataTypeSchema = z.enum(["string", "number", "date", "boolean", "object", "array"])

export const TransformationTypeSchema = z.enum([
  "direct_mapping",
  "data_type_conversion",
  "format_standardization",
  "value_normalization",
  "field_combination",
  "field_splitting",
  "lookup_transformation",
  "conditional_mapping",
  "aggregation",
  "filtering",
])

export const MappingSuggestionSchema = z.object({
  source_field: z.string(),
  target_field: z.string(),
  transformation_type: TransformationTypeSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  transformation_logic: z.string(),
  potential_issues: z.array(z.string()),
  sample_transformation: z
    .object({
      input: z.any(),
      output: z.any(),
    })
    .optional(),
})

export const DataQualityIssueSchema = z.object({
  field: z.string(),
  issue_type: z.enum(["missing_values", "inconsistent_format", "data_type_mismatch", "duplicate_values", "outliers"]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string(),
  suggested_fix: z.string(),
  affected_records: z.number(),
})

export const MappingAnalysisSchema = z.object({
  document_summary: z.object({
    source_document: z.string(),
    target_document: z.string().optional(),
    compatibility_score: z.number().min(0).max(1),
    overall_complexity: z.enum(["low", "medium", "high"]),
  }),
  field_mappings: z.array(MappingSuggestionSchema),
  data_quality_issues: z.array(DataQualityIssueSchema),
  transformation_strategy: z.object({
    approach: z.enum(["direct_mapping", "schema_evolution", "data_warehouse", "etl_pipeline"]),
    estimated_effort: z.enum(["low", "medium", "high"]),
    recommended_tools: z.array(z.string()),
    implementation_steps: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
})

export type MappingAnalysis = z.infer<typeof MappingAnalysisSchema>
export type MappingSuggestion = z.infer<typeof MappingSuggestionSchema>
export type DataQualityIssue = z.infer<typeof DataQualityIssueSchema>
