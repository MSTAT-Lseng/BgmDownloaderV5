import { AppHeader } from '@/components/app-header';
import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// 1. 直接导入 JSON
import sources from "@/assets/sources/index.json";

const SOURCES_PATH = "@/assets/icons/sources";
// 2. 图标映射表（Expo 必须这样写）
const iconMap: Record<string, any> = {
  "dalvdm": require(`${SOURCES_PATH}/dalvdm.png`),
  "animoe": require(`${SOURCES_PATH}/animoe.png`),
  "fsdm02": require(`${SOURCES_PATH}/fsdm02.png`),
  "silisilifun": require(`${SOURCES_PATH}/silisilifun.png`),
  "jzacg": require(`${SOURCES_PATH}/jzacg.png`),
  "xuandm": require(`${SOURCES_PATH}/xuandm.png`),
  "lmm58": require(`${SOURCES_PATH}/lmm58.png`),
  "5dm": require(`${SOURCES_PATH}/5dm.png`),
  "xdm6": require(`${SOURCES_PATH}/xdm6.png`),
  "anime1": require(`${SOURCES_PATH}/anime1.png`),
};

const defaultIcon = require(`${SOURCES_PATH}/default.png`);

type SourceItem = {
  id: number;
  name: string;
  url: string;
  desc: string | null;
  icon: string;
  enabled: boolean;
  adaptation: boolean;
};

function getIcon(iconName: string) {
  return iconMap[iconName] ?? defaultIcon;
}


export default function searchArchiveScreen() {
  const navigation = useNavigation();
  const data = (sources as SourceItem[]).filter(item => !item.adaptation);
  const router = useRouter();

  const renderItem = ({ item }: { item: SourceItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: "/webview",
        params: { url: item.url, type: "player" },
      })}
    >
      <Image
        source={getIcon(item.icon)}
        style={styles.icon}
        resizeMode="contain"
      />

      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.desc ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.desc}
          </Text>
        ) : null}
        <Text style={styles.url}>{item.url}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />

      <AppHeader
        title="更多搜索"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
      

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070C'
  },

  list: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#0B0F1A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  icon: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  desc: {
    color: "#9AA4BF",
    fontSize: 13,
    marginBottom: 4,
  },
  url: {
    color: "#5DA9FF",
    fontSize: 12,
  },
});
