import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppHeader } from "../components/app-header";


export default function SearchScreen() {
  // 获取 URL 参数中的 q
  const { q } = useLocalSearchParams<{ q: string }>();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <AppHeader title={q} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070C" },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  title: { color: "#E9EDF5", fontSize: 16 },
  empty: { color: "#90A0B8", textAlign: "center", marginTop: 50 },
});
