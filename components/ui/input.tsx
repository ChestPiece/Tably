import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, size, ...props }: Omit<React.ComponentProps<"input">, "size"> & { size?: "default" | "sm" | "lg" }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border border-input bg-card px-4 text-base transition-colors duration-fast ease-sufra outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-text-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive",
        size === "sm" && "h-10 text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
