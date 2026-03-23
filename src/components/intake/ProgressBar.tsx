"use client";

import { motion } from "framer-motion";

type Props = {
  /** 1–7 = questionnaire, 8 = review */
  step: number;
  label: string;
  compact?: boolean;
};

const FORM_STEPS = 7;

export function IntakeProgressBar({ step, label, compact }: Props) {
  const pct = step >= 8 ? 100 : Math.round(((step - 1) / FORM_STEPS) * 100);
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="fixed start-0 end-0 top-0 z-[100] border-b border-gray-200/80 bg-white/95 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          {!compact ? (
            <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200" dir="ltr">
              {label}
            </p>
          ) : (
            <span className="text-xs font-semibold text-teal-800 dark:text-teal-300" dir="ltr">
              {Math.min(step, FORM_STEPS)}/{FORM_STEPS}
            </span>
          )}
          <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">{clamped}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-800 via-teal-600 to-amber-500 dark:from-teal-600 dark:via-teal-500 dark:to-amber-400"
            initial={false}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: FORM_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${
                i + 1 < step
                  ? "bg-teal-800 dark:bg-teal-500"
                  : i + 1 === step
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
