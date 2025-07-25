import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-button text-white hover:opacity-90 rounded-apple-sm shadow-apple hover:shadow-apple-lg transition-all duration-300",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-apple-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-apple-sm",
        secondary:
          "bg-gradient-to-r from-secondary to-accent text-white hover:opacity-90 rounded-apple-sm shadow-apple",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-apple-sm",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-button text-white hover:opacity-90 hover:shadow-apple-lg rounded-apple font-semibold transition-all duration-300 scale-105 hover:scale-110",
        tab: "bg-background/80 backdrop-blur-sm text-foreground hover:bg-background rounded-apple-sm border border-border/50",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2",
        lg: "h-14 px-8 py-4",
        icon: "h-12 w-12",
        tab: "h-16 w-16 flex-col gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
