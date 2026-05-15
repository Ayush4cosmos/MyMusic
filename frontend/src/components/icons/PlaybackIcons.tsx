import React from "react";

type IconProps = {
  size?: number;
  className?: string;
};

export function QueueIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4.5" y1="6.5" x2="19.5" y2="6.5" />
      <line x1="4.5" y1="12" x2="14.5" y2="12" />
      <line x1="4.5" y1="17.5" x2="12.5" y2="17.5" />
    </svg>
  );
}

export function AddToQueueIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.2" y="3.2" width="17.6" height="5.8" rx="2.9" />
      <line x1="5" y1="13.5" x2="10.5" y2="13.5" />
      <line x1="5" y1="18.2" x2="10.5" y2="18.2" />
      <line x1="17.2" y1="12.2" x2="17.2" y2="20.2" />
      <line x1="13.2" y1="16.2" x2="21.2" y2="16.2" />
    </svg>
  );
}

