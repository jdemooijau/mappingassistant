import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    console.log("=== Document Analysis API Started ===")

    // Parse form data
    let formData: FormData
    try {
      formData = await req.formData()
      console.log("FormData parsed successfully")
    } catch (error) {
      console.error("Failed to parse FormData:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse request data",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 },
      )
    }

    // Get uploaded files
    const sourceFile = formData.get("sourceFile") as File | null
    const targetFile = formData.get("targetFile") as File | null

    // Get specification files
    const sourceSpecs: File[] = []
    const targetSpecs: File[] = []

    // Extract spec files
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("sourceSpec") && value instanceof File) {
        sourceSpecs.push(value)
      }
      if (key.startsWith("targetSpec") && value instanceof File) {
        targetSpecs.push(value)
      }
    }

    console.log("Files received:", {
      sourceFile: sourceFile?.name,
      targetFile: targetFile?.name,
      sourceSpecs: sourceSpecs.map((f) => f.name),
      targetSpecs: targetSpecs.map((f) => f.name),
    })

    // Validate we have required files
    if (!sourceFile || !targetFile) {
      return NextResponse.json(
        {
          success: false,
          error: "Both source and target files must be provided",
        },
        { status: 400 },
      )
    }

    // Validate file sizes
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    for (const file of [sourceFile, targetFile, ...sourceSpecs, ...targetSpecs]) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" exceeds maximum size of 10MB`,
          },
          { status: 400 },
        )
      }
    }

    // Process documents
    const processedSourceDoc = await processDocumentBasic(sourceFile)
    const processedTargetDoc = await processDocumentBasic(targetFile)

    console.log("Documents processed successfully")

    // Generate mock analysis results
    const analysis = generateMockAnalysis(processedSourceDoc, processedTargetDoc)

    console.log("Analysis generated successfully")

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        analysis,
        sourceDocuments: [processedSourceDoc],
        targetDocuments: [processedTargetDoc],
        sourceFields: processedSourceDoc.dataPoints?.map((dp: any) => dp.field) || [],
        targetFields: processedTargetDoc.dataPoints?.map((dp: any) => dp.field) || [],
        mappings: analysis.field_mappings || [],
        confidence: 89,
        note: "Using mock analysis for demonstration",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN API ===")
    console.error("Error:", error)
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
        type: "unexpected_error",
      },
      { status: 500 },
    )
  }
}

// Basic document processing function
async function processDocumentBasic(file: File) {
  const id = Math.random().toString(36).substr(2, 9)
  const format = detectFormatBasic(file)

  console.log(`Processing document: ${file.name}, format: ${format}`)

  let content = ""
  let structure = { type: "text" as const }
  let dataPoints: any[] = []

  try {
    if (format === "csv") {
      content = await file.text()
      console.log(`File content read, length: ${content.length}`)
      structure = analyzeCSVStructure(content)
      dataPoints = extractCSVDataPoints(content)
    } else if (format === "json") {
      content = await file.text()
      const jsonData = JSON.parse(content)
      structure = { type: "hierarchical" as const }
      dataPoints = extractJSONDataPoints(jsonData)
    } else if (format === "txt") {
      content = await file.text()
      structure = { type: "text" as const }
      dataPoints = extractTextDataPoints(content)
    } else {
      // For other formats, create realistic field names based on file name
      content = `[${format.toUpperCase()} file - ${file.size} bytes]`
      structure = { type: "text" as const }
      dataPoints = createRealisticDataPoints(file.name, format)
    }

    return {
      id,
      name: file.name,
      format,
      content: content.substring(0, 1000), // Limit content size
      structure,
      dataPoints: dataPoints.slice(0, 10), // Limit data points
      metadata: {
        size: file.size,
        type: file.type,
      },
    }
  } catch (error) {
    console.error(`Error processing ${file.name}:`, error)
    // Return mock data if processing fails
    return {
      id,
      name: file.name,
      format,
      content: `[Error processing ${format.toUpperCase()} file]`,
      structure: { type: "text" as const },
      dataPoints: createRealisticDataPoints(file.name, format),
      metadata: {
        size: file.size,
        type: file.type,
      },
    }
  }
}

function detectFormatBasic(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase()
  const supportedFormats = ["csv", "txt", "json", "xml", "xlsx", "pdf", "docx"]

  if (extension && supportedFormats.includes(extension)) {
    return extension
  }

  // Fallback based on MIME type
  if (file.type.includes("csv")) return "csv"
  if (file.type.includes("json")) return "json"
  if (file.type.includes("xml")) return "xml"
  if (file.type.includes("text")) return "txt"

  return "txt" // Default fallback
}

function analyzeCSVStructure(content: string) {
  try {
    const lines = content.split("\n").filter((line) => line.trim())
    if (lines.length === 0) {
      return { type: "tabular" as const, columns: [], rows: 0 }
    }

    const firstLine = lines[0]
    const columns = firstLine.split(",").map((col) => col.trim().replace(/"/g, ""))

    return {
      type: "tabular" as const,
      columns,
      rows: Math.max(0, lines.length - 1),
    }
  } catch (error) {
    console.error("Error analyzing CSV structure:", error)
    return { type: "text" as const }
  }
}

function extractCSVDataPoints(content: string) {
  try {
    const lines = content.split("\n").filter((line) => line.trim())
    if (lines.length < 2) {
      return []
    }

    const headers = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
    const dataRows = lines.slice(1, 6) // Sample first 5 rows

    return headers.slice(0, 10).map((header) => {
      const sampleValues = dataRows
        .map((row) => {
          const values = row.split(",")
          const index = headers.indexOf(header)
          return index >= 0 ? values[index]?.trim().replace(/"/g, "") : ""
        })
        .filter(Boolean)
        .slice(0, 3)

      return {
        field: header,
        type: "string",
        sample_values: sampleValues,
        null_count: 0,
        unique_count: sampleValues.length,
      }
    })
  } catch (error) {
    console.error("Error extracting CSV data points:", error)
    return []
  }
}

function extractTextDataPoints(content: string) {
  try {
    const lines = content.split("\n").filter((line) => line.trim())

    // Try to detect structured data in text files
    if (lines.length > 0) {
      // Check if lines contain key-value pairs (e.g., "Name: John")
      const keyValuePattern = /^([^:]+):\s*(.+)$/
      const keyValueMatches = lines.filter((line) => keyValuePattern.test(line))

      if (keyValueMatches.length > 0 && keyValueMatches.length / lines.length > 0.5) {
        // If more than half the lines match key-value pattern, extract as fields
        return keyValueMatches
          .map((line) => {
            const match = line.match(keyValuePattern)
            if (match) {
              const [_, key, value] = match
              return {
                field: key.trim(),
                type: "string",
                sample_values: [value.trim()],
                null_count: 0,
                unique_count: 1,
              }
            }
            return null
          })
          .filter(Boolean)
      }
    }

    // Default text content field
    return [
      {
        field: "text_content",
        type: "string",
        sample_values: lines.slice(0, 3),
        null_count: 0,
        unique_count: lines.length,
      },
    ]
  } catch (error) {
    return []
  }
}

function extractJSONDataPoints(data: any) {
  try {
    const fields: any[] = []

    function traverse(obj: any, path = "") {
      if (fields.length >= 10) return // Limit fields

      if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        Object.keys(obj).forEach((key) => {
          const newPath = path ? `${path}.${key}` : key
          const value = obj[key]

          if (typeof value !== "object") {
            fields.push({
              field: newPath,
              type: typeof value,
              sample_values: [value],
              null_count: value == null ? 1 : 0,
              unique_count: 1,
            })
          } else if (value !== null) {
            traverse(value, newPath)
          }
        })
      } else if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
        // Handle array of objects - extract fields from first item
        traverse(obj[0], path)
      }
    }

    traverse(data)
    return fields
  } catch (error) {
    return []
  }
}

function createRealisticDataPoints(fileName: string, format: string) {
  // Create realistic field names based on file name
  const lowerFileName = fileName.toLowerCase()

  if (lowerFileName.includes("user") || lowerFileName.includes("customer")) {
    return [
      { field: "user_id", type: "string", sample_values: ["U1001", "U1002", "U1003"], null_count: 0, unique_count: 3 },
      { field: "first_name", type: "string", sample_values: ["John", "Jane", "Bob"], null_count: 0, unique_count: 3 },
      {
        field: "last_name",
        type: "string",
        sample_values: ["Smith", "Doe", "Johnson"],
        null_count: 0,
        unique_count: 3,
      },
      {
        field: "email",
        type: "string",
        sample_values: ["john@example.com", "jane@example.com"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "phone", type: "string", sample_values: ["555-1234", "555-5678"], null_count: 0, unique_count: 2 },
      { field: "address", type: "string", sample_values: ["123 Main St"], null_count: 0, unique_count: 1 },
      { field: "city", type: "string", sample_values: ["New York", "Boston"], null_count: 0, unique_count: 2 },
      { field: "country", type: "string", sample_values: ["USA", "Canada"], null_count: 0, unique_count: 2 },
    ]
  } else if (lowerFileName.includes("product") || lowerFileName.includes("item")) {
    return [
      { field: "product_id", type: "string", sample_values: ["P100", "P101", "P102"], null_count: 0, unique_count: 3 },
      { field: "name", type: "string", sample_values: ["Laptop", "Phone", "Tablet"], null_count: 0, unique_count: 3 },
      {
        field: "description",
        type: "string",
        sample_values: ["High-performance laptop"],
        null_count: 0,
        unique_count: 1,
      },
      { field: "price", type: "number", sample_values: ["999.99", "499.99"], null_count: 0, unique_count: 2 },
      {
        field: "category",
        type: "string",
        sample_values: ["Electronics", "Computers"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "stock", type: "number", sample_values: ["45", "23", "12"], null_count: 0, unique_count: 3 },
      { field: "manufacturer", type: "string", sample_values: ["Dell", "Apple"], null_count: 0, unique_count: 2 },
    ]
  } else if (lowerFileName.includes("order") || lowerFileName.includes("transaction")) {
    return [
      { field: "order_id", type: "string", sample_values: ["ORD-001", "ORD-002"], null_count: 0, unique_count: 2 },
      { field: "customer_id", type: "string", sample_values: ["C5001", "C5002"], null_count: 0, unique_count: 2 },
      {
        field: "order_date",
        type: "string",
        sample_values: ["2023-01-15", "2023-01-16"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "total_amount", type: "number", sample_values: ["1299.99", "899.50"], null_count: 0, unique_count: 2 },
      {
        field: "payment_method",
        type: "string",
        sample_values: ["Credit Card", "PayPal"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "status", type: "string", sample_values: ["Shipped", "Processing"], null_count: 0, unique_count: 2 },
      { field: "shipping_address", type: "string", sample_values: ["456 Oak St"], null_count: 0, unique_count: 1 },
    ]
  } else if (lowerFileName.includes("employee") || lowerFileName.includes("staff")) {
    return [
      { field: "employee_id", type: "string", sample_values: ["E001", "E002", "E003"], null_count: 0, unique_count: 3 },
      { field: "name", type: "string", sample_values: ["Alice Smith", "Bob Jones"], null_count: 0, unique_count: 2 },
      {
        field: "department",
        type: "string",
        sample_values: ["Engineering", "Marketing"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "position", type: "string", sample_values: ["Developer", "Manager"], null_count: 0, unique_count: 2 },
      {
        field: "hire_date",
        type: "string",
        sample_values: ["2020-03-15", "2019-11-01"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "salary", type: "number", sample_values: ["85000", "95000"], null_count: 0, unique_count: 2 },
      { field: "manager_id", type: "string", sample_values: ["E005", "E010"], null_count: 0, unique_count: 2 },
    ]
  } else {
    // Generic fields
    return [
      { field: "id", type: "string", sample_values: ["1001", "1002", "1003"], null_count: 0, unique_count: 3 },
      { field: "name", type: "string", sample_values: ["Item 1", "Item 2", "Item 3"], null_count: 0, unique_count: 3 },
      { field: "description", type: "string", sample_values: ["Description text"], null_count: 0, unique_count: 1 },
      {
        field: "created_at",
        type: "string",
        sample_values: ["2023-01-01", "2023-01-02"],
        null_count: 0,
        unique_count: 2,
      },
      {
        field: "updated_at",
        type: "string",
        sample_values: ["2023-02-01", "2023-02-02"],
        null_count: 0,
        unique_count: 2,
      },
      { field: "status", type: "string", sample_values: ["Active", "Inactive"], null_count: 0, unique_count: 2 },
    ]
  }
}

function generateMockAnalysis(sourceDoc: any, targetDoc: any) {
  // Extract field names from the documents
  const sourceFields = sourceDoc.dataPoints?.map((dp: any) => dp.field) || []
  const targetFields = targetDoc.dataPoints?.map((dp: any) => dp.field) || []

  console.log("Source fields for mapping:", sourceFields)
  console.log("Target fields for mapping:", targetFields)

  // Generate field mappings based on actual fields
  const fieldMappings = []

  // Try to match fields with similar names
  for (let i = 0; i < sourceFields.length && fieldMappings.length < 10; i++) {
    const sourceField = sourceFields[i]

    // Find a matching target field
    let targetField = targetFields.find(
      (tf) =>
        tf.toLowerCase().includes(sourceField.toLowerCase()) || sourceField.toLowerCase().includes(tf.toLowerCase()),
    )

    // If no match found but we have a target field at the same index, use that
    if (!targetField && i < targetFields.length) {
      targetField = targetFields[i]
    }

    if (targetField) {
      // Calculate confidence based on name similarity
      let confidence = 0.7 // Base confidence

      if (sourceField.toLowerCase() === targetField.toLowerCase()) {
        confidence = 0.98 // Exact match
      } else if (
        sourceField.toLowerCase().includes(targetField.toLowerCase()) ||
        targetField.toLowerCase().includes(sourceField.toLowerCase())
      ) {
        confidence = 0.9 // Partial match
      } else if (sourceField.toLowerCase().replace(/[_-]/g, "") === targetField.toLowerCase().replace(/[_-]/g, "")) {
        confidence = 0.95 // Match ignoring separators
      }

      // Determine transformation type
      let transformationType = "direct_mapping"
      if (sourceField.toLowerCase() !== targetField.toLowerCase()) {
        if (sourceField.includes("_") && !targetField.includes("_")) {
          transformationType = "format_standardization"
        } else if (!sourceField.includes("_") && targetField.includes("_")) {
          transformationType = "format_standardization"
        } else if (sourceField.toLowerCase() === targetField.toLowerCase()) {
          transformationType = "case_normalization"
        }
      }

      fieldMappings.push({
        source_field: sourceField,
        target_field: targetField,
        transformation_type: transformationType,
        confidence,
        reasoning: `Field name similarity suggests a mapping between ${sourceField} and ${targetField}`,
        transformation_logic: `${sourceField} -> ${targetField}`,
        potential_issues: confidence < 0.8 ? ["Verify field data types match"] : [],
      })
    }
  }

  // If we couldn't generate any mappings, create some default ones
  if (fieldMappings.length === 0 && sourceFields.length > 0 && targetFields.length > 0) {
    // Map at least a few fields
    const minLength = Math.min(sourceFields.length, targetFields.length, 5)
    for (let i = 0; i < minLength; i++) {
      fieldMappings.push({
        source_field: sourceFields[i],
        target_field: targetFields[i],
        transformation_type: "direct_mapping",
        confidence: 0.7,
        reasoning: "Position-based mapping suggestion",
        transformation_logic: `${sourceFields[i]} -> ${targetFields[i]}`,
        potential_issues: ["Verify field data types and semantics match"],
      })
    }
  }

  return {
    document_summary: {
      source_document: sourceDoc.name,
      target_document: targetDoc.name,
      compatibility_score: 0.85,
      overall_complexity: "medium",
    },
    field_mappings: fieldMappings,
    data_quality_issues: [
      {
        type: "missing_values",
        field: sourceFields[0] || "unknown",
        severity: "low",
        description: "Some records may have missing values",
      },
    ],
    transformation_strategy: {
      approach: "direct_mapping_with_validation",
      estimated_effort: "medium",
      recommended_tools: ["Data validation", "Field mapping engine"],
      implementation_steps: [
        "Review and validate field mappings",
        "Implement data type conversions",
        "Add value mapping for specific fields",
        "Test transformation with sample data",
        "Deploy and monitor",
      ],
    },
    recommendations: [
      "Review the suggested field mappings for accuracy",
      "Validate data types match between source and target",
      "Consider implementing data quality checks",
      "Test transformation with a sample dataset first",
      "Monitor transformation results for data integrity",
    ],
  }
}
