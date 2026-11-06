/**
 * @file 版本更新检查：对比远程配置与本地版本号，有新版本时弹窗提示。
 */

import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';
import Toast from 'react-native-root-toast';

interface UpdateConfig {
  version: string;
  update_log: string;
  url: string;
  force: boolean;
}

interface UpdateResponse {
  [key: string]: UpdateConfig;
}

const UPDATE_URL = 'https://mstat.top/bgm_downloader/update.json';

/**
 * 检查更新。
 *
 * @param showLatest 是否在“已是最新版本”时给出提示；启动时静默检查应传 false
 */
export const checkUpdate = async (showLatest = false): Promise<void> => {
  try {
    // 优先取 app.json 里配置的版本，其次取原生层版本
    const currentVersion = 
      Constants.expoConfig?.version ?? 
      Constants.nativeAppVersion ?? 
      '0.0.0';

    const platform = Platform.OS as 'ios' | 'android';
    
    // 加时间戳规避 CDN 缓存
    const response = await fetch(`${UPDATE_URL}?token=${Date.now()}`);
    const data: UpdateResponse = await response.json();
    
    const config = data[platform];

    // 版本号不同即视为有新版本
    if (config && config.version !== currentVersion) {
      showUpdateAlert(config);
    } else if (showLatest) {
      Toast.show(`已经是最新版本`, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
      });
    }
  } catch (error) {
    Toast.show(`检查更新失败`, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.CENTER,
    });
    console.log('[UpdateService] 检查更新跳过:', error);
  }
};

/** 弹出更新提示；强制更新时不给取消按钮，也不允许点遮罩关闭 */
const showUpdateAlert = (config: UpdateConfig): void => {
  const buttons: any[] = [
    { 
      text: '立即更新', 
      onPress: () => Linking.openURL(config.url) 
    }
  ];

  if (!config.force) {
    buttons.unshift({ text: '稍后再说', style: 'cancel' });
  }

  Alert.alert(
    `发现新版本 ${config.version}`,
    config.update_log,
    buttons,
    { cancelable: !config.force }
  );
};
