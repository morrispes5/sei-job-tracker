import { router } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  authLoginSchema,
  authRegisterSchema,
  type AuthLoginInput,
  type AuthRegisterInput,
} from "@sei/shared";

import { useAuth } from "../auth/auth-provider";
import { errorMessage } from "../lib/presentation";
import { colors, spacing } from "../theme";
import { BrandMark } from "./brand-mark";
import { Button, Field } from "./ui";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const loginForm = useForm<AuthLoginInput>({
    resolver: zodResolver(authLoginSchema),
    defaultValues: { email: "", password: "" },
  });
  const registerForm = useForm<
    z.input<typeof authRegisterSchema>,
    undefined,
    AuthRegisterInput
  >({
    resolver: zodResolver(authRegisterSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
  });

  async function submitLogin(input: AuthLoginInput): Promise<void> {
    setPending(true);
    setSubmitError(undefined);
    try {
      await login(input);
      router.replace("/dashboard");
    } catch (error: unknown) {
      setSubmitError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function submitRegister(input: AuthRegisterInput): Promise<void> {
    setPending(true);
    setSubmitError(undefined);
    try {
      await register(input);
      router.replace("/dashboard");
    } catch (error: unknown) {
      setSubmitError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <BrandMark size={58} />
        <Text style={styles.brand}>SEI — JOB TRACKER</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {mode === "login" ? "Masuk ke tracker-mu" : "Buat ruang kendalimu"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "login"
            ? "Lanjutkan proses lamaranmu dari perangkat mana pun."
            : "Satu akun untuk data yang sama di mobile dan web."}
        </Text>

        <View style={styles.securityNote}>
          <LockKeyhole color="#9EB9FF" size={19} />
          <Text style={styles.securityText}>
            Refresh session disimpan di SecureStore perangkat.
          </Text>
        </View>

        {submitError ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        {mode === "login" ? (
          <View style={styles.form}>
            <Controller
              control={loginForm.control}
              name="email"
              rules={{ required: "Email wajib diisi" }}
              render={({ field, fieldState }) => (
                <Field
                  label="Email"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={loginForm.control}
              name="password"
              rules={{ required: "Password wajib diisi" }}
              render={({ field, fieldState }) => (
                <Field
                  label="Password"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  secureTextEntry
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button
              label="Masuk"
              loading={pending}
              onPress={() => void loginForm.handleSubmit(submitLogin)()}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Controller
              control={registerForm.control}
              name="displayName"
              rules={{ required: "Nama wajib diisi" }}
              render={({ field, fieldState }) => (
                <Field
                  label="Nama tampilan"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoComplete="name"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={registerForm.control}
              name="email"
              rules={{ required: "Email wajib diisi" }}
              render={({ field, fieldState }) => (
                <Field
                  label="Email"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={registerForm.control}
              name="password"
              rules={{
                required: "Password wajib diisi",
                minLength: { value: 12, message: "Minimal 12 karakter" },
              }}
              render={({ field, fieldState }) => (
                <Field
                  label="Password"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  secureTextEntry
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button
              label="Buat akun"
              loading={pending}
              onPress={() => void registerForm.handleSubmit(submitRegister)()}
            />
          </View>
        )}

        <Button
          variant="secondary"
          label={mode === "login" ? "Buat akun baru" : "Kembali ke masuk"}
          onPress={() =>
            router.replace(mode === "login" ? "/register" : "/login")
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.screen,
    paddingVertical: 44,
  },
  brand: {
    color: "#82A7FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 22,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 10,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  securityNote: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    padding: 13,
  },
  securityText: { color: "#C9D6F7", flex: 1, fontSize: 12, lineHeight: 18 },
  errorBanner: {
    backgroundColor: "#3A1C23",
    borderRadius: 12,
    marginTop: 16,
    padding: 13,
  },
  errorText: { color: "#FF9CA7", fontSize: 13 },
  form: { gap: 16, marginBottom: 14, marginTop: 24 },
});
