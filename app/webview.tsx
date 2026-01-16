import { AppHeader } from '@/components/app-header';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WebviewScreen() {
  const navigation = useNavigation();
  const {
    url,
    type = 'default' // 1. 接收 type 参数，默认为 'default'
  } = useLocalSearchParams < {
    url ? : string,
    type ?: string;
  } > ();

  const webUrl = useMemo(() => {
    // expo-router params 可能是 string | string[]；这里做一个兜底
    if (!url) return '';
    return Array.isArray(url) ? url[0] : url;
  }, [url]);

  const webRef = useRef < WebView > (null);

  const [title, setTitle] = useState('加载中...');
  const [errorText, setErrorText] = useState < string | null > (null);

  const [progress, setProgress] = useState(0); // 进度值 0-1
  const animatedProgress = useRef(new Animated.Value(0)).current;

  // 当进度改变时，执行动画
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Script
  const [script, setScript] = useState('');

  useEffect(() => {
  async function loadInternalScript() {
      try {
        // 1. 加载资源
        const [{ localUri }] = await Asset.loadAsync(require('../assets/sources/config_scripts.js.txt'));
        if (localUri) {
          // 2. 读取文件内容为字符串
          const content = await FileSystem.readAsStringAsync(localUri);
          if (type == "player") {
            setScript(content);
          }
        }
      } catch (e) {
        console.error("加载脚本失败", e);
      }
    }
    loadInternalScript();
  }, []);

  const handleMessage = useCallback(async (event: any) => {
    let data: any = null;
    try {
      data = JSON.parse(event?.nativeEvent?.data || "{}");
    } catch {
      return;
    }

    if (data.type === "enter_fullscreen") {
      // 进入全屏 -> 锁横屏
      // iOS 上能否立刻旋转还取决于系统策略、用户是否锁定竖屏、页面是否真进入全屏等
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch {}
    }

    if (data.type === "exit_fullscreen") {
      // 退出全屏 -> 恢复竖屏（或 unlockAsync 跟随系统）
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        // 或者：await ScreenOrientation.unlockAsync();
      } catch {}
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />

      <AppHeader
        title={title}
        showBack={true}
        onBackPress={() => navigation.goBack()}
        {...(type === 'sources' && { 
            icon: <Ionicons name="open-outline" size={24} color="#EAF0FF" />, 
            onIconPress: () => Linking.openURL(webUrl)
        })}
      />

      <View style={styles.webWrap}>
        {/* 进度条容器 */}
          {progress < 1 && (
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBar, 
                    { 
                      width: animatedProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }) 
                    }
                ]}
              />
            </View>
          )}

          <WebView
            ref={webRef}
            source={{ uri: webUrl }}
            // 核心：强制所有链接在当前 WebView 中打开
            onShouldStartLoadWithRequest={(request) => {
                // 允许加载所有 http 和 https 链接
                if (request.url.startsWith('http')) {
                return true; 
                }
                // 可以在这里处理其他协议，如 tel: 或 mailto:
                return false;
            }}
            style={styles.web}
            onLoadProgress={({ nativeEvent }) => {
                setProgress(nativeEvent.progress); // progress 是 0 到 1 之间的浮点数
            }}
            onLoadStart={() => {
                setProgress(0);
                setErrorText(null);
            }}
            onLoadEnd={() => setProgress(1)}
            onNavigationStateChange={(navState) => {
              if (navState?.title) setTitle(navState.title);
            }}
            onError={(e) => {
              setErrorText(e?.nativeEvent?.description ?? '页面加载失败');
              setTitle('加载失败');
            }}
            injectedJavaScript={script}
            onMessage={handleMessage}
            // 常用配置
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            allowsFullscreenVideo={true}     // 允许全屏视频 (主要针对 Android)
            mediaPlaybackRequiresUserAction={true} // 让用户手势触发播放/全屏更稳
            // allowsInlineMediaPlayback={true} // 允许行内播放 (iOS 必须)
            mixedContentMode="always"
          />

          {!!errorText && (
            <View style={styles.errorMask}>
              <Text style={styles.errorTitle}>加载失败</Text>
              <Text style={styles.errorDesc}>{errorText}</Text>
              <Text style={styles.errorDesc}>URL: {webUrl}</Text>
            </View>
          )}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070C'
  },
  webWrap: {
    flex: 1
  },
  web: {
    flex: 1,
    backgroundColor: '#05070C'
  },
  errorMask: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070C',
  },
  errorTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    marginBottom: 8
  },
  errorDesc: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center'
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 10, // 确保在 WebView 之上
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6', // 建议使用亮蓝色
  },
});
