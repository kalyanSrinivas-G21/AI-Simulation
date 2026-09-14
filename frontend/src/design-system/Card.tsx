import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  selectedBorderColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  raised = false,
  selectedBorderColor,
  style,
  ...props
}) => {
  return (
    <div
      style={{
        borderColor: selectedBorderColor || undefined,
        backgroundColor: selectedBorderColor ? `${selectedBorderColor}14` : undefined,
        ...style,
      }}
      className={clsx(
        "rounded-card border border-subtle transition-all duration-200",
        raised ? "bg-panel-raised shadow-lg" : "bg-panel",
        "p-6", // 24px padding per §4.3
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
