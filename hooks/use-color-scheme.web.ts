/**
 * @file 读取浅色 / 深色模式（Web 平台）：水合前固定返回 light，避免静态渲染时水合不一致。
 */

import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * 支持静态渲染时，主题必须在客户端水合完成后重新计算；
 * 未水合前统一返回 'light'，与静态渲染结果保持一致。
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
