import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700',
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[#007AFF] transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
)
Progress.displayName = 'Progress'

export { Progress }
