import { useEffect } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

/**
 * Legacy OAuth callback screen — no longer used.
 * The app now uses a Service Account for Google Sheets access (no OAuth needed).
 * This screen simply redirects back to the Sync tab.
 */
export default function GoogleOAuthCallback() {
  const { error } = useLocalSearchParams<{ code?: string; error?: string }>();

  useEffect(() => {
    // Redirect to sync tab after a short delay
    const timer = setTimeout(() => router.replace("/(tabs)/sync"), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      {error ? (
        <>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>✗</Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#EF4444", textAlign: "center" }}>
            Authorization failed
          </Text>
          <Text style={{ fontSize: 14, color: "#9BA1A6", marginTop: 8, textAlign: "center" }}>
            {error}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>↩</Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C", textAlign: "center" }}>
            Redirecting…
          </Text>
        </>
      )}
    </View>
  );
}
