import { router } from "expo-router";
import { CalendarDays, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApplicationDto } from "@sei/shared";

import { formatDate } from "../lib/presentation";
import { colors } from "../theme";
import { StatusChip } from "./ui";

export function ApplicationCard({
  application,
}: {
  application: ApplicationDto;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka ${application.title} di ${application.organizationName}`}
      onPress={() =>
        router.push({
          pathname: "/application/[id]",
          params: { id: application.id },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {application.title}
          </Text>
          <Text numberOfLines={1} style={styles.organization}>
            {application.organizationName}
          </Text>
        </View>
        <ChevronRight color={colors.muted} size={20} />
      </View>
      <View style={styles.metaRow}>
        <StatusChip status={application.status} />
        <View style={styles.deadline}>
          <CalendarDays color={colors.muted} size={15} />
          <Text style={styles.deadlineText}>
            {formatDate(application.deadlineAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  pressed: { opacity: 0.78 },
  topRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: "700" },
  organization: { color: colors.muted, fontSize: 14, marginTop: 5 },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deadline: { alignItems: "center", flexDirection: "row", gap: 6 },
  deadlineText: { color: colors.muted, fontSize: 12 },
});
