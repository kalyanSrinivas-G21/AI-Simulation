import React, { useEffect, useState, useRef } from "react";
import clsx from "clsx";

interface MetricCounterProps {
  value: number;
  label: string;
  unit?: string;
  decimals?: number;
  prefix?: string;
  subtext?: string;
  color?: string;
  className?: string;
}

export const MetricCounter: React.FC<MetricCounterProps> = ({
  value,
  label,
  unit = "",
  decimals = 0,
  prefix = "",
  subtext,
  color,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = value;

    if (Math.abs(endVal - startVal) < 1e-4) {
      setDisplayValue(endVal);
      return;
    }

    const duration = 400; // 400ms per §4.4
    const startTime = performance.now();

    let animationFrameId: number;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  const formattedNumber = displayValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div
      className={clsx(
        "p-4 rounded-card bg-panel border border-subtle flex flex-col justify-between transition-colors hover:border-textDisabled/50",
        className
      )}
    >
      <div className="text-xs uppercase tracking-wider font-mono text-textSecondary mb-1.5 flex items-center justify-between">
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1 font-mono font-bold tracking-tight">
        {prefix && <span className="text-textSecondary text-sm font-normal">{prefix}</span>}
        <span
          className="text-2xl tabular-nums"
          style={{ color: color || "#E6EDF3" }}
        >
          {formattedNumber}
        </span>
        {unit && <span className="text-textSecondary text-xs font-mono font-medium ml-0.5">{unit}</span>}
      </div>
      {subtext && (
        <div className="text-[11px] text-textDisabled mt-1 font-mono leading-tight">
          {subtext}
        </div>
      )}
    </div>
  );
};
