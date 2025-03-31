
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Timeline.displayName = "Timeline"

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex gap-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TimelineItem.displayName = "TimelineItem"

export { Timeline, TimelineItem }
