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
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';

import { Ionicons } from "@expo/vector-icons"; // Expo 内置图标库

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
      <View /*style={[styles.circle, focused && styles.circleFocused]}*/>
        <Icon width={22} height={22} stroke={color} />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#090C13');
      NavigationBar.setButtonStyleAsync('light');
    }
  }, []);

  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const titleMap: Record<string, string> = {
    index: "日历",
    source: "源",
    favorite: "收藏",
  };
  // segments 例子：["(tabs)", "index"]
  const currentTab = segments[segments.length - 1];
  const title = titleMap[currentTab] ?? "番剧下载";

  return (
    <View style={styles.page}>
      <StatusBar style="light" translucent={true} />
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
  page: {
    flex: 1,
    backgroundColor: "#05070C",
  },

  tabBar: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10, 13, 20, 0.92)",
  },

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
