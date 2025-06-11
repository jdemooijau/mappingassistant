"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, File, X, CheckCircle } from "lucide-react"
import { LoadingDots } from "@/components/loading-dots"

interface Document {
  id: string
  name: string
  type: "source" | "target"
  file: File
  content?: string
}

interface DocumentUploadProps {
  documents: Document[]
  onDocumentsChange: (documents: Document[]) => void
  onComplete: () => void
}

export function DocumentUpload({ documents, onDocumentsChange, onComplete }: DocumentUploadProps) {
  const [uploadType, setUploadType] = useState<"source" | "target">("source")
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsProcessing(true)

      const newDocuments = await Promise.all(
        acceptedFiles.map(async (file) => {
          let content = ""

          // Read file content for text files
          if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
            content = await file.text()
          }

          return {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: uploadType,
            file,
            content,
          }
        }),
      )

      onDocumentsChange([...documents, ...newDocuments])
      setIsProcessing(false)
    },
    [documents, onDocumentsChange, uploadType],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter((doc) => doc.id !== id))
  }

  const sourceDocuments = documents.filter((doc) => doc.type === "source")
  const targetDocuments = documents.filter((doc) => doc.type === "target")

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1a365d] mb-2">Document Upload</h2>
        <p className="text-gray-600">Upload your source and target documents to begin analysis</p>
      </div>

      {/* Upload Type Selector */}
      <div className="flex justify-center space-x-4">
        <Button
          variant={uploadType === "source" ? "default" : "outline"}
          onClick={() => setUploadType("source")}
          className="bg-[#1a365d] hover:bg-[#2d3748]"
        >
          Source Documents
        </Button>
        <Button
          variant={uploadType === "target" ? "default" : "outline"}
          onClick={() => setUploadType("target")}
          className="bg-[#0f766e] hover:bg-[#0d5d56]"
        >
          Target Documents
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-[#1a365d] transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer ${isDragActive ? "text-[#1a365d]" : "text-gray-500"}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? "Drop files here" : `Upload ${uploadType} documents`}
            </p>
            <p className="text-sm">Drag and drop files here, or click to select files</p>
            <p className="text-xs text-gray-400 mt-2">Supports all file types</p>
          </div>
        </CardContent>
      </Card>

      {isProcessing && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <LoadingDots variant="primary" />
          </div>
          <p className="text-[#1a365d] font-medium">Processing files...</p>
        </div>
      )}

      {/* Document Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Source Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#1a365d]">
              <File className="mr-2 h-5 w-5" />
              Source Documents ({sourceDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceDocuments.length === 0 ? (
              <p className="text-gray-500 text-sm">No source documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {sourceDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-[#1a365d]" />
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[#0f766e]">
              <File className="mr-2 h-5 w-5" />
              Target Documents ({targetDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {targetDocuments.length === 0 ? (
              <p className="text-gray-500 text-sm">No target documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {targetDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-teal-50 rounded">
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-[#0f766e]" />
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Complete Button */}
      {documents.length > 0 && (
        <div className="text-center">
          <Button onClick={onComplete} className="bg-[#1a365d] hover:bg-[#2d3748] text-white px-8 py-2">
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Document Upload
          </Button>
        </div>
      )}
    </div>
  )
}
