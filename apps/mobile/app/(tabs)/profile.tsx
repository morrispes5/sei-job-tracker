import { LogOut, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../src/auth/auth-provider";
import { BrandMark } from "../../src/components/brand-mark";
import { Button, Card, Screen } from "../../src/components/ui";
import { apiBaseUrl } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

export default function ProfileScreen() {
  const { state, logout } = useAuth();
  const user = state.status === "authenticated" ? state.session.user : null;

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <BrandMark size={54} />
          <View style={styles.copy}>
            <Text accessibilityRole="header" style={styles.name}>
              {user?.displayName}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>
        <Card style={styles.card}>
          <View style={styles.securityHeading}>
            <ShieldCheck color={colors.success} size={20} />
            <Text style={styles.cardTitle}>Session perangkat</Text>
          </View>
          <Text style={styles.cardText}>
            Refresh token tersimpan di SecureStore dan dirotasi setiap refresh.
            Access token hanya berada di memori aplikasi.
          </Text>
        </Card>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Koneksi API</Text>
          <Text selectable style={styles.api}>
            {apiBaseUrl}
          </Text>
          <Text style={styles.cardText}>Zona waktu: {user?.timezone}</Text>
        </Card>
        <Button
          variant="danger"
          label="Keluar dari perangkat ini"
          icon={<LogOut color={colors.text} size={18} />}
          onPress={() => void logout()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: spacing.screen },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
    marginBottom: 8,
  },
  copy: { flex: 1 },
  name: { color: colors.text, fontSize: 24, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 14, marginTop: 5 },
  card: { gap: 10 },
  securityHeading: { alignItems: "center", flexDirection: "row", gap: 9 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  cardText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  api: { color: "#9EB9FF", fontSize: 12, lineHeight: 18 },
});
