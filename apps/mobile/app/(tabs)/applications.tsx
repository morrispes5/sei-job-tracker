import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Archive, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  applicationStatus,
  type ApplicationListResponse,
  type ApplicationStatus,
} from "@sei/shared";

import { useAuth } from "../../src/auth/auth-provider";
import { ApplicationCard } from "../../src/components/application-card";
import {
  Button,
  LoadingState,
  MessageState,
  Screen,
} from "../../src/components/ui";
import { listPath } from "../../src/lib/api";
import { errorMessage, statusLabel } from "../../src/lib/presentation";
import { colors, spacing } from "../../src/theme";

export default function ApplicationsScreen() {
  const { request } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | undefined>();
  const [archived, setArchived] = useState(false);
  const applications = useInfiniteQuery({
    queryKey: ["mobile-applications", { query, status, archived }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      request<ApplicationListResponse>(
        listPath({
          q: query || undefined,
          status,
          archived: archived ? "true" : "false",
          page: pageParam,
          limit: 20,
        }),
      ),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });
  const data = applications.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={applications.isRefetching}
        onRefresh={() => void applications.refetch()}
        onEndReached={() => {
          if (applications.hasNextPage && !applications.isFetchingNextPage) {
            void applications.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={styles.eyebrow}>PIPELINE</Text>
                <Text accessibilityRole="header" style={styles.title}>
                  Applications
                </Text>
              </View>
              <Button
                label="Tambah"
                icon={<Plus color={colors.text} size={18} />}
                onPress={() => router.push("/application/new")}
              />
            </View>
            <View style={styles.searchBox}>
              <Search color={colors.muted} size={19} />
              <TextInput
                accessibilityLabel="Cari application"
                value={query}
                onChangeText={setQuery}
                placeholder="Cari role atau perusahaan"
                placeholderTextColor="#697386"
                selectionColor={colors.accent}
                style={styles.searchInput}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[undefined, ...applicationStatus] as const}
              keyExtractor={(item) => item ?? "ALL"}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === item }}
                  onPress={() => setStatus(item)}
                  style={[
                    styles.filter,
                    status === item && styles.filterActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      status === item && styles.filterTextActive,
                    ]}
                  >
                    {item ? statusLabel(item) : "Semua"}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: archived }}
              onPress={() => setArchived((value) => !value)}
              style={[
                styles.archiveToggle,
                archived && styles.archiveToggleActive,
              ]}
            >
              <Archive color={archived ? "#B9CCFF" : colors.muted} size={17} />
              <Text
                style={[
                  styles.archiveText,
                  archived && styles.filterTextActive,
                ]}
              >
                Tampilkan arsip
              </Text>
            </Pressable>
            {applications.isLoading ? (
              <LoadingState label="Memuat application…" />
            ) : null}
            {applications.error && !applications.data ? (
              <MessageState
                title="Application belum dapat dimuat"
                message={errorMessage(applications.error)}
                action={
                  <Button
                    label="Coba lagi"
                    onPress={() => void applications.refetch()}
                  />
                }
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !applications.isLoading && !applications.error ? (
            <MessageState
              title="Belum ada hasil"
              message="Ubah filter atau tambahkan application pertamamu."
              action={
                <Button
                  label="Tambah application"
                  onPress={() => router.push("/application/new")}
                />
              }
            />
          ) : null
        }
        ListFooterComponent={
          applications.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.accent}
              style={styles.footerLoader}
            />
          ) : null
        }
        renderItem={({ item }) => <ApplicationCard application={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.screen, paddingBottom: 34 },
  separator: { height: 12 },
  headerContent: { marginBottom: 18 },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headingCopy: { flex: 1 },
  eyebrow: {
    color: "#82A7FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 7 },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: { color: colors.text, flex: 1, fontSize: 15 },
  filters: { gap: 8, paddingVertical: 13 },
  filter: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 15,
  },
  filterActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#B9CCFF" },
  archiveToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  archiveToggleActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  archiveText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  footerLoader: { marginVertical: 20 },
});
