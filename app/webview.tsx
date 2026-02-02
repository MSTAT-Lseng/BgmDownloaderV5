import { AppHeader } from '@/components/app-header';
import { FavoritesDB } from '@/src/services/storage/FavoriteDatabase';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WebviewScreen() {
  const navigation = useNavigation();
  const { url, type = 'default' /* 1. 接收 type 参数，默认为 'default'*/ } = useLocalSearchParams < {
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
  const [fullScreenScript, setFullScreenScript] = useState('');
  useEffect(() => {
    const loadScripts = async () => {
      // 只有类型匹配时才加载，减少无谓的 IO 操作
      if (type !== "player") return;

      try {
        const scriptsToLoad = [
          { 
            source: require('../assets/sources/fullscreen_scripts.js.txt'), 
            setter: setFullScreenScript 
          }
        ];

        await Promise.all(scriptsToLoad.map(async ({ source, setter }) => {
          const [{ localUri }] = await Asset.loadAsync(source);
          if (localUri) {
            const content = await FileSystem.readAsStringAsync(localUri);
            setter(content);
          }
        }));
      } catch (e) {
        console.error("加载脚本失败:", e);
      }
    };

    loadScripts();
  }, [type]); // 加入 type 依赖，确保逻辑严谨

  // 1. 使用 Ref 同步脚本内容，避免闭包陷阱
  const scriptRef = useRef('');
  const timerRef = useRef<number | null>(null);

  // 2. 加载逻辑只负责读文件
  useEffect(() => {
    if (type !== "player") return;
    
    const load = async () => {
      try {
        const [{ localUri }] = await Asset.loadAsync(require('../assets/sources/config_scripts.js.txt'));
        if (localUri) {
          const content = await FileSystem.readAsStringAsync(localUri);
          setScript(content);
          scriptRef.current = content; // 同步到 Ref
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [type]);

  // 3. 独立管理定时器
  useEffect(() => {
    if (type === "player") {
      timerRef.current = setInterval(() => {
        if (scriptRef.current) {
          webRef.current?.injectJavaScript(scriptRef.current);
        }
      }, 2000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [type]);

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

  const { url: initialUrl } = useLocalSearchParams<{ url?: string }>();
  const [currentUrl, setCurrentUrl] = useState(Array.isArray(initialUrl) ? initialUrl[0] : initialUrl || '');
  const [isFavorite, setIsFavorite] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');

  // 检查当前 URL 是否已收藏
  const checkFavoriteStatus = useCallback(async (url: string) => {
    // 如果不是播放器类型或 URL 为空，直接返回
    if (type !== 'player' || !url) {
      setIsFavorite(false);
      return;
    }

    // 异步检查前，可以根据需要决定是否重置（推荐重置，避免旧页面的状态残留）
    try {
    // 确保表已创建
    await FavoritesDB.init(); 
    
    const exists = await FavoritesDB.exists(url);
      setIsFavorite(exists);
    } catch (e) {
      console.error("检查收藏状态失败:", e);
    }
  }, [type]); // 注意：这里依赖项应包含 type (你代码中是 types，请统一变量名)

  // 监听 currentUrl 的变化
  useEffect(() => {
    // 当 URL 变化时，先重置状态，防止显示上一个网页的收藏状态
    setIsFavorite(false); 
    
    if (currentUrl) {
      checkFavoriteStatus(currentUrl);
    }
  }, [currentUrl, checkFavoriteStatus]);
  // 修改后的收藏点击处理
  const handleFavoritePress = async () => {
    if (isFavorite) {
      await FavoritesDB.removeByUrl(currentUrl);
      setIsFavorite(false);
      return;
    }
    // 打开自定义模态框
    setFavoriteName(title); 
    setModalVisible(true);
  };

  const saveFavorite = async () => {
    if (favoriteName.trim()) {
      await FavoritesDB.upsert({ name: favoriteName, url: currentUrl });
      setIsFavorite(true);
      setModalVisible(false);
    }
  };

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
        {...(type === 'player' && {
            icon: <Ionicons name={isFavorite ? "star-half-outline" : "star-outline"} size={24} color="#EAF0FF" />, 
            onIconPress: handleFavoritePress
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
            // 如果是 player，只允许加载规则内的 host，防止广告跳转。
            if (type === "player") {
              let domain = webUrl.split('/')[2];
              if (request.url.includes(domain)) {
                return true;
              } else {
                return false;
              }
            } else {
              // 允许加载所有 http 和 https 链接
              if (request.url.startsWith('http')) {
                return true; 
              }
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
            // navState.url 会随页面跳转实时改变
            if (navState.url) {
              setCurrentUrl(navState.url);
            }
          }}
          onError={(e) => {
            setErrorText(e?.nativeEvent?.description ?? '页面加载失败');
            setTitle('加载失败');
          }}
          injectedJavaScript={fullScreenScript}
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

      {/* 自定义收藏模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加收藏</Text>
            <TextInput
              style={styles.modalInput}
              value={favoriteName}
              onChangeText={setFavoriteName}
              placeholder="请输入名称"
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, { borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#333' }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={saveFavorite}>
                <Text style={[styles.modalBtnText, { color: '#3B82F6', fontWeight: '600' }]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalInput: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
  },
});
