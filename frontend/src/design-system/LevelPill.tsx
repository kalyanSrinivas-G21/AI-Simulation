import React from "react";
import { Shuffle, ListChecks, Users, Brain, Eye } from "lucide-react";
import clsx from "clsx";
import { IntelligenceLevel, LEVEL_COLORS, LEVEL_SHORT_LABELS } from "./tokens";

interface LevelPillProps {
  level: IntelligenceLevel;
  isActive?: boolean;
  onClick?: () => void;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  labelOverride?: string;
}

export const LevelPill: React.FC<LevelPillProps> = ({
  level,
  isActive = false,
  onClick,
  showIcon = true,
  size = "md",
  className,
  disabled = false,
  labelOverride,
}) => {
  const color = LEVEL_COLORS[level];

  const renderIcon = () => {
    const iconProps = {
      size: size === "sm" ? 14 : size === "md" ? 16 : 18,
      strokeWidth: 1.75,
    };
    switch (level) {
      case 0:
        return <Shuffle {...iconProps} />;
      case 1:
        return <ListChecks {...iconProps} />;
      case 2:
        return <Users {...iconProps} />;
      case 3:
        return <Brain {...iconProps} />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderColor: isActive ? color : undefined,
        backgroundColor: isActive ? `${color}14` : undefined, // 8% tint per §4.3
        color: isActive ? "#FFFFFF" : undefined,
      }}
      className={clsx(
        "group inline-flex items-center gap-2 rounded-full font-mono font-medium transition-all duration-150 border",
        size === "sm" && "px-3 py-1 text-xs",
        size === "md" && "px-4 py-1.5 text-sm",
        size === "lg" && "px-5 py-2 text-sm",
        isActive
          ? "border-current shadow-[0_0_12px_rgba(0,0,0,0.3)]"
          : "border-subtle bg-panel text-textSecondary hover:border-textDisabled hover:text-textPrimary",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {showIcon && (
        <span
          style={{ color: isActive ? color : undefined }}
          className={clsx("transition-colors", !isActive && "group-hover:text-textPrimary")}
        >
          {renderIcon()}
        </span>
      )}
      <span className="tracking-wide">
        <span className="opacity-60 text-[0.85em] mr-1">L{level}</span>
        {labelOverride || LEVEL_SHORT_LABELS[level]}
      </span>
    </button>
  );
};
