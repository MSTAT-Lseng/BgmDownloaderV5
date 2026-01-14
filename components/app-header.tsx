import { Ionicons } from "@expo/vector-icons"; // Expo 内置图标库
import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


interface AppHeaderProps {
  title: string;
  icon?: ReactNode; // 接收外部传入的图标组件
  onIconPress?: () => void; // 图标点击事件
  showBack?: boolean;    // 是否显示返回按钮
  onBackPress?: () => void;
}

export function AppHeader({ title, icon, onIconPress, showBack, onBackPress }: AppHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        {/* 左侧返回按钮 */}
        {showBack && (
          <TouchableOpacity 
            style={styles.backContainer} 
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#EAF0FF" />
          </TouchableOpacity>
        )}

        {/* 增加左右 padding 避免文字紧贴图标或边缘 */}
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>

        {/* 只有在传入 icon 时才渲染按钮 */}
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

  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 1,
    color: "#EAF0FF",
    maxWidth: '75%', // 限制宽度防止覆盖图标
  },

  iconContainer: {
    position: 'absolute', // 绝对定位在右侧
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
    position: 'absolute',
    left: 16, // 定位在左侧
    height: '100%',
    justifyContent: 'center',
    zIndex: 10,
  },
});
