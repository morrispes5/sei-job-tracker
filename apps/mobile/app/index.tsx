import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { product } from "@sei/shared";

export default function FoundationScreen() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.name}>
        {product.name}
      </Text>
      <Text style={styles.tagline}>{product.tagline}</Text>
      <Text style={styles.note}>Mobile workspace foundation</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: "#090B10",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  name: {
    color: "#F4F7FB",
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -2,
  },
  tagline: {
    color: "#5B8CFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  note: {
    color: "#98A2B3",
    fontSize: 14,
    marginTop: 28,
  },
});
