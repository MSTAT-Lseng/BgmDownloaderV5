import { checkUpdate } from "@/src/services/Update";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { RootSiblingParent } from 'react-native-root-siblings';

export default function RootLayout() {

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
