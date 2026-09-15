import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Save } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  applicationCreateSchema,
  applicationStatus,
  applicationType,
  workMode,
  type ApplicationCreateInput,
  type ApplicationDto,
  type ApplicationType,
  type WorkMode,
} from "@sei/shared";

import { formatDate, formatDateTime, statusLabel } from "../lib/presentation";
import { useIsOffline } from "../network";
import { colors, spacing } from "../theme";
import { Button, Card, Field } from "./ui";

interface ApplicationFormProps {
  initialApplication?: ApplicationDto | undefined;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | undefined;
  onSubmit(input: ApplicationCreateInput): Promise<void>;
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
  const offline = useIsOffline();
  const form = useForm<ApplicationCreateInput>({
    resolver: zodResolver(applicationCreateSchema),
    defaultValues: defaultValues(initialApplication),
  });

  async function submitValidated(input: ApplicationCreateInput): Promise<void> {
    if (
      input.deadlineAt &&
      (!initialApplication || form.formState.dirtyFields.deadlineAt) &&
      new Date(input.deadlineAt).getTime() <= Date.now()
    ) {
      form.setError("deadlineAt", {
        message: "Deadline harus berada setelah waktu sekarang.",
      });
      return;
    }

    await onSubmit(input);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {submitError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      <Card style={styles.section}>
        <SectionTitle eyebrow="Basics" title="Peluang yang kamu track" />
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field
              label="Role atau judul *"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Backend Intern"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="organizationName"
          render={({ field, fieldState }) => (
            <Field
              label="Perusahaan atau client *"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Contoh Teknologi"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="type"
          render={({ field, fieldState }) => (
            <ChoiceField
              label="Jenis *"
              value={field.value}
              values={applicationType}
              labelFor={typeLabel}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="status"
          render={({ field, fieldState }) => (
            <ChoiceField
              label="Status *"
              value={field.value}
              values={applicationStatus}
              labelFor={statusLabel}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="location"
          render={({ field, fieldState }) => (
            <Field
              label="Lokasi"
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Jakarta"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="workMode"
          render={({ field, fieldState }) => (
            <NullableChoiceField
              label="Mode kerja"
              value={field.value}
              values={workMode}
              labelFor={workModeLabel}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <SectionTitle eyebrow="Process" title="Sumber dan konteks" />
        <Controller
          control={form.control}
          name="sourceUrl"
          render={({ field, fieldState }) => (
            <Field
              label="URL sumber"
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://…"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="sourceName"
          render={({ field, fieldState }) => (
            <Field
              label="Nama sumber"
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Career page, referral"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="salaryMin"
          render={({ field, fieldState }) => (
            <Field
              label="Estimasi minimum"
              value={field.value == null ? "" : String(field.value)}
              onBlur={field.onBlur}
              onChangeText={(value) =>
                field.onChange(value === "" ? null : Number(value))
              }
              keyboardType="numeric"
              placeholder="5000000"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="salaryMax"
          render={({ field, fieldState }) => (
            <Field
              label="Estimasi maksimum"
              value={field.value == null ? "" : String(field.value)}
              onBlur={field.onBlur}
              onChangeText={(value) =>
                field.onChange(value === "" ? null : Number(value))
              }
              keyboardType="numeric"
              placeholder="8000000"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="currency"
          render={({ field, fieldState }) => (
            <Field
              label="Mata uang"
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="characters"
              maxLength={3}
              placeholder="IDR"
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field
              label="Catatan konteks"
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              multiline
              placeholder="Scope, persiapan, atau link penting…"
              error={fieldState.error?.message}
            />
          )}
        />
      </Card>

      <Card style={styles.section}>
        <SectionTitle eyebrow="Deadline" title="Waktu dalam zona lokalmu" />
        <Controller
          control={form.control}
          name="appliedAt"
          render={({ field, fieldState }) => (
            <DateField
              label="Tanggal apply"
              mode="date"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="deadlineAt"
          render={({ field, fieldState }) => (
            <DateField
              label="Deadline"
              mode="datetime"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="nextStepAt"
          render={({ field, fieldState }) => (
            <DateField
              label="Langkah berikutnya"
              mode="datetime"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Text style={styles.timezone}>
          Zona waktu:{" "}
          {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
        </Text>
      </Card>

      <Button
        label={offline ? "Tersedia saat online" : submitLabel}
        disabled={offline}
        loading={submitting}
        icon={<Save color={colors.text} size={18} />}
        onPress={() => void form.handleSubmit(submitValidated)()}
      />
    </ScrollView>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

function ChoiceField<T extends string>({
  label,
  value,
  values,
  labelFor,
  onChange,
  error,
}: {
  label: string;
  value: T;
  values: readonly T[];
  labelFor(value: T): string;
  onChange(value: T): void;
  error?: string | undefined;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {values.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: value === option }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.choice, value === option && styles.choiceActive]}
          >
            <Text
              style={[
                styles.choiceText,
                value === option && styles.choiceTextActive,
              ]}
            >
              {labelFor(option)}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function NullableChoiceField({
  label,
  value,
  values,
  labelFor,
  onChange,
  error,
}: {
  label: string;
  value: WorkMode | null | undefined;
  values: readonly WorkMode[];
  labelFor(value: WorkMode): string;
  onChange(value: WorkMode | null): void;
  error?: string | undefined;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value == null }}
          onPress={() => onChange(null)}
          style={[styles.choice, value == null && styles.choiceActive]}
        >
          <Text
            style={[
              styles.choiceText,
              value == null && styles.choiceTextActive,
            ]}
          >
            Belum ditentukan
          </Text>
        </Pressable>
        {values.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: value === option }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.choice, value === option && styles.choiceActive]}
          >
            <Text
              style={[
                styles.choiceText,
                value === option && styles.choiceTextActive,
              ]}
            >
              {labelFor(option)}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  error,
  mode,
}: {
  label: string;
  value: string | null | undefined;
  onChange(value: string | null): void;
  error?: string | undefined;
  mode: "date" | "datetime";
}) {
  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const selected = value
    ? mode === "date"
      ? parseDateOnly(value)
      : new Date(value)
    : new Date();

  function pick(event: DateTimePickerEvent, date?: Date): void {
    if (event.type === "dismissed" || !date) {
      setOpen(false);
      return;
    }

    if (
      Platform.OS === "android" &&
      mode === "datetime" &&
      pickerMode === "date"
    ) {
      setDraftDate(date);
      setPickerMode("time");
      setOpen(false);
      requestAnimationFrame(() => setOpen(true));
      return;
    }

    setOpen(false);

    if (Platform.OS === "android" && mode === "datetime") {
      const combined = new Date(draftDate ?? selected);
      combined.setHours(date.getHours(), date.getMinutes(), 0, 0);
      onChange(combined.toISOString());
      return;
    }

    onChange(mode === "date" ? toLocalDate(date) : date.toISOString());
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pilih ${label}`}
          onPress={() => {
            setDraftDate(selected);
            setPickerMode("date");
            setOpen(true);
          }}
          style={styles.dateButton}
        >
          <CalendarDays color={colors.accent} size={18} />
          <Text style={styles.dateText}>
            {mode === "date"
              ? formatDate(value ?? null)
              : formatDateTime(value ?? null)}
          </Text>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)}>
            <Text style={styles.clearText}>Hapus</Text>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={selected}
          mode={
            mode === "datetime" && Platform.OS === "ios"
              ? "datetime"
              : pickerMode
          }
          onChange={pick}
          {...(mode === "datetime" && pickerMode === "date"
            ? { minimumDate: new Date() }
            : {})}
          themeVariant="dark"
        />
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function typeLabel(value: ApplicationType): string {
  return value === "JOB"
    ? "Job"
    : value === "INTERNSHIP"
      ? "Internship"
      : "Freelance";
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12);
}

function toLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function workModeLabel(value: WorkMode): string {
  return value === "REMOTE"
    ? "Remote"
    : value === "HYBRID"
      ? "Hybrid"
      : "On-site";
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: spacing.screen, paddingBottom: 40 },
  section: { gap: 18 },
  sectionHeading: { gap: 5, marginBottom: 2 },
  eyebrow: {
    color: "#82A7FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" },
  errorBanner: { backgroundColor: "#3A1C23", borderRadius: 12, padding: 14 },
  errorText: { color: "#FF9CA7", fontSize: 12, lineHeight: 18 },
  fieldGroup: { gap: 8 },
  label: { color: "#D6DCE7", fontSize: 13, fontWeight: "600" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  choiceActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  choiceText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  choiceTextActive: { color: "#B9CCFF" },
  dateRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  dateButton: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dateText: { color: colors.text, fontSize: 15 },
  clearText: {
    color: "#FF9CA7",
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 12,
  },
  timezone: { color: colors.muted, fontSize: 12 },
});
