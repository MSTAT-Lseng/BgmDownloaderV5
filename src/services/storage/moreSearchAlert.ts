import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_MORE_SEARCH_ALERT = 'more_search_alert';
const DEFAULT_MORE_SEARCH_ALERT = true;

// 获取 more_search_alert
export async function getMoreSearchAlert() {
  try {
    const value = await AsyncStorage.getItem(KEY_MORE_SEARCH_ALERT);
    return value !== null ? value === 'true' : DEFAULT_MORE_SEARCH_ALERT;
  } catch (e) {
    console.warn('getMoreSearchAlert', e);
    return DEFAULT_MORE_SEARCH_ALERT;
  }
}

// 设置 more_search_alert
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