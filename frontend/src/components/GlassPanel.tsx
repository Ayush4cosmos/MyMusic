import React from "react";
import { cn } from "../utils/cn";

type GlassPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "strong" | "dark";
};

export default function GlassPanel({ className, variant = "default", ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass-panel glass-inset rounded-2xl p-4",
        variant === "strong" && "glass-panel-strong",
        variant === "dark" && "glass-panel-dark text-slate-100",
        className
      )}
      {...props}
    />
  );
}
