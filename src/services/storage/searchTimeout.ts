import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SEARCH_TIMEOUT = 'search_timeout';
const DEFAULT_SEARCH_TIMEOUT = 5;

// 获取 search_timeout（不存在时返回默认值 5）
export async function getSearchTimeout() {
  try {
    const value = await AsyncStorage.getItem(KEY_SEARCH_TIMEOUT);
    return value !== null ? Number(value) : DEFAULT_SEARCH_TIMEOUT;
  } catch (e) {
    console.warn('getSearchTimeout error', e);
    return DEFAULT_SEARCH_TIMEOUT;
  }
}

// 设置 search_timeout
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