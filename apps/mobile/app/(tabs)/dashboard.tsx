import { useQueries, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { applicationStatus, type ApplicationListResponse } from "@sei/shared";

import { useAuth } from "../../src/auth/auth-provider";
import { ApplicationCard } from "../../src/components/application-card";
import {
  Button,
  Card,
  LoadingState,
  MessageState,
  Screen,
} from "../../src/components/ui";
import { listPath } from "../../src/lib/api";
import { errorMessage, statusLabel } from "../../src/lib/presentation";
import { colors, spacing } from "../../src/theme";

export default function DashboardScreen() {
  const { state, request } = useAuth();
  const statusQueries = useQueries({
    queries: applicationStatus.map((status) => ({
      queryKey: ["mobile-dashboard", "status", status],
      queryFn: () =>
        request<ApplicationListResponse>(listPath({ status, limit: 1 })),
    })),
  });
  const recent = useQuery({
    queryKey: ["mobile-dashboard", "recent"],
    queryFn: () =>
      request<ApplicationListResponse>(
        listPath({ limit: 4, sort: "updatedAt_desc" }),
      ),
  });
  const refreshing =
    recent.isRefetching || statusQueries.some((query) => query.isRefetching);
  const loading =
    recent.isLoading || statusQueries.some((query) => query.isLoading);
  const firstError =
    recent.error ?? statusQueries.find((query) => query.error)?.error;

  async function refreshAll(): Promise<void> {
    await Promise.all([
      recent.refetch(),
      ...statusQueries.map((query) => query.refetch()),
    ]);
  }

  if (loading && !recent.data) {
    return (
      <Screen>
        <LoadingState label="Menyiapkan dashboard…" />
      </Screen>
    );
  }

  if (firstError && !recent.data) {
    return (
      <Screen>
        <MessageState
          title="Dashboard belum dapat dimuat"
          message={errorMessage(firstError)}
          action={
            <Button label="Coba lagi" onPress={() => void refreshAll()} />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshAll()}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PERSONAL CONTROL ROOM</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Halo,{" "}
              {state.status === "authenticated"
                ? state.session.user.displayName
                : ""}
            </Text>
            <Text style={styles.subtitle}>
              Lihat pipeline dan langkah terdekatmu.
            </Text>
          </View>
          <Button
            label="Tambah"
            icon={<Plus color={colors.text} size={18} />}
            onPress={() => router.push("/application/new")}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metrics}
        >
          {applicationStatus.map((status, index) => (
            <Card key={status} style={styles.metric}>
              <Text style={styles.metricLabel}>{statusLabel(status)}</Text>
              <Text style={styles.metricValue}>
                {statusQueries[index]?.data?.meta.total ?? 0}
              </Text>
            </Card>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Application terbaru</Text>
          <Text style={styles.sectionMeta}>
            {recent.data?.meta.total ?? 0} total
          </Text>
        </View>
        <View style={styles.list}>
          {recent.data?.data.length ? (
            recent.data.data.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))
          ) : (
            <Card>
              <Text style={styles.emptyTitle}>Belum ada application</Text>
              <Text style={styles.emptyText}>
                Mulai dari peluang pertama yang ingin kamu pantau.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 34 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: "#82A7FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  metrics: { gap: 10, paddingVertical: 24 },
  metric: { minWidth: 132 },
  metricLabel: { color: colors.muted, fontSize: 12 },
  metricValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 16,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  sectionMeta: { color: colors.muted, fontSize: 12 },
  list: { gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptyText: { color: colors.muted, lineHeight: 20, marginTop: 7 },
});
