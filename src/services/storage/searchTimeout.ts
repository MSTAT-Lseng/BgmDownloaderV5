/**
 * @file 搜索超时时间的本地存取（AsyncStorage）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SEARCH_TIMEOUT = 'search_timeout';
const DEFAULT_SEARCH_TIMEOUT = 5;

/** 读取搜索超时秒数；未设置或读取失败时返回默认值 5 */
export async function getSearchTimeout() {
  try {
    const value = await AsyncStorage.getItem(KEY_SEARCH_TIMEOUT);
    return value !== null ? Number(value) : DEFAULT_SEARCH_TIMEOUT;
  } catch (e) {
    console.warn('getSearchTimeout error', e);
    return DEFAULT_SEARCH_TIMEOUT;
  }
}

/** 写入搜索超时秒数；写入失败只打日志，不影响调用方流程 */
export async function setSearchTimeout(timeout: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY_SEARCH_TIMEOUT,
      timeout.toString()
    );
  } catch (e) {
    console.warn('setSearchTimeout error', e);
  }
}
