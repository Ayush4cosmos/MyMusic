import React from "react";
import { cn } from "../utils/cn";

type TrackActionIconButtonProps = {
  label: string;
  onPress: () => void;
  shape?: "square" | "circle";
  children: React.ReactNode;
};

export default function TrackActionIconButton({
  label,
  onPress,
  shape = "square",
  children
}: TrackActionIconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "group relative inline-flex h-8 w-8 shrink-0 items-center justify-center border border-slate-300 bg-white/60 text-slate-700 transition hover:bg-slate-200",
        shape === "circle" ? "rounded-full" : "rounded-lg"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      aria-label={label}
    >
      {children}
      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-700 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
