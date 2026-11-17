import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-base font-semibold whitespace-nowrap transition-[color,background-color,opacity,transform] duration-fast ease-sufra outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        destructive: "bg-destructive text-background hover:opacity-90 focus-visible:ring-destructive",
        // outline kept as an alias of secondary for existing callers
        secondary: "border border-border bg-card font-medium text-foreground hover:bg-muted",
        outline: "border border-border bg-card font-medium text-foreground hover:bg-muted",
        ghost: "font-medium text-text-2 hover:bg-muted hover:text-foreground",
        link: "h-auto rounded-none p-0 text-sm font-normal text-text-2 underline underline-offset-3 hover:text-foreground active:scale-100",
      },
      size: {
        default: "h-12 px-5 has-[>svg]:px-4",
        lg: "h-12 px-5 has-[>svg]:px-4",
        sm: "h-10 px-4 text-sm",
        xs: "h-8 gap-1.5 rounded-sm px-3 text-sm font-medium",
        icon: "size-10",
        "icon-lg": "size-10",
        "icon-sm": "size-8",
        "icon-xs": "size-6 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
