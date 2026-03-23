"use client";

import { format } from "date-fns";
import { de as localeDe, enUS, es as localeEs, fr as localeFr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassNames } from "react-day-picker";
import { DayFlag, DayPicker, SelectionState, UI } from "react-day-picker";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import {
  ACCOMMODATION_STYLES,
  ACTIVITIES,
  AMENITIES,
  BUDGET_BANDS,
  CONTACT_METHODS,
  DINING,
  FLEXIBLE_SEASONS,
  FLIGHT_OPTIONS,
  INSURANCE_OPTIONS,
  LANGUAGES,
  PACE_OPTIONS,
  PHONE_PREFIXES,
  PRIORITY_KEYS,
  REFERRAL_SOURCES,
  REGIONS,
  TRIP_TYPES,
  VISA_OPTIONS,
} from "@/lib/intake/options";
import {
  intakeFullSchema,
  intakeStep1Schema,
  intakeStep2Schema,
  intakeStep3Schema,
  intakeStep4Schema,
  intakeStep5Schema,
  intakeStep6Schema,
  intakeStep7Schema,
} from "@/lib/intake/schema";
import { intakeField, travelerSummaryLabel } from "@/lib/intake/intake-field-labels";
import { isIntakeLang, normalizeIntakeLang, type IntakeLang } from "@/lib/intake/intake-lang";
import {
  accommodationLabel,
  activityLabel,
  amenityLabel,
  budgetLabel,
  contactMethodLabel,
  diningLabel,
  flexibleSeasonLabel,
  flightOptLabel,
  insuranceLabel,
  languageChoiceLabel,
  paceDesc,
  paceTitle,
  priorityLabel,
  referralLabel,
  regionCardLabel,
  tripTypeLabel,
  visaLabel,
} from "@/lib/intake/intake-options-i18n";
import { formatIntakeFlightReview, intakeT, progressLabelForStep } from "@/lib/intake/intake-ui";
import { IntakeProgressBar } from "./ProgressBar";
import { PriorityRankList } from "./PriorityRankList";

const INTAKE_DAY_PICKER_CLASSNAMES: Partial<ClassNames> = {
  [UI.Root]: "p-0 text-gray-900 dark:text-gray-100",
  [UI.Months]: "flex flex-col gap-4 sm:flex-row",
  [UI.Month]: "space-y-2",
  [UI.MonthCaption]: "relative mb-2 flex items-center justify-center gap-1 pt-1",
  [UI.CaptionLabel]: "text-sm font-semibold text-gray-900 dark:text-gray-100",
  [UI.Nav]: "absolute inset-x-0 top-0 flex w-full items-center justify-between px-1",
  [UI.PreviousMonthButton]:
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800",
  [UI.NextMonthButton]:
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800",
  [UI.MonthGrid]: "mt-8 w-full border-collapse",
  [UI.Weekdays]: "flex",
  [UI.Weekday]: "w-9 text-center text-[11px] font-medium uppercase text-gray-500 dark:text-gray-400",
  [UI.Weeks]: "mt-1",
  [UI.Week]: "mt-1 flex w-full",
  [UI.Day]: "relative h-9 w-9 p-0 text-center text-sm",
  [UI.DayButton]:
    "inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-900 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700",
  [SelectionState.selected]: "!bg-teal-800 !text-white hover:!bg-teal-800 dark:!bg-teal-600 dark:hover:!bg-teal-600",
  [SelectionState.range_start]: "!bg-teal-800 !text-white dark:!bg-teal-600",
  [SelectionState.range_end]: "!bg-teal-800 !text-white dark:!bg-teal-600",
  [SelectionState.range_middle]: "rounded-none bg-teal-800/15 text-gray-900 dark:bg-teal-600/20 dark:text-gray-100",
  [DayFlag.today]: "font-semibold text-teal-800 dark:text-teal-300",
  [DayFlag.outside]: "text-gray-400 opacity-70 dark:text-gray-500",
  [DayFlag.disabled]: "opacity-40",
};

type FormValues = import("zod").infer<typeof intakeFullSchema>;

const DATE_FNS_LOCALE = { fr: localeFr, en: enUS, es: localeEs, de: localeDe } as const;

export type IntakeClient = {
  name: string;
  email: string | null;
  phone: string | null;
  preferredLanguage: string;
  spokenLanguages: string[];
  guideLanguage: string | null;
};

function filterIntakeLangs(arr: string[] | undefined | null): IntakeLang[] {
  if (!arr?.length) return [];
  return arr.filter((x): x is IntakeLang => isIntakeLang(x));
}

function buildDefaults(client: IntakeClient, partial: unknown): FormValues {
  const p = (partial && typeof partial === "object" ? partial : {}) as Partial<FormValues>;
  const preferredLanguage = normalizeIntakeLang(p.step1?.preferredLanguage ?? client.preferredLanguage);

  const fromPartial = filterIntakeLangs(p.step1?.spokenLanguages);
  const fromClient = filterIntakeLangs(client.spokenLanguages);
  const spokenLanguages: IntakeLang[] =
    fromPartial.length > 0 ? fromPartial : fromClient.length > 0 ? fromClient : [preferredLanguage];

  const rawGuide =
    p.step1?.guideLanguage && isIntakeLang(p.step1.guideLanguage)
      ? p.step1.guideLanguage
      : client.guideLanguage && isIntakeLang(client.guideLanguage)
        ? client.guideLanguage
        : preferredLanguage;
  const guideLanguage: IntakeLang = spokenLanguages.includes(rawGuide)
    ? rawGuide
    : spokenLanguages.includes(preferredLanguage)
      ? preferredLanguage
      : spokenLanguages[0] ?? "fr";

  return {
    step1: {
      fullName: p.step1?.fullName ?? client.name ?? "",
      email: p.step1?.email ?? client.email ?? "",
      phonePrefix: p.step1?.phonePrefix ?? "+33",
      phoneLocal: p.step1?.phoneLocal ?? "",
      contactMethod: p.step1?.contactMethod ?? "whatsapp",
      preferredLanguage,
      spokenLanguages,
      guideLanguage,
    },
    step2: {
      tripTypes: p.step2?.tripTypes ?? [],
      numTravelers: p.step2?.numTravelers ?? 2,
      dateFrom: p.step2?.dateFrom ?? "",
      dateTo: p.step2?.dateTo ?? "",
      datesFlexible: p.step2?.datesFlexible ?? false,
      flexibleSeason: p.step2?.flexibleSeason ?? "",
      tripDurationDays: p.step2?.tripDurationDays ?? 10,
      regions: p.step2?.regions ?? [],
    },
    step3: {
      budgetBand: p.step3?.budgetBand ?? "",
      accommodationStyles: p.step3?.accommodationStyles ?? [],
      amenities: p.step3?.amenities ?? [],
    },
    step4: {
      activities: p.step4?.activities ?? [],
      diningPreferences: p.step4?.diningPreferences ?? [],
      pace: p.step4?.pace ?? "balanced",
    },
    step5: {
      dietaryNotes: p.step5?.dietaryNotes ?? "",
      medicalNotes: p.step5?.medicalNotes ?? "",
      insurance: p.step5?.insurance ?? "unknown",
      visa: p.step5?.visa ?? "eu_schengen",
      visaOtherDetail: p.step5?.visaOtherDetail ?? "",
      flights: p.step5?.flights ?? "self",
    },
    step6: {
      priorityOrder: (p.step6?.priorityOrder?.length === 8 ? p.step6.priorityOrder : null) ?? [...PRIORITY_KEYS],
      freeText: p.step6?.freeText ?? "",
      referralSource: p.step6?.referralSource ?? "",
      consent: p.step6?.consent ?? false,
      marketingOptIn: p.step6?.marketingOptIn ?? true,
    },
    step7: {
      arrivalAirline: p.step7?.arrivalAirline ?? "",
      arrivalFlightNumber: p.step7?.arrivalFlightNumber ?? "",
      arrivalDate: p.step7?.arrivalDate ?? "",
      arrivalTime: p.step7?.arrivalTime ?? "",
      arrivalCity: p.step7?.arrivalCity ?? "Bogotá",
      departureAirline: p.step7?.departureAirline ?? "",
      departureFlightNumber: p.step7?.departureFlightNumber ?? "",
      departureDate: p.step7?.departureDate ?? "",
      departureTime: p.step7?.departureTime ?? "",
      departureCity: p.step7?.departureCity ?? "Bogotá",
    },
  };
}

const LS_PREFIX = "csm-intake-";

type Props = {
  token: string;
  client: IntakeClient;
  serverPartial: unknown;
  initialStep: number;
};

export function IntakeForm({ token, client, serverPartial, initialStep }: Props) {
  const [uiStep, setUiStep] = useState(Math.min(7, Math.max(1, initialStep)));
  const [phase, setPhase] = useState<"form" | "review" | "done">("form");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [compactBar, setCompactBar] = useState(false);

  const defaults = useMemo(() => {
    let merged = serverPartial;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`${LS_PREFIX}${token}`);
        if (raw) {
          const loc = JSON.parse(raw) as { partial?: unknown };
          if (loc.partial && typeof loc.partial === "object") {
            merged = { ...(merged as object), ...(loc.partial as object) };
          }
        }
      } catch {
        /* ignore */
      }
    }
    return buildDefaults(client, merged);
  }, [token, client, serverPartial]);

  const methods = useForm<FormValues>({
    defaultValues: defaults,
    mode: "onChange",
  });

  const { control, watch, setValue, getValues, setError, clearErrors, formState } = methods;
  const docLang = normalizeIntakeLang(watch("step1.preferredLanguage"));

  useEffect(() => {
    const q = window.matchMedia("(max-width: 480px)");
    const fn = () => setCompactBar(q.matches);
    fn();
    q.addEventListener("change", fn);
    return () => q.removeEventListener("change", fn);
  }, []);

  const persistLocal = useCallback(
    (partial: unknown) => {
      try {
        localStorage.setItem(`${LS_PREFIX}${token}`, JSON.stringify({ partial, at: Date.now() }));
      } catch {
        /* ignore */
      }
    },
    [token],
  );

  const autosave = useCallback(
    async (stepCompleted: number) => {
      const key = `step${stepCompleted}` as keyof FormValues;
      const partialStep = getValues(key) as Record<string, unknown>;
      persistLocal({ ...((serverPartial as object) ?? {}), [key]: partialStep });
      try {
        await fetch("/api/intake/autosave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, step: stepCompleted, partialStep }),
        });
      } catch {
        /* offline ok */
      }
    },
    [getValues, persistLocal, serverPartial, token],
  );

  const validateStep = (n: number) => {
    const schemas = [
      intakeStep1Schema,
      intakeStep2Schema,
      intakeStep3Schema,
      intakeStep4Schema,
      intakeStep5Schema,
      intakeStep6Schema,
      intakeStep7Schema,
    ];
    const schema = schemas[n - 1];
    if (!schema) return true;
    const key = `step${n}` as keyof FormValues;
    const data = getValues(key);
    const parsed = schema.safeParse(data);
    clearErrors();
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = [key, ...issue.path].join(".");
        setError(path as Parameters<typeof setError>[0], { message: issue.message });
      }
      return false;
    }
    return true;
  };

  const goNext = async () => {
    setSubmitError(null);
    const valid = validateStep(uiStep);
    if (!valid) return;
    setSaving(true);
    await autosave(uiStep);
    setSaving(false);
    if (uiStep < 7) {
      setUiStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPhase("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goPrev = () => {
    if (phase === "review") {
      setPhase("form");
      setUiStep(7);
      return;
    }
    if (uiStep > 1) setUiStep((s) => s - 1);
  };

  const onFinalSubmit = async () => {
    const lang = normalizeIntakeLang(getValues("step1.preferredLanguage"));
    const data = getValues();
    const parsed = intakeFullSchema.safeParse(data);
    if (!parsed.success) {
      setSubmitError(intakeT(lang, "errors.submitIncomplete"));
      return;
    }
    setSubmitError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, data: parsed.data }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setSubmitError(json.error ?? intakeT(lang, "errors.submitFailed"));
        setSaving(false);
        return;
      }
      localStorage.removeItem(`${LS_PREFIX}${token}`);
      setPhase("done");
    } catch {
      setSubmitError(intakeT(lang, "errors.network"));
    }
    setSaving(false);
  };

  const rangeSelected: DateRange | undefined = (() => {
    const from = watch("step2.dateFrom");
    const to = watch("step2.dateTo");
    if (!from) return undefined;
    return { from: new Date(from), to: to ? new Date(to) : undefined };
  })();

  const progressLabel =
    phase === "review"
      ? intakeT(docLang, "progress.review")
      : phase === "done"
        ? intakeT(docLang, "progress.done")
        : progressLabelForStep(docLang, uiStep);
  const progressStep = phase === "review" ? 8 : phase === "done" ? 8 : uiStep;

  const firstName = (watch("step1.fullName") || "vous").trim().split(/\s+/)[0] ?? "vous";

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-lg px-4 pb-16 pt-28 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-teal-800 text-white dark:bg-teal-600">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
        <h2 className="font-serif text-3xl font-bold text-gray-900 dark:text-gray-100">
          {intakeT(docLang, "done.title").replace("{name}", firstName)}
        </h2>
        <p className="mt-3 text-[15px] text-gray-600 dark:text-gray-300">{intakeT(docLang, "done.line1")}</p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-teal-900 dark:bg-amber-500/20 dark:text-amber-100">
          {intakeT(docLang, "done.line2")}
        </p>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <IntakeProgressBar step={progressStep} label={progressLabel} compact={compactBar} />

      <div className="mx-auto max-w-2xl px-4 pb-28 pt-28">
        <header className="mb-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 font-serif text-sm font-semibold uppercase tracking-[0.12em] text-teal-900 dark:text-teal-300">
            Colombie <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" /> sur mesure
          </div>
          <h1 className="font-serif text-3xl font-bold text-gray-900 dark:text-gray-100">{intakeT(docLang, "header.title")}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300">{intakeT(docLang, "header.sub")}</p>
        </header>

        <AnimatePresence mode="wait">
          {phase === "form" ? (
            <motion.div
              key={uiStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
              className="rounded-[20px] border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none sm:p-8"
            >
              {uiStep === 1 && (
                <Step1 control={control} setValue={setValue} getValues={getValues} lang={docLang} />
              )}
              {uiStep === 2 && (
                <Step2
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  rangeSelected={rangeSelected}
                  lang={docLang}
                />
              )}
              {uiStep === 3 && <Step3 control={control} lang={docLang} />}
              {uiStep === 4 && <Step4 control={control} lang={docLang} />}
              {uiStep === 5 && <Step5 control={control} lang={docLang} />}
              {uiStep === 6 && (
                <Step6 control={control} watch={watch} setValue={setValue} lang={docLang} />
              )}
              {uiStep === 7 && <Step7 control={control} lang={docLang} />}
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 rounded-[20px] border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8"
            >
              <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeT(docLang, "review.title")}</h2>
              <ReviewSection
                title={intakeT(docLang, "review.contact")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(1); }}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {getValues("step1.fullName")} · {getValues("step1.email")}
              </p>
              <ReviewSection
                title={intakeT(docLang, "review.trip")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(2); }}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {intakeT(docLang, "review.tripLine")
                  .replace("{n}", String(getValues("step2.numTravelers")))
                  .replace("{d}", String(getValues("step2.tripDurationDays")))}
              </p>
              <ReviewSection
                title={intakeT(docLang, "review.budget")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(3); }}
              />
              <ReviewSection
                title={intakeT(docLang, "review.exp")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(4); }}
              />
              <ReviewSection
                title={intakeT(docLang, "review.health")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(5); }}
              />
              <ReviewSection
                title={intakeT(docLang, "review.final")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(6); }}
              />
              <ReviewSection
                title={intakeT(docLang, "review.flights")}
                editLabel={intakeT(docLang, "review.edit")}
                onEdit={() => { setPhase("form"); setUiStep(7); }}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">{formatIntakeFlightReview(docLang, getValues("step7"))}</p>
              {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
              <button
                type="button"
                disabled={saving}
                onClick={() => void onFinalSubmit()}
                className="mt-4 w-full rounded-full bg-gradient-to-br from-amber-500 to-amber-600 py-4 text-base font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50 dark:from-amber-600 dark:to-amber-700"
              >
                {saving ? intakeT(docLang, "nav.sending") : intakeT(docLang, "nav.submit")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "form" && (
          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={uiStep === 1}
              className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:border-teal-600 hover:text-teal-900 disabled:opacity-30 dark:border-gray-600 dark:text-gray-200 dark:hover:border-teal-500 dark:hover:text-teal-200"
            >
              {intakeT(docLang, "nav.prev")}
            </button>
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={saving}
              className="rounded-full bg-teal-800 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {uiStep === 7 ? intakeT(docLang, "nav.recap") : intakeT(docLang, "nav.next")}
            </button>
          </div>
        )}

        {phase === "review" && (
          <div className="mt-6 flex justify-start">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              {intakeT(docLang, "nav.editReview")}
            </button>
          </div>
        )}

        {Object.keys(formState.errors).length > 0 && phase === "form" && (
          <p className="mt-4 text-center text-xs text-red-600 dark:text-red-400">{intakeT(docLang, "errors.fields")}</p>
        )}
      </div>
    </FormProvider>
  );
}

function ReviewSection({
  title,
  editLabel,
  onEdit,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 py-2 dark:border-gray-700">
      <span className="text-sm font-semibold text-teal-900 dark:text-teal-300">{title}</span>
      <button type="button" onClick={onEdit} className="text-xs font-medium text-amber-600 underline dark:text-amber-400">
        {editLabel}
      </button>
    </div>
  );
}

function chipToggle<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Step1({
  control,
  getValues,
  setValue,
  lang,
}: {
  control: Control<FormValues>;
  getValues: UseFormGetValues<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  lang: IntakeLang;
}) {
  const spoken = useWatch({ control, name: "step1.spokenLanguages" }) ?? [];
  useEffect(() => {
    const g = getValues("step1.guideLanguage");
    if (spoken.length > 0 && !spoken.includes(g)) {
      setValue("step1.guideLanguage", spoken[0], { shouldValidate: true });
    }
  }, [spoken, getValues, setValue]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeT(lang, "step1.eyebrow")}</p>
        <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeT(lang, "step1.title")}</h2>
      </div>
      <Field label={intakeT(lang, "step1.docsLang")} hint={intakeT(lang, "step1.docsLangSub")}>
        <Controller
          name="step1.preferredLanguage"
          control={control}
          render={({ field }) => (
            <select {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-teal-400">
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {languageChoiceLabel(lang, l.value)}
                </option>
              ))}
            </select>
          )}
        />
      </Field>
      <Field label={intakeT(lang, "step1.name")}>
        <Controller
          name="step1.fullName"
          control={control}
          render={({ field }) => (
            <input {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-teal-400" />
          )}
        />
      </Field>
      <Field label={intakeT(lang, "step1.email")}>
        <Controller
          name="step1.email"
          control={control}
          render={({ field }) => (
            <input {...field} type="email" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-teal-400" />
          )}
        />
      </Field>
      <Field label={intakeT(lang, "step1.phone")}>
        <div className="flex gap-2">
          <Controller
            name="step1.phonePrefix"
            control={control}
            render={({ field }) => (
              <select {...field} className="w-[120px] shrink-0 rounded-xl border border-gray-300 bg-white px-2 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                {PHONE_PREFIXES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          />
          <Controller
            name="step1.phoneLocal"
            control={control}
            render={({ field }) => (
              <input {...field} type="tel" placeholder="6 12 34 56 78" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-teal-400" />
            )}
          />
        </div>
      </Field>
      <Field label={intakeT(lang, "step1.contactPref")}>
        <Controller
          name="step1.contactMethod"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {CONTACT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => field.onChange(m.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${field.value === m.value ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"}`}
                >
                  {contactMethodLabel(lang, m.value)}
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Field label={intakeT(lang, "step1.spoken")} hint={intakeT(lang, "step1.spokenSub")}>
        <Controller
          name="step1.spokenLanguages"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const code = l.value as IntakeLang;
                const on = field.value.includes(code);
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => {
                      const next = chipToggle(field.value, code);
                      if (next.length === 0) return;
                      field.onChange(next);
                    }}
                    className={`rounded-full border px-3 py-2 text-xs font-medium sm:text-sm ${on ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"}`}
                  >
                    {languageChoiceLabel(lang, l.value)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
      <Field label={intakeT(lang, "step1.guide")} hint={intakeT(lang, "step1.guideSub")}>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{intakeT(lang, "step1.guideHelp")}</p>
        <Controller
          name="step1.guideLanguage"
          control={control}
          render={({ field }) => (
            <select {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-teal-400">
              {spoken.map((code) => (
                <option key={code} value={code}>
                  {languageChoiceLabel(lang, code)}
                </option>
              ))}
            </select>
          )}
        />
      </Field>
    </div>
  );
}

function Step2({
  control,
  watch,
  setValue,
  rangeSelected,
  lang,
}: {
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  rangeSelected: DateRange | undefined;
  lang: IntakeLang;
}) {
  const flex = watch("step2.datesFlexible");
  const n = watch("step2.numTravelers");
  const dur = watch("step2.tripDurationDays");
  const pickerLocale = DATE_FNS_LOCALE[lang];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeField(lang, "s2.e")}</p>
        <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeField(lang, "s2.t")}</h2>
      </div>
      <Field label={intakeField(lang, "s2.tripTypes")}>
        <Controller
          name="step2.tripTypes"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map((t) => {
                const on = field.value.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      field.onChange(on ? field.value.filter((x) => x !== t.value) : [...field.value, t.value])
                    }
                    className={`rounded-full border px-3 py-2 text-xs font-medium sm:text-sm ${on ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"}`}
                  >
                    {tripTypeLabel(lang, t.value)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s2.travelers")}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-3 py-2 text-lg text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onClick={() => setValue("step2.numTravelers", Math.max(1, n - 1))}
          >
            −
          </button>
          <div className="text-center">
            <div className="font-serif text-3xl font-bold text-teal-800 dark:text-teal-300">{n}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{travelerSummaryLabel(lang, n)}</div>
          </div>
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-3 py-2 text-lg text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onClick={() => setValue("step2.numTravelers", Math.min(20, n + 1))}
          >
            +
          </button>
        </div>
      </Field>
      <Field label={`${intakeField(lang, "s2.duration")} : ${dur} ${intakeField(lang, "s2.days")}`}>
        <input
          type="range"
          min={3}
          max={30}
          value={dur}
          onChange={(e) => setValue("step2.tripDurationDays", Number(e.target.value))}
          className="w-full accent-teal-700 dark:accent-teal-500"
        />
        <div className="mt-1 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span>3j</span>
          <span>5</span>
          <span>7</span>
          <span>10</span>
          <span>14</span>
          <span>21</span>
          <span>30j</span>
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <Controller
          name="step2.datesFlexible"
          control={control}
          render={({ field }) => <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 accent-teal-700 dark:accent-teal-500" />}
        />
        {intakeField(lang, "s2.flex")}
      </label>
      {!flex ? (
        <Field label={intakeField(lang, "s2.dates")}>
          <div className="flex justify-center overflow-x-auto rounded-xl bg-gray-100 p-3 dark:bg-gray-800/80">
            <DayPicker
              mode="range"
              locale={pickerLocale}
              classNames={INTAKE_DAY_PICKER_CLASSNAMES}
              selected={rangeSelected}
              onSelect={(r) => {
                setValue("step2.dateFrom", r?.from ? format(r.from, "yyyy-MM-dd") : "");
                setValue("step2.dateTo", r?.to ? format(r.to, "yyyy-MM-dd") : "");
              }}
              numberOfMonths={typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2}
            />
          </div>
        </Field>
      ) : (
        <Field label={intakeField(lang, "s2.period")}>
          <Controller
            name="step2.flexibleSeason"
            control={control}
            render={({ field }) => (
              <select {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                <option value="">{intakeField(lang, "s2.choose")}</option>
                {FLEXIBLE_SEASONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {flexibleSeasonLabel(lang, s.value)}
                  </option>
                ))}
              </select>
            )}
          />
        </Field>
      )}
      <Field label={intakeField(lang, "s2.regions")}>
        <Controller
          name="step2.regions"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REGIONS.map((r) => {
                const on = field.value.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() =>
                      field.onChange(on ? field.value.filter((x) => x !== r.value) : [...field.value, r.value])
                    }
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 text-start text-xs font-semibold text-white transition ${on ? "border-amber-500 ring-2 ring-amber-400/40 dark:border-amber-400" : "border-transparent"}`}
                  >
                    <span className="absolute inset-0 z-0" style={{ background: r.gradient }} />
                    <span className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="relative z-[2] p-2">{regionCardLabel(lang, r.value)}</span>
                    {on && <span className="absolute end-2 top-2 z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white dark:bg-amber-400">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
    </div>
  );
}

function Step3({
  control,
  lang,
}: {
  control: Control<FormValues>;
  lang: IntakeLang;
}) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeField(lang, "s3.e")}</p>
      <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeField(lang, "s3.t")}</h2>
      <Field label={intakeField(lang, "s3.budget")}>
        <Controller
          name="step3.budgetBand"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              {BUDGET_BANDS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => field.onChange(b.value)}
                  className={`w-full rounded-full border px-4 py-3 text-left text-sm ${field.value === b.value ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                >
                  {budgetLabel(lang, b.value)}
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s3.acc")}>
        <Controller
          name="step3.accommodationStyles"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ACCOMMODATION_STYLES.map((a) => {
                const on = field.value.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => field.onChange(chipToggle(field.value, a.value))}
                    className={`rounded-full border px-3 py-2 text-xs ${on ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                  >
                    {accommodationLabel(lang, a.value)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s3.amen")}>
        <Controller
          name="step3.amenities"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = field.value.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => field.onChange(chipToggle(field.value, a.value))}
                    className={`rounded-full border px-3 py-2 text-xs ${on ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                  >
                    {amenityLabel(lang, a.value)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
    </div>
  );
}

function Step4({
  control,
  lang,
}: {
  control: Control<FormValues>;
  lang: IntakeLang;
}) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeField(lang, "s4.e")}</p>
      <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeField(lang, "s4.t")}</h2>
      <Field label={intakeField(lang, "s4.act")}>
        <Controller
          name="step4.activities"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => {
                const on = field.value.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => field.onChange(chipToggle(field.value, a.value))}
                    className={`rounded-full border px-3 py-2 text-xs ${on ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                  >
                    {activityLabel(lang, a.value)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s4.dining")}>
        <Controller
          name="step4.diningPreferences"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {DINING.map((d) => {
                const on = field.value.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => field.onChange(chipToggle(field.value, d.value))}
                    className={`rounded-full border px-3 py-2 text-xs ${on ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                  >
                    {diningLabel(lang, d.value)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s4.pace")}>
        <Controller
          name="step4.pace"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              {PACE_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => field.onChange(p.value)}
                  className={`flex gap-3 rounded-xl border px-4 py-3 text-left text-sm ${field.value === p.value ? "border-teal-800 bg-teal-800/10 dark:border-teal-600 dark:bg-teal-900/30" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{paceTitle(lang, p.value)}</span>
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{paceDesc(lang, p.value)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        />
      </Field>
    </div>
  );
}

function Step5({ control, lang }: { control: Control<FormValues>; lang: IntakeLang }) {
  const visa = useWatch({ control, name: "step5.visa" });
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeField(lang, "s5.e")}</p>
      <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeField(lang, "s5.t")}</h2>
      <Field label={intakeField(lang, "s5.diet")}>
        <Controller
          name="step5.dietaryNotes"
          control={control}
          render={({ field }) => <textarea {...field} rows={3} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />}
        />
      </Field>
      <Field label={intakeField(lang, "s5.med")}>
        <Controller
          name="step5.medicalNotes"
          control={control}
          render={({ field }) => <textarea {...field} rows={3} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />}
        />
        <p className="mt-2 flex gap-2 rounded-lg bg-teal-600/10 p-3 text-xs text-gray-600 dark:bg-teal-500/15 dark:text-gray-300">
          {intakeField(lang, "s5.confidential")}
        </p>
      </Field>
      <Field label={intakeField(lang, "s5.ins")}>
        <Controller
          name="step5.insurance"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {INSURANCE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => field.onChange(o.value)}
                  className={`rounded-full border px-3 py-2 text-xs ${field.value === o.value ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                >
                  {insuranceLabel(lang, o.value)}
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s5.visa")}>
        <Controller
          name="step5.visa"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              {VISA_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => field.onChange(o.value)}
                  className={`rounded-full border px-3 py-2 text-left text-xs ${field.value === o.value ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                >
                  {visaLabel(lang, o.value)}
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      {visa === "other" ? (
        <Field label={intakeField(lang, "s5.visaD")}>
          <Controller
            name="step5.visaOtherDetail"
            control={control}
            render={({ field: f }) => <input {...f} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />}
          />
        </Field>
      ) : null}
      <Field label={intakeField(lang, "s5.flights")}>
        <Controller
          name="step5.flights"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {FLIGHT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => field.onChange(o.value)}
                  className={`rounded-full border px-3 py-2 text-xs ${field.value === o.value ? "border-teal-800 bg-teal-800 text-white dark:border-teal-600 dark:bg-teal-600" : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"}`}
                >
                  {flightOptLabel(lang, o.value)}
                </button>
              ))}
            </div>
          )}
        />
      </Field>
    </div>
  );
}

function Step6({
  control,
  watch,
  setValue,
  lang,
}: {
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  lang: IntakeLang;
}) {
  const order = watch("step6.priorityOrder");
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeField(lang, "s6.e")}</p>
      <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeField(lang, "s6.t")}</h2>
      <Field label={intakeField(lang, "s6.rank")}>
        <PriorityRankList
          ids={order}
          getItemLabel={(id) => priorityLabel(lang, id)}
          onChange={(next) => setValue("step6.priorityOrder", next, { shouldValidate: true })}
        />
      </Field>
      <Field label={intakeField(lang, "s6.free")}>
        <Controller
          name="step6.freeText"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              rows={4}
              placeholder={intakeField(lang, "s6.placeholder")}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          )}
        />
      </Field>
      <Field label={intakeField(lang, "s6.ref")}>
        <Controller
          name="step6.referralSource"
          control={control}
          render={({ field }) => (
            <select {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">{intakeField(lang, "s2.choose")}</option>
              {REFERRAL_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {referralLabel(lang, s.value)}
                </option>
              ))}
            </select>
          )}
        />
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300">
        <Controller
          name="step6.marketingOptIn"
          control={control}
          render={({ field }) => <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700 dark:accent-teal-500" />}
        />
        <span>{intakeField(lang, "s6.mkt")}</span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300">
        <Controller
          name="step6.consent"
          control={control}
          render={({ field }) => <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700 dark:accent-teal-500" />}
        />
        <span>
          {intakeField(lang, "s6.consentStart")}{" "}
          <a href="https://www.colombiesurmesure.com" className="text-teal-900 dark:text-teal-300 underline">
            {intakeField(lang, "s6.privacy")}
          </a>
        </span>
      </label>
    </div>
  );
}

function Step7({ control, lang }: { control: Control<FormValues>; lang: IntakeLang }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">{intakeField(lang, "s7.e")}</p>
        <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">{intakeField(lang, "s7.t")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{intakeField(lang, "s7.intro")}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{intakeField(lang, "s7.opt")}</p>
      </div>

      <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-300">{intakeField(lang, "s7.arr")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={intakeField(lang, "s7.airline")}>
            <Controller name="step7.arrivalAirline" control={control} render={({ field }) => <input {...field} placeholder="ex. Air France" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.fn")}>
            <Controller name="step7.arrivalFlightNumber" control={control} render={({ field }) => <input {...field} placeholder="ex. AF436" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.date")}>
            <Controller name="step7.arrivalDate" control={control} render={({ field }) => <input {...field} type="date" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.arrT")}>
            <Controller name="step7.arrivalTime" control={control} render={({ field }) => <input {...field} type="time" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.cityArr")}>
            <Controller name="step7.arrivalCity" control={control} render={({ field }) => <input {...field} placeholder="Bogotá" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-300">{intakeField(lang, "s7.dep")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={intakeField(lang, "s7.airline")}>
            <Controller name="step7.departureAirline" control={control} render={({ field }) => <input {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.fn")}>
            <Controller name="step7.departureFlightNumber" control={control} render={({ field }) => <input {...field} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.date")}>
            <Controller name="step7.departureDate" control={control} render={({ field }) => <input {...field} type="date" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.depT")}>
            <Controller name="step7.departureTime" control={control} render={({ field }) => <input {...field} type="time" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
          <Field label={intakeField(lang, "s7.cityDep")}>
            <Controller name="step7.departureCity" control={control} render={({ field }) => <input {...field} placeholder="Bogotá" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</label>
      {hint ? <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
      {children}
    </div>
  );
}
