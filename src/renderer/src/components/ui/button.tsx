import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-mac text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#007AFF] text-white shadow hover:bg-[#0066D6] active:bg-[#0055B3]',
        destructive: 'bg-[#FF3B30] text-white shadow-sm hover:bg-[#E0352B]',
        outline: 'border border-neutral-200 bg-transparent shadow-sm hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800',
        secondary: 'bg-neutral-100 text-neutral-900 shadow-sm hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100',
        ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        link: 'text-[#007AFF] underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-mac px-8',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
