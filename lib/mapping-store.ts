import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { MappingSuggestion } from "@/lib/mapping-schemas"

export interface DynamicMapping extends MappingSuggestion {
  id: string
  status: "active" | "pending" | "conflict" | "disabled"
  created_at: string
  updated_at: string
  user_modified: boolean
  original_mapping?: MappingSuggestion
  conflict_reason?: string
  user_command?: string
}

export interface MappingConflict {
  id: string
  type: "duplicate_source" | "duplicate_target" | "circular_reference" | "type_mismatch"
  description: string
  affected_mappings: string[]
  suggested_resolution: string
}

interface MappingStore {
  mappings: DynamicMapping[]
  conflicts: MappingConflict[]
  documentId: string | null

  // Actions
  setDocumentMappings: (documentId: string, initialMappings: MappingSuggestion[]) => void
  updateMapping: (id: string, updates: Partial<DynamicMapping>) => void
  addMapping: (mapping: Omit<DynamicMapping, "id" | "created_at" | "updated_at">) => string
  removeMapping: (id: string) => void
  resolveConflict: (conflictId: string, resolution: "accept" | "reject" | "modify", data?: any) => void
  clearMappings: () => void
  getMappingByFields: (sourceField: string, targetField?: string) => DynamicMapping | undefined
  validateMappings: () => MappingConflict[]
  exportMappings: () => DynamicMapping[]
}

export const useMappingStore = create<MappingStore>()(
  persist(
    (set, get) => ({
      mappings: [],
      conflicts: [],
      documentId: null,

      setDocumentMappings: (documentId: string, initialMappings: MappingSuggestion[]) => {
        const dynamicMappings: DynamicMapping[] = initialMappings.map((mapping, index) => ({
          ...mapping,
          id: `mapping-${documentId}-${index}`,
          status: "active" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_modified: false,
        }))

        set({
          documentId,
          mappings: dynamicMappings,
          conflicts: [],
        })

        // Validate initial mappings
        get().validateMappings()
      },

      updateMapping: (id: string, updates: Partial<DynamicMapping>) => {
        set((state) => ({
          mappings: state.mappings.map((mapping) =>
            mapping.id === id
              ? {
                  ...mapping,
                  ...updates,
                  updated_at: new Date().toISOString(),
                  user_modified: true,
                }
              : mapping,
          ),
        }))

        // Re-validate after update
        get().validateMappings()
      },

      addMapping: (mapping: Omit<DynamicMapping, "id" | "created_at" | "updated_at">) => {
        const id = `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newMapping: DynamicMapping = {
          ...mapping,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        set((state) => ({
          mappings: [...state.mappings, newMapping],
        }))

        // Validate after adding
        get().validateMappings()
        return id
      },

      removeMapping: (id: string) => {
        set((state) => ({
          mappings: state.mappings.filter((mapping) => mapping.id !== id),
          conflicts: state.conflicts.filter((conflict) => !conflict.affected_mappings.includes(id)),
        }))
      },

      resolveConflict: (conflictId: string, resolution: "accept" | "reject" | "modify", data?: any) => {
        const conflict = get().conflicts.find((c) => c.id === conflictId)
        if (!conflict) return

        set((state) => {
          let updatedMappings = [...state.mappings]

          if (resolution === "accept") {
            // Accept the conflicting mappings as-is
            updatedMappings = updatedMappings.map((mapping) =>
              conflict.affected_mappings.includes(mapping.id) ? { ...mapping, status: "active" as const } : mapping,
            )
          } else if (resolution === "reject") {
            // Remove or disable conflicting mappings
            updatedMappings = updatedMappings.map((mapping) =>
              conflict.affected_mappings.includes(mapping.id) ? { ...mapping, status: "disabled" as const } : mapping,
            )
          } else if (resolution === "modify" && data) {
            // Apply modifications
            updatedMappings = updatedMappings.map((mapping) =>
              conflict.affected_mappings.includes(mapping.id)
                ? { ...mapping, ...data, status: "active" as const, updated_at: new Date().toISOString() }
                : mapping,
            )
          }

          return {
            mappings: updatedMappings,
            conflicts: state.conflicts.filter((c) => c.id !== conflictId),
          }
        })
      },

      clearMappings: () => {
        set({
          mappings: [],
          conflicts: [],
          documentId: null,
        })
      },

      getMappingByFields: (sourceField: string, targetField?: string) => {
        const { mappings } = get()
        return mappings.find((mapping) => {
          if (targetField) {
            return mapping.source_field === sourceField && mapping.target_field === targetField
          }
          return mapping.source_field === sourceField
        })
      },

      validateMappings: () => {
        const { mappings } = get()
        const conflicts: MappingConflict[] = []

        // Check for duplicate source fields
        const sourceFieldCounts = new Map<string, string[]>()
        mappings.forEach((mapping) => {
          if (mapping.status === "active") {
            const existing = sourceFieldCounts.get(mapping.source_field) || []
            sourceFieldCounts.set(mapping.source_field, [...existing, mapping.id])
          }
        })

        sourceFieldCounts.forEach((mappingIds, sourceField) => {
          if (mappingIds.length > 1) {
            conflicts.push({
              id: `conflict-duplicate-source-${sourceField}`,
              type: "duplicate_source",
              description: `Multiple mappings found for source field "${sourceField}"`,
              affected_mappings: mappingIds,
              suggested_resolution: "Keep the most recent mapping or merge the transformations",
            })
          }
        })

        // Check for duplicate target fields
        const targetFieldCounts = new Map<string, string[]>()
        mappings.forEach((mapping) => {
          if (mapping.status === "active") {
            const existing = targetFieldCounts.get(mapping.target_field) || []
            targetFieldCounts.set(mapping.target_field, [...existing, mapping.id])
          }
        })

        targetFieldCounts.forEach((mappingIds, targetField) => {
          if (mappingIds.length > 1) {
            conflicts.push({
              id: `conflict-duplicate-target-${targetField}`,
              type: "duplicate_target",
              description: `Multiple mappings found for target field "${targetField}"`,
              affected_mappings: mappingIds,
              suggested_resolution: "Combine source fields or use different target fields",
            })
          }
        })

        set({ conflicts })
        return conflicts
      },

      exportMappings: () => {
        return get().mappings.filter((mapping) => mapping.status === "active")
      },
    }),
    {
      name: "mapping-store",
      partialize: (state) => ({
        mappings: state.mappings,
        documentId: state.documentId,
      }),
    },
  ),
)
