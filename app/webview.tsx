import { AppHeader } from '@/components/app-header';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WebviewPage() {
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
            // 常用配置
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            allowsFullscreenVideo={true}     // 允许全屏视频 (主要针对 Android)
            allowsInlineMediaPlayback={true} // 允许行内播放 (iOS 必须)
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
