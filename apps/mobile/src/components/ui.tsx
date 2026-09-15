import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import type { ApplicationStatus } from "@sei/shared";

import { useIsOffline } from "../network";
import { colors } from "../theme";
import { statusLabel } from "../lib/presentation";

export function Screen({ children }: PropsWithChildren) {
  const offline = useIsOffline();

  return (
    <View style={styles.screen}>
      {offline ? (
        <View accessibilityRole="alert" style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline · data cache hanya dapat dibaca
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle | undefined }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  icon,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  variant?: "primary" | "secondary" | "danger" | undefined;
  icon?: ReactNode | undefined;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.buttonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : icon}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | undefined }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#697386"
        selectionColor={colors.accent}
        style={[styles.input, props.multiline && styles.textarea]}
        {...props}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function StatusChip({ status }: { status: ApplicationStatus }) {
  const tone = statusTone[status];
  return (
    <View
      accessibilityLabel={`Status ${statusLabel(status)}`}
      style={[styles.statusChip, { backgroundColor: tone.background }]}
    >
      <View style={[styles.statusDot, { backgroundColor: tone.foreground }]} />
      <Text style={[styles.statusText, { color: tone.foreground }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function LoadingState({ label = "Memuat…" }: { label?: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function MessageState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode | undefined;
}) {
  return (
    <View style={styles.centerState}>
      <Text accessibilityRole="header" style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateText}>{message}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

const statusTone: Record<
  ApplicationStatus,
  { background: string; foreground: string }
> = {
  WISHLIST: { background: "#242936", foreground: "#C7CFDC" },
  APPLIED: { background: "#18284D", foreground: "#9EB9FF" },
  INTERVIEW: { background: "#3A2C12", foreground: "#FFD58A" },
  OFFER: { background: "#123429", foreground: "#78E5B8" },
  REJECTED: { background: "#3A1C23", foreground: "#FF9CA7" },
};

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  offlineBanner: {
    alignItems: "center",
    backgroundColor: "#3A2C12",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: { color: "#FFD58A", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: "#451C25", borderColor: "#71303D" },
  buttonDisabled: { opacity: 0.48 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  field: { gap: 8 },
  label: { color: "#D6DCE7", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.elevated,
    borderColor: "rgba(255,255,255,0.11)",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  textarea: { minHeight: 112, textAlignVertical: "top" },
  fieldError: { color: "#FF9CA7", fontSize: 12 },
  statusChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusText: { fontSize: 12, fontWeight: "700" },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center",
  },
  stateAction: { marginTop: 20, width: "100%" },
});
