import React from "react";
import clsx from "clsx";

export type BadgeVariant = "live" | "trained" | "simulated" | "seed" | "custom";

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  seedNumber?: number | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "live",
  label,
  seedNumber,
  className,
}) => {
  if (variant === "live") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium tracking-wider uppercase border",
          "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
          className
        )}
      >
        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" style={{ animationDuration: "1.5s" }} />
        {label || "LIVE"}
      </span>
    );
  }

  if (variant === "trained") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium tracking-wider uppercase border",
          "bg-[#3E8EED]/10 text-[#3E8EED] border-[#3E8EED]/30",
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#3E8EED]" />
        {label || "TRAINED"}
      </span>
    );
  }

  if (variant === "simulated") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium tracking-wider uppercase border",
          "bg-[#6B7280]/10 text-[#8B95A1] border-[#6B7280]/30",
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
        {label || "SIMULATED"}
      </span>
    );
  }

  if (variant === "seed") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wider uppercase border",
          "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30",
          className
        )}
      >
        RECORDING SEED #{seedNumber ?? "1234"}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border border-subtle bg-panel text-textSecondary",
        className
      )}
    >
      {label}
    </span>
  );
};
