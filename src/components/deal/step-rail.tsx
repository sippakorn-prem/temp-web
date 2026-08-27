"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/ds-utils";

/**
 * The wizard progress rail shared by the deal-creation and deal-acceptance flows: numbered
 * circles with connectors on desktop, a compact bar row on mobile. Completed steps are
 * navigable back to; steps ahead of the current one are locked until reached.
 *
 * There is no design-system stepper primitive, so this is the single sanctioned
 * implementation — both flows import it rather than re-declaring their own.
 */
export function StepRail({
  step,
  labels,
  progressLabel,
  onStepChange,
}: {
  step: number;
  labels: string[];
  progressLabel: string;
  onStepChange?: (step: number) => void;
}) {
  return (
    <>
      <ol className="grid grid-cols-4 gap-2 md:hidden" aria-label={progressLabel}>
        {labels.map((label, index) => (
          <li key={label} className="min-w-0">
            <button
              type="button"
              className="w-full text-left disabled:cursor-default"
              disabled={!onStepChange || index > step}
              aria-current={index === step ? "step" : undefined}
              onClick={() => onStepChange?.(index)}
            >
              <span className={cn("mb-2 block h-1 rounded-full", index <= step ? "bg-primary" : "bg-border")} />
              <span className={cn("block text-[11px]", index === step ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <ol className="hidden items-center md:flex" aria-label={progressLabel}>
        {labels.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} className={cn("flex min-w-0 items-center", index < labels.length - 1 && "flex-1")}>
              <button
                type="button"
                className="flex shrink-0 items-center gap-2 disabled:cursor-default"
                disabled={!onStepChange || index > step}
                aria-current={current ? "step" : undefined}
                onClick={() => onStepChange?.(index)}
              >
                <span
                  className={cn(
                    "grid size-[30px] shrink-0 place-items-center rounded-full border-2 bg-card text-xs font-bold text-muted-foreground",
                    (done || current) && "border-primary bg-primary text-primary-foreground",
                    current && "ring-4 ring-accent",
                  )}
                >
                  {done ? <CheckIcon className="size-4" /> : index + 1}
                </span>
                <span className={cn("whitespace-nowrap text-sm font-semibold", !done && !current && "text-muted-foreground")}>
                  {label}
                </span>
              </button>
              {index < labels.length - 1 ? (
                <span className={cn("mx-3 h-0.5 min-w-3 flex-1 rounded-full", index < step ? "bg-primary" : "bg-border")} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
