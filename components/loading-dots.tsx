"use client"

import { cn } from "@/lib/utils"

interface LoadingDotsProps {
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary"
  className?: string
}

export function LoadingDots({ size = "md", variant = "primary", className }: LoadingDotsProps) {
  const sizeClasses = {
    sm: "w-1 h-1",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  }

  const variantClasses = {
    primary: "bg-[#1a365d]",
    secondary: "bg-[#0f766e]",
  }

  return (
    <div className={cn("flex space-x-1", className)}>
      <div className={cn("rounded-full animate-bounce", sizeClasses[size], variantClasses[variant])}></div>
      <div
        className={cn("rounded-full animate-bounce", sizeClasses[size], variantClasses[variant])}
        style={{ animationDelay: "0.1s" }}
      ></div>
      <div
        className={cn("rounded-full animate-bounce", sizeClasses[size], variantClasses[variant])}
        style={{ animationDelay: "0.2s" }}
      ></div>
    </div>
  )
}
