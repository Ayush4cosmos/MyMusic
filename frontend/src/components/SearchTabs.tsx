import React from "react";
import { cn } from "../utils/cn";

export type SearchTab = "songs" | "artists" | "albums";

type SearchTabsProps = {
  active: SearchTab;
  onChange: (tab: SearchTab) => void;
  className?: string;
};

const tabs: SearchTab[] = ["songs", "artists", "albums"];

export default function SearchTabs({ active, onChange, className }: SearchTabsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
            active === tab
              ? "bg-slate-900/85 text-white"
              : "bg-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-800"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
