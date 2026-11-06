/**
 * @file “更多搜索”提示的开关状态存取（AsyncStorage）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_MORE_SEARCH_ALERT = 'more_search_alert';
const DEFAULT_MORE_SEARCH_ALERT = true;

/** 读取提示开关；默认开启，读取失败时同样按开启处理 */
export async function getMoreSearchAlert() {
  try {
    const value = await AsyncStorage.getItem(KEY_MORE_SEARCH_ALERT);
    return value !== null ? value === 'true' : DEFAULT_MORE_SEARCH_ALERT;
  } catch (e) {
    console.warn('getMoreSearchAlert', e);
    return DEFAULT_MORE_SEARCH_ALERT;
  }
}

/** 写入提示开关；写入失败只打日志，不影响调用方流程 */
export async function setMoreSearchAlert(status: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY_MORE_SEARCH_ALERT,
      status.toString()
    );
  } catch (e) {
    console.warn('setMoreSearchAlert', e);
  }
}
