"use client"

import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "white"
  className?: string
}

export function LoadingSpinner({ size = "md", variant = "primary", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  }

  const variantClasses = {
    primary: "border-[#1a365d] border-t-transparent",
    secondary: "border-[#0f766e] border-t-transparent",
    white: "border-white border-t-transparent",
  }

  return <div className={cn("rounded-full animate-spin", sizeClasses[size], variantClasses[variant], className)} />
}
