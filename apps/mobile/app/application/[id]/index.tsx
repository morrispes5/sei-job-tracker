import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  Archive,
  ExternalLink,
  FilePenLine,
  RotateCcw,
  Trash2,
  UserRoundPlus,
} from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  apiPaths,
  applicationContactCreateSchema,
  applicationNoteBodySchema,
  applicationStatus,
  type ApplicationContactCreateInput,
  type ApplicationDetailDto,
  type ApplicationNoteBodyInput,
} from "@sei/shared";

import { useAuth } from "../../../src/auth/auth-provider";
import {
  Button,
  Card,
  Field,
  LoadingState,
  MessageState,
  Screen,
  StatusChip,
} from "../../../src/components/ui";
import type { ApiRequestOptions } from "../../../src/lib/api";
import {
  activityLabel,
  errorMessage,
  formatDate,
  formatDateTime,
  statusLabel,
} from "../../../src/lib/presentation";
import { useIsOffline } from "../../../src/network";
import { colors, spacing } from "../../../src/theme";

interface DetailAction {
  path: string;
  method: NonNullable<ApiRequestOptions["method"]>;
  body?: unknown;
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, request } = useAuth();
  const offline = useIsOffline();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string>();
  const noteForm = useForm<ApplicationNoteBodyInput>({
    resolver: zodResolver(applicationNoteBodySchema),
    defaultValues: { body: "" },
  });
  const contactForm = useForm<ApplicationContactCreateInput>({
    resolver: zodResolver(applicationContactCreateSchema),
    defaultValues: { name: "", role: null, email: null, profileUrl: null },
  });
  const application = useQuery({
    queryKey: ["mobile-application", id],
    queryFn: () =>
      request<ApplicationDetailDto>(apiPaths.applications.byId(id)),
    enabled: Boolean(id) && state.status === "authenticated",
  });
  const action = useMutation({
    mutationFn: ({ path, method, body }: DetailAction) =>
      request<unknown>(
        path,
        body === undefined ? { method } : { method, body },
      ),
  });

  if (state.status === "loading") {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === "anonymous") {
    return <Redirect href="/login" />;
  }
  if (application.isLoading) {
    return (
      <Screen>
        <LoadingState label="Memuat detail…" />
      </Screen>
    );
  }
  if (application.error || !application.data) {
    return (
      <Screen>
        <MessageState
          title="Application tidak ditemukan"
          message={errorMessage(application.error)}
          action={
            <Button
              label="Kembali"
              onPress={() => router.replace("/applications")}
            />
          }
        />
      </Screen>
    );
  }

  const data = application.data;

  async function mutate(
    input: DetailAction,
    after?: () => void,
  ): Promise<void> {
    setActionError(undefined);
    try {
      await action.mutateAsync(input);
      await queryClient.invalidateQueries({
        queryKey: ["mobile-application", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile-applications"],
      });
      await queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
      after?.();
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    }
  }

  function confirmDelete(): void {
    Alert.alert(
      "Hapus application?",
      "Application akan dihapus secara soft delete dan tidak dapat dipulihkan dari UI.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () =>
            void mutate(
              { path: apiPaths.applications.byId(id), method: "DELETE" },
              () => router.replace("/applications"),
            ),
        },
      ],
    );
  }

  async function addNote(input: ApplicationNoteBodyInput): Promise<void> {
    await mutate(
      { path: apiPaths.applications.notes(id), method: "POST", body: input },
      () => noteForm.reset(),
    );
  }

  async function addContact(
    input: ApplicationContactCreateInput,
  ): Promise<void> {
    await mutate(
      { path: apiPaths.applications.contacts(id), method: "POST", body: input },
      () => contactForm.reset(),
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.organization}>{data.organizationName}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {data.title}
            </Text>
            <View style={styles.status}>
              <StatusChip status={data.status} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit application"
            onPress={() =>
              router.push({
                pathname: "/application/[id]/edit",
                params: { id },
              })
            }
            style={styles.iconButton}
          >
            <FilePenLine color={colors.text} size={21} />
          </Pressable>
        </View>

        {actionError ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>Status pipeline</Text>
          <View style={styles.statusChoices}>
            {applicationStatus.map((status) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{
                  checked: data.status === status,
                  disabled: offline,
                }}
                disabled={offline || action.isPending}
                key={status}
                onPress={() =>
                  void mutate({
                    path: apiPaths.applications.byId(id),
                    method: "PATCH",
                    body: { status },
                  })
                }
                style={[
                  styles.statusChoice,
                  data.status === status && styles.statusChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusChoiceText,
                    data.status === status && styles.statusChoiceTextActive,
                  ]}
                >
                  {statusLabel(status)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>Detail</Text>
          <Detail label="Jenis" value={typeLabel(data.type)} />
          <Detail label="Lokasi" value={data.location ?? "Belum ditentukan"} />
          <Detail
            label="Mode kerja"
            value={data.workMode ?? "Belum ditentukan"}
          />
          <Detail label="Tanggal apply" value={formatDate(data.appliedAt)} />
          <Detail label="Deadline" value={formatDateTime(data.deadlineAt)} />
          <Detail
            label="Langkah berikutnya"
            value={formatDateTime(data.nextStepAt)}
          />
          {data.description ? (
            <Detail label="Konteks" value={data.description} />
          ) : null}
          {data.sourceUrl ? (
            <Button
              variant="secondary"
              label="Buka sumber"
              icon={<ExternalLink color={colors.text} size={17} />}
              onPress={() => {
                if (data.sourceUrl) {
                  void Linking.openURL(data.sourceUrl);
                }
              }}
            />
          ) : null}
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>Catatan</Text>
          <Controller
            control={noteForm.control}
            name="body"
            rules={{ required: "Catatan wajib diisi" }}
            render={({ field, fieldState }) => (
              <Field
                label="Catatan baru"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                multiline
                placeholder="Hasil interview atau hal penting…"
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label="Simpan catatan"
            disabled={offline}
            loading={action.isPending}
            onPress={() => void noteForm.handleSubmit(addNote)()}
          />
          {data.notes.map((note) => (
            <View key={note.id} style={styles.childRow}>
              <View style={styles.childCopy}>
                <Text style={styles.childBody}>{note.body}</Text>
                <Text style={styles.childMeta}>
                  {formatDate(note.createdAt)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hapus catatan"
                disabled={offline}
                onPress={() =>
                  Alert.alert(
                    "Hapus catatan?",
                    "Tindakan ini tidak dapat dibatalkan.",
                    [
                      { text: "Batal", style: "cancel" },
                      {
                        text: "Hapus",
                        style: "destructive",
                        onPress: () =>
                          void mutate({
                            path: apiPaths.applications.noteById(id, note.id),
                            method: "DELETE",
                          }),
                      },
                    ],
                  )
                }
                style={styles.smallIconButton}
              >
                <Trash2 color="#FF9CA7" size={18} />
              </Pressable>
            </View>
          ))}
        </Card>

        <Card style={styles.cardGap}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.cardTitle}>Kontak</Text>
            <UserRoundPlus color={colors.accent} size={20} />
          </View>
          <Controller
            control={contactForm.control}
            name="name"
            rules={{ required: "Nama wajib diisi" }}
            render={({ field, fieldState }) => (
              <Field
                label="Nama"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={contactForm.control}
            name="role"
            render={({ field, fieldState }) => (
              <Field
                label="Peran"
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={contactForm.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                label="Email"
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={contactForm.control}
            name="profileUrl"
            render={({ field, fieldState }) => (
              <Field
                label="Profile URL"
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="none"
                keyboardType="url"
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label="Tambah kontak"
            disabled={offline}
            loading={action.isPending}
            onPress={() => void contactForm.handleSubmit(addContact)()}
          />
          {data.contacts.map((contact) => (
            <View key={contact.id} style={styles.childRow}>
              <View style={styles.childCopy}>
                <Text style={styles.childBody}>{contact.name}</Text>
                <Text style={styles.childMeta}>
                  {contact.role ?? contact.email ?? "Tanpa detail tambahan"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hapus kontak"
                disabled={offline}
                onPress={() =>
                  Alert.alert(
                    "Hapus kontak?",
                    "Tindakan ini tidak dapat dibatalkan.",
                    [
                      { text: "Batal", style: "cancel" },
                      {
                        text: "Hapus",
                        style: "destructive",
                        onPress: () =>
                          void mutate({
                            path: apiPaths.applications.contactById(
                              id,
                              contact.id,
                            ),
                            method: "DELETE",
                          }),
                      },
                    ],
                  )
                }
                style={styles.smallIconButton}
              >
                <Trash2 color="#FF9CA7" size={18} />
              </Pressable>
            </View>
          ))}
        </Card>

        <Card style={styles.cardGap}>
          <Text style={styles.cardTitle}>Activity</Text>
          {data.activities.map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <View style={styles.childCopy}>
                <Text style={styles.childBody}>
                  {activityLabel(activity.type)}
                </Text>
                <Text style={styles.childMeta}>
                  {formatDate(activity.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            label={data.archivedAt ? "Pulihkan dari arsip" : "Arsipkan"}
            disabled={offline}
            loading={action.isPending}
            icon={
              data.archivedAt ? (
                <RotateCcw color={colors.text} size={18} />
              ) : (
                <Archive color={colors.text} size={18} />
              )
            }
            onPress={() =>
              void mutate({
                path: data.archivedAt
                  ? apiPaths.applications.restore(id)
                  : apiPaths.applications.archive(id),
                method: "POST",
              })
            }
          />
          <Button
            variant="danger"
            label="Hapus application"
            disabled={offline}
            icon={<Trash2 color={colors.text} size={18} />}
            onPress={confirmDelete}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function typeLabel(type: string): string {
  return type === "JOB"
    ? "Job"
    : type === "INTERNSHIP"
      ? "Internship"
      : "Freelance";
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: spacing.screen, paddingBottom: 40 },
  headingRow: { alignItems: "flex-start", flexDirection: "row", gap: 14 },
  headingCopy: { flex: 1 },
  organization: {
    color: "#82A7FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 7,
  },
  status: { marginTop: 12 },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  smallIconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  errorBanner: { backgroundColor: "#3A1C23", borderRadius: 12, padding: 13 },
  errorText: { color: "#FF9CA7", fontSize: 13 },
  cardGap: { gap: 16 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  cardHeadingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChoice: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  statusChoiceActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  statusChoiceText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  statusChoiceTextActive: { color: "#B9CCFF" },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  childRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 13,
  },
  childCopy: { flex: 1 },
  childBody: { color: colors.text, fontSize: 14, lineHeight: 21 },
  childMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  activityRow: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
  activityDot: {
    backgroundColor: colors.accent,
    borderRadius: 5,
    height: 9,
    marginTop: 6,
    width: 9,
  },
  actions: { gap: 10 },
});
