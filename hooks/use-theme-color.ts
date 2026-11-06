/**
 * @file 按当前主题取色：优先用调用方传入的颜色，否则回退到主题色板。
 *
 * 浅色 / 深色模式的说明见 https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * @param props 分别指定浅色 / 深色下要用的颜色
 * @param colorName 两边取色都没配置时，回退到主题色板里的同名字段
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
