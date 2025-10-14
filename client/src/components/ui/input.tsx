import { cn } from "@/lib/utils"
import * as React from "react"


const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm touch-manipulation",
          className
        )}
        ref={ref}
        tabIndex={0}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          fontSize: '16px', // Prevent zoom on iOS
          minHeight: '44px', // iOS minimum touch target
          ...props.style
        }}
        onTouchStart={(e) => {
          // Enhanced touch handling for mobile
          const target = e.currentTarget;
          // Add small delay to ensure proper focus
          setTimeout(() => {
            target.focus();
          }, 50);
          
          // Call original onTouchStart if provided
          if (props.onTouchStart) {
            props.onTouchStart(e);
          }
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
