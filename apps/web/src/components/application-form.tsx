import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Save } from "lucide-react";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  applicationCreateSchema,
  type ApplicationCreateInput,
  type ApplicationDto,
} from "@sei/shared";

import { Button, FieldError, Panel } from "./ui";

interface ApplicationFormProps {
  initialApplication?: ApplicationDto | undefined;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | undefined;
  onSubmit(input: ApplicationCreateInput): Promise<void>;
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultValues(application?: ApplicationDto): ApplicationCreateInput {
  return {
    title: application?.title ?? "",
    organizationName: application?.organizationName ?? "",
    type: application?.type ?? "JOB",
    status: application?.status ?? "WISHLIST",
    sourceUrl: application?.sourceUrl ?? null,
    sourceName: application?.sourceName ?? null,
    location: application?.location ?? null,
    workMode: application?.workMode ?? null,
    salaryMin: application?.salaryMin ? Number(application.salaryMin) : null,
    salaryMax: application?.salaryMax ? Number(application.salaryMax) : null,
    currency: application?.currency ?? null,
    description: application?.description ?? null,
    appliedAt: application?.appliedAt ?? null,
    deadlineAt: application?.deadlineAt ?? null,
    nextStepAt: application?.nextStepAt ?? null,
  };
}

export function ApplicationForm({
  initialApplication,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
}: ApplicationFormProps) {
  const form = useForm<ApplicationCreateInput>({
    resolver: zodResolver(applicationCreateSchema),
    defaultValues: defaultValues(initialApplication),
  });

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      {submitError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-300/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-100"
        >
          {submitError}
        </div>
      ) : null}
      <Panel className="p-5 sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            Basics
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Peluang yang ingin kamu track
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Role atau judul"
            error={form.formState.errors.title?.message}
            required
          >
            <input
              autoFocus
              className="input"
              placeholder="Backend Intern"
              {...form.register("title")}
            />
          </Field>
          <Field
            label="Perusahaan atau client"
            error={form.formState.errors.organizationName?.message}
            required
          >
            <input
              className="input"
              placeholder="Contoh Teknologi"
              {...form.register("organizationName")}
            />
          </Field>
          <Field
            label="Jenis"
            error={form.formState.errors.type?.message}
            required
          >
            <select className="input" {...form.register("type")}>
              <option value="JOB">Job</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </Field>
          <Field
            label="Status"
            error={form.formState.errors.status?.message}
            required
          >
            <select className="input" {...form.register("status")}>
              <option value="WISHLIST">Wishlist</option>
              <option value="APPLIED">Applied</option>
              <option value="INTERVIEW">Interview</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Field>
          <Field label="Lokasi" error={form.formState.errors.location?.message}>
            <input
              className="input"
              placeholder="Jakarta"
              {...form.register("location")}
            />
          </Field>
          <Field
            label="Mode kerja"
            error={form.formState.errors.workMode?.message}
          >
            <Controller
              control={form.control}
              name="workMode"
              render={({ field }) => (
                <select
                  className="input"
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(event) =>
                    field.onChange(event.target.value || null)
                  }
                  ref={field.ref}
                >
                  <option value="">Belum ditentukan</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                </select>
              )}
            />
          </Field>
        </div>
      </Panel>

      <Panel className="p-5 sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            Process
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Sumber dan konteks
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="URL sumber"
            error={form.formState.errors.sourceUrl?.message}
          >
            <input
              className="input"
              type="url"
              placeholder="https://…"
              {...form.register("sourceUrl")}
            />
          </Field>
          <Field
            label="Nama sumber"
            error={form.formState.errors.sourceName?.message}
          >
            <input
              className="input"
              placeholder="Career page, LinkedIn, referral"
              {...form.register("sourceName")}
            />
          </Field>
          <Field
            label="Estimasi minimum"
            error={form.formState.errors.salaryMin?.message}
          >
            <input
              className="input"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="5000000"
              {...form.register("salaryMin", {
                setValueAs: (value) => (value === "" ? null : Number(value)),
              })}
            />
          </Field>
          <Field
            label="Estimasi maksimum"
            error={form.formState.errors.salaryMax?.message}
          >
            <input
              className="input"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="8000000"
              {...form.register("salaryMax", {
                setValueAs: (value) => (value === "" ? null : Number(value)),
              })}
            />
          </Field>
          <Field
            label="Mata uang"
            error={form.formState.errors.currency?.message}
          >
            <input
              className="input"
              maxLength={3}
              placeholder="IDR"
              {...form.register("currency")}
            />
          </Field>
          <div />
          <Field
            className="md:col-span-2"
            label="Catatan konteks"
            error={form.formState.errors.description?.message}
          >
            <textarea
              className="input min-h-30 resize-y"
              placeholder="Hal yang perlu dipersiapkan, scope, atau link penting…"
              {...form.register("description")}
            />
          </Field>
        </div>
      </Panel>

      <Panel className="p-5 sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            Deadline
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
            <CalendarDays className="size-5 text-[#82a7ff]" aria-hidden />
            Waktu dalam zona lokalmu
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field
            label="Tanggal apply"
            error={form.formState.errors.appliedAt?.message}
          >
            <input
              className="input"
              type="date"
              {...form.register("appliedAt")}
            />
          </Field>
          <Controller
            control={form.control}
            name="deadlineAt"
            render={({ field }) => (
              <Field
                label="Deadline"
                error={form.formState.errors.deadlineAt?.message}
              >
                <input
                  className="input"
                  type="datetime-local"
                  value={toDateTimeLocal(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    )
                  }
                  ref={field.ref}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="nextStepAt"
            render={({ field }) => (
              <Field
                label="Langkah berikutnya"
                error={form.formState.errors.nextStepAt?.message}
              >
                <input
                  className="input"
                  type="datetime-local"
                  value={toDateTimeLocal(field.value)}
                  onBlur={field.onBlur}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    )
                  }
                  ref={field.ref}
                />
              </Field>
            )}
          />
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          <Save className="size-4" aria-hidden />
          {submitting ? "Menyimpan…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  required,
  className,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
  required?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label}
        {required ? <span className="text-[#82a7ff]"> *</span> : null}
      </span>
      {children}
      <FieldError message={error} />
    </label>
  );
}
