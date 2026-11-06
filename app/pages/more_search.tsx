/**
 * @file 更多搜索页：列出未做接口适配的站点，供用户手动跳转检索。
 */

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

// 站点索引，与 icons 目录下的图标按 icon 字段一一对应
import sources from "@/assets/sources/index.json";

const SOURCES_PATH = "@/assets/icons/sources";

/** 站点图标映射表；RN 不支持动态 require，只能逐个写死 */
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

/** 站点配置条目 */
type SourceItem = {
  id: number;
  name: string;
  url: string;
  desc: string | null;
  icon: string;
  enabled: boolean;
  adaptation: boolean;
};

/** 取图标资源，缺省时回退到默认图标 */
function getIcon(iconName: string) {
  return iconMap[iconName] ?? defaultIcon;
}

export default function SearchArchiveScreen() {
  const navigation = useNavigation();
  // 只展示已启用但没有做接口适配的站点
  const data = (sources as SourceItem[]).filter(item => item.adaptation === false && item.enabled === true);
  const router = useRouter();

  /** 渲染单个站点卡片，点击进入内嵌浏览器 */
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
      <StatusBar style="light" />

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
  /** 页面骨架 */
  container: {
    flex: 1,
    backgroundColor: '#05070C'
  },
  list: {
    padding: 16,
  },

  /** 站点卡片 */
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
