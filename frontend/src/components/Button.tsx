import React from "react";
import { cn } from "../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-white/70 text-slate-900 hover:bg-slate-200 border border-white/60",
  ghost: "bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-200/70"
};

export default function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
