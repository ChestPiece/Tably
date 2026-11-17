"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  label,
  id,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
  /** Optional visible label, rendered beside the track. */
  label?: React.ReactNode
}) {
  const auto = React.useId()
  const sid = id ?? auto
  const root = (
    <SwitchPrimitive.Root
      id={sid}
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex h-6 w-10 shrink-0 items-center rounded-full border-0 bg-input px-[3px] transition-colors duration-base ease-sufra outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[18px] rounded-full bg-card shadow-sm transition-transform duration-base ease-sufra data-[state=checked]:translate-x-4 data-[state=checked]:bg-primary-foreground rtl:data-[state=checked]:-translate-x-4"
      />
    </SwitchPrimitive.Root>
  )
  if (label == null) return root
  return (
    <span className="inline-flex items-center gap-3 text-sm text-text-2">
      {root}
      <label htmlFor={sid}>{label}</label>
    </span>
  )
}

export { Switch }
