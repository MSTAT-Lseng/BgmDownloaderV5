/**
 * @file 通用顶部标题栏：居中标题，可选左侧返回按钮与右侧功能图标。
 */

import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


/** 标题栏参数 */
interface AppHeaderProps {
  title: string;
  icon?: ReactNode; // 右侧功能图标，传入才渲染
  onIconPress?: () => void; // 右侧图标点击回调
  showBack?: boolean; // 是否显示左侧返回按钮
  onBackPress?: () => void; // 返回按钮点击回调
}

/** 通用标题栏；返回键在左、功能图标在右，两者都用绝对定位，标题始终居中 */
export function AppHeader({ title, icon, onIconPress, showBack, onBackPress }: AppHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        {showBack && (
          <TouchableOpacity 
            style={styles.backContainer} 
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#EAF0FF" />
          </TouchableOpacity>
        )}

        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>

        {icon && (
          <TouchableOpacity 
            style={styles.iconContainer}
            onPress={onIconPress}
            activeOpacity={0.7}
          >
            {icon}
          </TouchableOpacity>
        )}

        <View style={styles.headerDivider} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /** 外层容器，负责顶部安全区 */
  headerSafe: {
    backgroundColor: "#0B0F1A",
  },

  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0B0F1A",
  },

  /** 标题，限制宽度避免压住两侧按钮 */
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 1,
    color: "#EAF0FF",
    maxWidth: '75%',
  },

  iconContainer: {
    position: 'absolute', // 绝对定位贴右侧，保持标题居中
    right: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  backContainer: {
    position: 'absolute', // 绝对定位贴左侧，保持标题居中
    left: 16,
    height: '100%',
    justifyContent: 'center',
    zIndex: 10,
  },
});
