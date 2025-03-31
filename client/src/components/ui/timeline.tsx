
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string
    description?: string
    date?: string
  }[]
}

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {items.map((item, index) => (
        <div key={index} className="flex gap-4">
          <div className="relative flex items-center">
            <div className="h-3 w-3 rounded-full bg-primary" />
            {index !== items.length - 1 && (
              <div className="absolute top-3 left-1.5 h-full w-px bg-border" />
            )}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-medium leading-snug">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            {item.date && (
              <p className="text-xs text-muted-foreground">{item.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
