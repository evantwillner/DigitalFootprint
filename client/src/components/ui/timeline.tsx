
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  date?: string
  description?: string
  icon?: React.ReactNode
}

export function TimelineItem({ title, date, description, icon, className, ...props }: TimelineItemProps) {
  return (
    <div className={cn("flex gap-4", className)} {...props}>
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {icon}
        </div>
        <div className="flex-1 border-l-2 border-muted" />
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold leading-none">{title}</h3>
          {date && <time className="text-sm text-muted-foreground">{date}</time>}
        </div>
        {description && (
          <p className="mt-2.5 text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: Array<{
    title: string
    date?: string
    description?: string
    icon?: React.ReactNode
  }>
}

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {items.map((item, index) => (
        <TimelineItem
          key={index}
          title={item.title}
          date={item.date}
          description={item.description}
          icon={item.icon}
        />
      ))}
    </div>
  )
}
