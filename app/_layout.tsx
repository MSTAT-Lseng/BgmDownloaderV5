/**
 * @file 根布局：挂载全局 Toast 容器、注册路由栈，并在应用启动时检查更新。
 */

import { checkUpdate } from "@/src/services/Update";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { RootSiblingParent } from 'react-native-root-siblings';

export default function RootLayout() {

  /** 启动时静默检查更新 */
  useEffect(() => {
    checkUpdate();
  }, []);

  return (
    <RootSiblingParent>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </RootSiblingParent>
  );
}
