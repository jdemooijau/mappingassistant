"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertTriangle, RefreshCw, Zap } from "lucide-react"
import { useMappingStore } from "@/lib/mapping-store"

export function MappingStatusIndicator() {
  const { mappings, conflicts } = useMappingStore()
  const [recentChanges, setRecentChanges] = useState<string[]>([])

  const activeMappings = mappings.filter((m) => m.status === "active")
  const userModifiedMappings = mappings.filter((m) => m.user_modified)

  useEffect(() => {
    // Track recent changes
    const recentlyModified = mappings
      .filter((m) => {
        const updatedAt = new Date(m.updated_at)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        return updatedAt > fiveMinutesAgo && m.user_modified
      })
      .map((m) => `${m.source_field} → ${m.target_field}`)

    setRecentChanges(recentlyModified)
  }, [mappings])

  const getStatusColor = () => {
    if (conflicts.length > 0) return "text-red-600 bg-red-50 border-red-200"
    if (activeMappings.length === 0) return "text-gray-600 bg-gray-50 border-gray-200"
    return "text-green-600 bg-green-50 border-green-200"
  }

  const getStatusIcon = () => {
    if (conflicts.length > 0) return <AlertTriangle className="h-4 w-4" />
    if (activeMappings.length === 0) return <RefreshCw className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  return (
    <Card className="border-l-4 border-l-[#1a365d]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-[#1a365d] flex items-center">
            <Zap className="mr-2 h-4 w-4" />
            Mapping Status
          </h4>
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            {conflicts.length > 0 ? "Conflicts" : activeMappings.length === 0 ? "No Mappings" : "Active"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Active</p>
            <p className="font-bold text-[#1a365d]">{activeMappings.length}</p>
          </div>
          <div>
            <p className="text-gray-600">User Modified</p>
            <p className="font-bold text-[#0f766e]">{userModifiedMappings.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Conflicts</p>
            <p className="font-bold text-red-600">{conflicts.length}</p>
          </div>
        </div>

        {recentChanges.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-600 mb-1">Recent Changes:</p>
            <div className="space-y-1">
              {recentChanges.slice(0, 3).map((change, index) => (
                <Badge key={index} variant="outline" className="text-xs mr-1">
                  {change}
                </Badge>
              ))}
              {recentChanges.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recentChanges.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
