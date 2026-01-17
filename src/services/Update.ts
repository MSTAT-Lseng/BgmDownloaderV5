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

export const checkUpdate = async (showLatest = false): Promise<void> => {
  try {
    // 1. 获取当前版本
    // nativeAppVersion 获取原生层版本号，expoConfig 获取 app.json 定义的版本
    const currentVersion = 
      Constants.expoConfig?.version ?? 
      Constants.nativeAppVersion ?? 
      '0.0.0';

    const platform = Platform.OS as 'ios' | 'android';
    
    // 2. 获取远程配置
    const response = await fetch(`${UPDATE_URL}?token=${Date.now()}`);
    const data: UpdateResponse = await response.json();
    
    const config = data[platform];

    // 3. 只有配置存在且版本不同时才弹窗
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
