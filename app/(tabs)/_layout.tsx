/**
 * @file 底部标签页布局：自定义标签栏外观，并按当前路由切换顶部标题。
 */

import { Tabs, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import SquareCodeIcon from "@/assets/icons/square-code.svg";
import StarIcon from "@/assets/icons/star.svg";
import CalendarIcon from "../../assets/icons/calendar.svg";

import { AppHeader } from "@/components/app-header";
import { NavigationBar } from 'expo-navigation-bar';

import { Ionicons } from "@expo/vector-icons";

/** 单个标签按钮：图标 + 文字，选中时换用高亮色 */
function TabItem({
  label,
  focused,
  Icon,
}: {
  label: string;
  focused: boolean;
  Icon: React.ComponentType<SvgProps>;
}) {
  const color = focused
    ? "rgba(124, 146, 255, 1)"
    : "rgba(234, 240, 255, 0.55)";

  return (
    <View style={styles.tabItemInner}>
      <View>
        <Icon width={22} height={22} stroke={color} />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 各标签对应的顶部标题
  const titleMap: Record<string, string> = {
    index: "日历",
    source: "源",
    favorite: "收藏",
  };
  // segments 形如 ["(tabs)", "index"]，最后一段即当前标签
  const currentTab = segments[segments.length - 1];
  const title = titleMap[currentTab] ?? "番剧下载";

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      {/* SDK 58：导航栏改为声明式配置，背景色随 edge-to-edge 透明，这里只设置图标明暗 */}
      {Platform.OS === 'android' && <NavigationBar style="dark" />}
      <AppHeader title={title}
        icon={<Ionicons name="settings-outline" size={24} color="#EAF0FF" />} 
        onIconPress={() => router.push({
          pathname: "/settings",
        })}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 12 : 16),
            },
          ],
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: Platform.OS === "android" ? true : false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem label="日历" focused={focused} Icon={CalendarIcon} />
            ),
          }}
        />
        <Tabs.Screen
          name="source"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem label="源" focused={focused} Icon={SquareCodeIcon} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorite"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem label="收藏" focused={focused} Icon={StarIcon} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  /** 外层容器 */
  page: {
    flex: 1,
    backgroundColor: "#05070C",
  },

  /** 自定义标签栏 */
  tabBar: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10, 13, 20, 0.92)",
  },

  /** 单个标签按钮 */
  tabItemInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  tabLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: "rgba(234, 240, 255, 0.55)",
  },

  tabLabelFocused: {
    color: "rgba(234, 240, 255, 0.92)",
    fontWeight: "500",
  },
});
