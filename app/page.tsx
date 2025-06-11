"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Upload, Brain, Eye, MessageSquare, Download, Save } from "lucide-react"
import { StepUpload } from "@/components/steps/step-upload"
import { StepAiMapping } from "@/components/steps/step-ai-mapping"
import { StepReviewMapping } from "@/components/steps/step-review-mapping"
import { StepAiChat } from "@/components/steps/step-ai-chat"
import { StepConversion } from "@/components/steps/step-conversion"
import { StepSaveConfig } from "@/components/steps/step-save-config"

type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6

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

interface WorkflowData {
  documents: DocumentSet
  mappings: MappingData
  loadedConfiguration: any | null
}

export default function DataTransformationApp() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set())
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    documents: {
      sourceFile: null,
      sourceSpecs: [],
      targetFile: null,
      targetSpecs: [],
    },
    mappings: {
      fieldMappings: [],
      analysisResults: null,
      chatHistory: [],
      finalMappings: [],
    },
    loadedConfiguration: null,
  })

  const steps = [
    { number: 1, title: "Upload Documents", icon: Upload, description: "Upload source and target files" },
    { number: 2, title: "AI Analysis", icon: Brain, description: "AI creates initial mappings" },
    { number: 3, title: "Review Mappings", icon: Eye, description: "Review and adjust mappings" },
    { number: 4, title: "AI Chat", icon: MessageSquare, description: "Refine with AI assistance" },
    { number: 5, title: "Convert File", icon: Download, description: "Generate transformed file" },
    { number: 6, title: "Save Config", icon: Save, description: "Save mapping configuration" },
  ]

  const updateWorkflowData = (updates: Partial<WorkflowData>) => {
    setWorkflowData((prev) => ({ ...prev, ...updates }))
  }

  const completeStep = (step: WorkflowStep, data?: any) => {
    setCompletedSteps((prev) => new Set([...prev, step]))

    if (data) {
      updateWorkflowData(data)
    }

    // Auto-advance to next step if not at the end
    if (step < 6) {
      setCurrentStep((step + 1) as WorkflowStep)
    }
  }

  const navigateToStep = (step: WorkflowStep) => {
    // Allow navigation to completed steps or the next available step
    const canNavigate = step === 1 || completedSteps.has((step - 1) as WorkflowStep) || completedSteps.has(step)

    if (canNavigate) {
      setCurrentStep(step)
    }
  }

  const handleConfigurationLoad = (config: any) => {
    // When configuration is loaded, populate data and skip to step 4
    updateWorkflowData({
      loadedConfiguration: config,
      mappings: {
        ...workflowData.mappings,
        fieldMappings: config.mappings || [],
        finalMappings: config.mappings || [],
      },
    })

    setCompletedSteps(new Set([1, 2, 3]))
    setCurrentStep(4)
  }

  const canNavigateToStep = (step: WorkflowStep): boolean => {
    if (step === 1) return true
    return completedSteps.has((step - 1) as WorkflowStep) || completedSteps.has(step)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img
              src="https://media.licdn.com/dms/image/v2/D4D0BAQFiA30oLk4j6Q/company-logo_200_200/B4DZUEzffZHkAQ-/0/1739542362935/altrix_one_logo?e=1755129600&v=beta&t=WsAu4slspqFrs5M6YFE08EJTKPUcMyy2SOaBPWBrojw"
              alt="Altrix One Logo"
              className="h-12 w-12 object-contain"
            />
            <h1 className="text-4xl font-bold text-[#1a365d]">Cohenix Mapping Assistant</h1>
          </div>
          <p className="text-gray-600 text-lg">Intelligent document mapping and transformation with AI assistance</p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#1a365d]">Transformation Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.number
                const isCompleted = completedSteps.has(step.number as WorkflowStep)
                const canNavigate = canNavigateToStep(step.number as WorkflowStep)

                return (
                  <div key={step.number} className="flex items-center min-w-0">
                    <div
                      className={`flex flex-col items-center cursor-pointer transition-all ${
                        canNavigate ? "hover:scale-105" : "cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => canNavigate && navigateToStep(step.number as WorkflowStep)}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                              ? "bg-[#1a365d] text-white"
                              : canNavigate
                                ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                      </div>
                      <div className="text-center max-w-24">
                        <div className={`font-medium text-xs ${isActive ? "text-[#1a365d]" : "text-gray-600"}`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{step.description}</div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 h-px bg-gray-300 mx-4 mt-6 min-w-8">
                        <div
                          className={`h-full transition-all ${
                            completedSteps.has(step.number as WorkflowStep) ? "bg-green-500" : "bg-gray-300"
                          }`}
                          style={{
                            width: completedSteps.has(step.number as WorkflowStep) ? "100%" : "0%",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <StepUpload
              documents={workflowData.documents}
              onComplete={(documents) => completeStep(1, { documents })}
              onLoadConfiguration={handleConfigurationLoad}
            />
          )}

          {currentStep === 2 && (
            <StepAiMapping
              documents={workflowData.documents}
              onComplete={(mappings) => completeStep(2, { mappings })}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <StepReviewMapping
              documents={workflowData.documents}
              mappings={workflowData.mappings}
              onComplete={(mappings) => completeStep(3, { mappings })}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <StepAiChat
              documents={workflowData.documents}
              mappings={workflowData.mappings}
              loadedConfiguration={workflowData.loadedConfiguration}
              onComplete={(mappings) => completeStep(4, { mappings })}
              onBack={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 5 && (
            <StepConversion
              documents={workflowData.documents}
              mappings={workflowData.mappings}
              onComplete={() => completeStep(5)}
              onBack={() => setCurrentStep(4)}
            />
          )}

          {currentStep === 6 && (
            <StepSaveConfig
              documents={workflowData.documents}
              mappings={workflowData.mappings}
              onComplete={() => completeStep(6)}
              onBack={() => setCurrentStep(5)}
              onStartNew={() => {
                setCurrentStep(1)
                setCompletedSteps(new Set())
                setWorkflowData({
                  documents: {
                    sourceFile: null,
                    sourceSpecs: [],
                    targetFile: null,
                    targetSpecs: [],
                  },
                  mappings: {
                    fieldMappings: [],
                    analysisResults: null,
                    chatHistory: [],
                    finalMappings: [],
                  },
                  loadedConfiguration: null,
                })
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <Badge variant="outline" className="text-[#1a365d]">
              Step {currentStep} of 6
            </Badge>
            {completedSteps.size > 0 && (
              <Badge variant="outline" className="text-green-600">
                {completedSteps.size} Steps Completed
              </Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            AI-Powered Document Transformation • Intelligent Field Mapping • Real-time Conversion
          </p>
        </div>
      </div>
    </div>
  )
}
