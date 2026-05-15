import React from "react";
import { cn } from "../utils/cn";

type TrackRowProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  isPlaying?: boolean;
  roundThumb?: boolean;
};

export default function TrackRow({
  title,
  subtitle,
  imageUrl,
  onClick,
  actions,
  isPlaying,
  roundThumb
}: TrackRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 transition duration-200",
        onClick && "cursor-pointer hover:bg-slate-200/70",
        isPlaying && "bg-white/50 ring-1 ring-white/60"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "h-12 w-12 flex-shrink-0 rounded-xl bg-white/40 bg-cover bg-center",
          roundThumb && "rounded-full"
        )}
        style={imageUrl ? { backgroundImage: `url(\"${imageUrl}\")` } : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="truncate text-xs text-muted">{subtitle}</div> : null}
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
