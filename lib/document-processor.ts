import pdf from "pdf-parse"
import mammoth from "mammoth"
import * as XLSX from "xlsx"
import { parseString } from "xml2js"
import Papa from "papaparse"

export interface ProcessedDocument {
  id: string
  name: string
  type: string
  format: DocumentFormat
  content: string
  structure: DocumentStructure
  metadata: DocumentMetadata
  dataPoints: DataPoint[]
}

export interface DocumentStructure {
  type: "tabular" | "hierarchical" | "text" | "mixed"
  columns?: string[]
  rows?: number
  sections?: string[]
  nested_levels?: number
}

export interface DocumentMetadata {
  size: number
  encoding?: string
  created?: Date
  pages?: number
  sheets?: string[]
}

export interface DataPoint {
  field: string
  type: "string" | "number" | "date" | "boolean" | "object" | "array"
  sample_values: any[]
  null_count: number
  unique_count: number
  pattern?: string
}

export type DocumentFormat = "csv" | "txt" | "json" | "xml" | "xlsx" | "pdf" | "docx"

export class DocumentProcessor {
  async processDocument(file: File): Promise<ProcessedDocument> {
    try {
      const format = this.detectFormat(file)
      const id = Math.random().toString(36).substr(2, 9)

      let content = ""
      let structure: DocumentStructure = { type: "text" }
      let dataPoints: DataPoint[] = []
      let metadata: DocumentMetadata = { size: file.size, created: new Date(file.lastModified) }

      switch (format) {
        case "csv":
          ;({ content, structure, dataPoints } = await this.processCSV(file))
          break
        case "txt":
          ;({ content, structure, dataPoints } = await this.processTXT(file))
          break
        case "json":
          ;({ content, structure, dataPoints } = await this.processJSON(file))
          break
        case "xml":
          ;({ content, structure, dataPoints } = await this.processXML(file))
          break
        case "xlsx":
          ;({ content, structure, dataPoints, metadata } = await this.processXLSX(file))
          break
        case "pdf":
          ;({ content, structure, dataPoints, metadata } = await this.processPDF(file))
          break
        case "docx":
          ;({ content, structure, dataPoints } = await this.processDOCX(file))
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      return {
        id,
        name: file.name,
        type: file.type || `application/${format}`,
        format,
        content,
        structure,
        metadata,
        dataPoints,
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      throw new Error(`Failed to process ${file.name}: ${error.message}`)
    }
  }

  private detectFormat(file: File): DocumentFormat {
    const extension = file.name.split(".").pop()?.toLowerCase()
    const mimeType = file.type.toLowerCase()

    if (extension === "csv" || mimeType.includes("csv")) return "csv"
    if (extension === "txt" || mimeType.includes("text/plain")) return "txt"
    if (extension === "json" || mimeType.includes("json")) return "json"
    if (extension === "xml" || mimeType.includes("xml")) return "xml"
    if (extension === "xlsx" || mimeType.includes("spreadsheet") || extension === "xls") return "xlsx"
    if (extension === "pdf" || mimeType.includes("pdf")) return "pdf"
    if (extension === "docx" || mimeType.includes("wordprocessingml") || extension === "doc") return "docx"

    // Fallback to extension if mime type is not recognized
    if (extension === "csv") return "csv"
    if (extension === "txt") return "txt"
    if (extension === "json") return "json"
    if (extension === "xml") return "xml"
    if (extension === "xlsx" || extension === "xls") return "xlsx"
    if (extension === "pdf") return "pdf"
    if (extension === "docx" || extension === "doc") return "docx"

    throw new Error(`Unsupported file format: ${file.name}`)
  }

  private async processCSV(file: File) {
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        error: (error) => {
          throw new Error(`CSV parsing error: ${error.message}`)
        },
      })

      const columns = parsed.meta.fields || []
      const rows = parsed.data.length
      const dataPoints = this.analyzeTabularData(parsed.data, columns)

      return {
        content: text,
        structure: {
          type: "tabular" as const,
          columns,
          rows,
        },
        dataPoints,
      }
    } catch (error) {
      console.error("CSV processing error:", error)
      throw new Error(`CSV processing error: ${error.message}`)
    }
  }

  private async processTXT(file: File) {
    try {
      const content = await file.text()
      const lines = content.split("\n").filter((line) => line.trim())

      // Try to detect if it's structured text
      const isStructured = lines.some((line) => line.includes(":") || line.includes("=") || line.includes("\t"))

      const dataPoints = this.analyzeTextData(content)

      return {
        content,
        structure: {
          type: isStructured ? "mixed" : ("text" as const),
          sections: this.extractSections(content),
        },
        dataPoints,
      }
    } catch (error) {
      console.error("TXT processing error:", error)
      throw new Error(`TXT processing error: ${error.message}`)
    }
  }

  private async processJSON(file: File) {
    try {
      const text = await file.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error(`Invalid JSON format: ${parseError.message}`)
      }

      const dataPoints = this.analyzeJSONData(data)

      return {
        content: text,
        structure: {
          type: "hierarchical" as const,
          nested_levels: this.calculateNestingLevel(data),
        },
        dataPoints,
      }
    } catch (error) {
      console.error("JSON processing error:", error)
      throw new Error(`JSON processing error: ${error.message}`)
    }
  }

  private async processXML(file: File) {
    try {
      const text = await file.text()

      return new Promise<{ content: string; structure: DocumentStructure; dataPoints: DataPoint[] }>(
        (resolve, reject) => {
          parseString(text, (err, result) => {
            if (err) {
              reject(new Error(`XML parsing error: ${err.message}`))
              return
            }

            try {
              const dataPoints = this.analyzeJSONData(result) // XML parsed to JSON-like structure

              resolve({
                content: text,
                structure: {
                  type: "hierarchical" as const,
                  nested_levels: this.calculateNestingLevel(result),
                },
                dataPoints,
              })
            } catch (error) {
              reject(new Error(`XML analysis error: ${error.message}`))
            }
          })
        },
      )
    } catch (error) {
      console.error("XML processing error:", error)
      throw new Error(`XML processing error: ${error.message}`)
    }
  }

  private async processXLSX(file: File) {
    try {
      const buffer = await file.arrayBuffer()
      let workbook

      try {
        workbook = XLSX.read(buffer, { type: "array" })
      } catch (xlsxError) {
        throw new Error(`XLSX parsing error: ${xlsxError.message}`)
      }

      const sheetNames = workbook.SheetNames
      if (sheetNames.length === 0) {
        throw new Error("XLSX file contains no sheets")
      }

      const firstSheet = workbook.Sheets[sheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      if (jsonData.length === 0) {
        return {
          content: "",
          structure: {
            type: "tabular" as const,
            columns: [],
            rows: 0,
          },
          dataPoints: [],
          metadata: {
            size: file.size,
            sheets: sheetNames,
          },
        }
      }

      const headers = jsonData[0] as string[]
      const dataRows = jsonData.slice(1)
      const dataPoints = this.analyzeTabularData(
        dataRows.map((row) => {
          const obj: any = {}
          headers.forEach((header, index) => {
            if (header) {
              // Skip empty headers
              obj[header] = row[index]
            }
          })
          return obj
        }),
        headers.filter(Boolean), // Filter out empty headers
      )

      return {
        content: XLSX.utils.sheet_to_csv(firstSheet),
        structure: {
          type: "tabular" as const,
          columns: headers.filter(Boolean),
          rows: dataRows.length,
        },
        dataPoints,
        metadata: {
          size: file.size,
          sheets: sheetNames,
        },
      }
    } catch (error) {
      console.error("XLSX processing error:", error)
      throw new Error(`XLSX processing error: ${error.message}`)
    }
  }

  private async processPDF(file: File) {
    try {
      const buffer = await file.arrayBuffer()
      let data

      try {
        data = await pdf(Buffer.from(buffer))
      } catch (pdfError) {
        throw new Error(`PDF parsing error: ${pdfError.message}`)
      }

      const dataPoints = this.analyzeTextData(data.text)

      return {
        content: data.text,
        structure: {
          type: "text" as const,
          sections: this.extractSections(data.text),
        },
        dataPoints,
        metadata: {
          size: file.size,
          pages: data.numpages,
        },
      }
    } catch (error) {
      console.error("PDF processing error:", error)
      throw new Error(`PDF processing error: ${error.message}`)
    }
  }

  private async processDOCX(file: File) {
    try {
      const buffer = await file.arrayBuffer()
      let result

      try {
        result = await mammoth.extractRawText({ buffer })
      } catch (docxError) {
        throw new Error(`DOCX parsing error: ${docxError.message}`)
      }

      const dataPoints = this.analyzeTextData(result.value)

      return {
        content: result.value,
        structure: {
          type: "text" as const,
          sections: this.extractSections(result.value),
        },
        dataPoints,
      }
    } catch (error) {
      console.error("DOCX processing error:", error)
      throw new Error(`DOCX processing error: ${error.message}`)
    }
  }

  private analyzeTabularData(data: any[], columns: string[]): DataPoint[] {
    try {
      return columns
        .map((column) => {
          if (!column) return null // Skip empty column names

          const values = data.map((row) => row[column]).filter((val) => val != null)
          const uniqueValues = [...new Set(values)]

          return {
            field: column,
            type: this.inferDataType(values),
            sample_values: uniqueValues.slice(0, 5),
            null_count: data.length - values.length,
            unique_count: uniqueValues.length,
            pattern: this.detectPattern(values),
          }
        })
        .filter(Boolean) // Remove null entries
    } catch (error) {
      console.error("Error analyzing tabular data:", error)
      return [] // Return empty array on error
    }
  }

  private analyzeJSONData(data: any, prefix = ""): DataPoint[] {
    try {
      const dataPoints: DataPoint[] = []

      const traverse = (obj: any, path: string) => {
        if (!obj) return

        if (Array.isArray(obj)) {
          if (obj.length > 0) {
            dataPoints.push({
              field: path || "root",
              type: "array",
              sample_values: obj.slice(0, 3),
              null_count: 0,
              unique_count: obj.length,
            })

            // Analyze array elements if they're objects
            if (typeof obj[0] === "object" && obj[0] !== null) {
              traverse(obj[0], `${path}[0]`)
            }
          }
        } else if (typeof obj === "object" && obj !== null) {
          Object.keys(obj).forEach((key) => {
            const newPath = path ? `${path}.${key}` : key
            const value = obj[key]

            if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
              traverse(value, newPath)
            } else {
              dataPoints.push({
                field: newPath,
                type: this.inferDataType([value]),
                sample_values: [value],
                null_count: value == null ? 1 : 0,
                unique_count: 1,
                pattern: this.detectPattern([value]),
              })
            }
          })
        }
      }

      traverse(data, prefix)
      return dataPoints
    } catch (error) {
      console.error("Error analyzing JSON data:", error)
      return [] // Return empty array on error
    }
  }

  private analyzeTextData(text: string): DataPoint[] {
    try {
      if (!text || typeof text !== "string") {
        return []
      }

      const lines = text.split("\n").filter((line) => line.trim())
      const patterns = {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        date: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
        number: /\b\d+\.?\d*\b/g,
        url: /https?:\/\/[^\s]+/g,
      }

      const dataPoints: DataPoint[] = []

      Object.entries(patterns).forEach(([type, regex]) => {
        const matches = text.match(regex) || []
        if (matches.length > 0) {
          dataPoints.push({
            field: type,
            type: "string",
            sample_values: [...new Set(matches)].slice(0, 5),
            null_count: 0,
            unique_count: new Set(matches).size,
            pattern: regex.source,
          })
        }
      })

      return dataPoints
    } catch (error) {
      console.error("Error analyzing text data:", error)
      return [] // Return empty array on error
    }
  }

  private inferDataType(values: any[]): DataPoint["type"] {
    try {
      if (values.length === 0) return "string"

      const sample = values.filter((v) => v != null)
      if (sample.length === 0) return "string"

      // Check if all values are numbers
      if (sample.every((v) => !isNaN(Number(v)) && isFinite(Number(v)))) {
        return "number"
      }

      // Check if all values are booleans
      if (sample.every((v) => typeof v === "boolean" || v === "true" || v === "false")) {
        return "boolean"
      }

      // Check if all values are dates
      if (sample.every((v) => !isNaN(Date.parse(String(v))))) {
        return "date"
      }

      // Check if values are objects
      if (sample.every((v) => typeof v === "object" && v !== null)) {
        return "object"
      }

      return "string"
    } catch (error) {
      console.error("Error inferring data type:", error)
      return "string" // Default to string on error
    }
  }

  private detectPattern(values: any[]): string | undefined {
    try {
      if (values.length === 0) return undefined

      const stringValues = values.map((v) => String(v)).filter((v) => v)
      if (stringValues.length === 0) return undefined

      // Common patterns
      const patterns = [
        { name: "email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        { name: "phone", regex: /^\+?[\d\s\-()]+$/ },
        { name: "date", regex: /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/ },
        { name: "uuid", regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
      ]

      for (const pattern of patterns) {
        if (stringValues.every((v) => pattern.regex.test(v))) {
          return pattern.name
        }
      }

      return undefined
    } catch (error) {
      console.error("Error detecting pattern:", error)
      return undefined
    }
  }

  private extractSections(text: string): string[] {
    try {
      if (!text || typeof text !== "string") {
        return []
      }

      const lines = text.split("\n")
      const sections: string[] = []

      lines.forEach((line) => {
        const trimmed = line.trim()
        // Detect headers (lines that are short and followed by content)
        if (trimmed.length > 0 && trimmed.length < 100 && (trimmed.endsWith(":") || /^[A-Z\s]+$/.test(trimmed))) {
          sections.push(trimmed)
        }
      })

      return sections.slice(0, 10) // Limit to first 10 sections
    } catch (error) {
      console.error("Error extracting sections:", error)
      return [] // Return empty array on error
    }
  }

  private calculateNestingLevel(obj: any, level = 0): number {
    try {
      if (typeof obj !== "object" || obj === null) return level

      let maxLevel = level
      Object.values(obj).forEach((value) => {
        if (typeof value === "object" && value !== null) {
          maxLevel = Math.max(maxLevel, this.calculateNestingLevel(value, level + 1))
        }
      })

      return maxLevel
    } catch (error) {
      console.error("Error calculating nesting level:", error)
      return level // Return current level on error
    }
  }
}
