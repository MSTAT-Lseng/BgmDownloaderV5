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

/**
 * @file 通用内嵌浏览器页：负责加载站点页面、展示加载进度与错误、处理全屏旋转，以及播放页收藏。
 */

/**
 * WebView 的命令式方法句柄。
 *
 * react-native-webview 14 的 .d.ts 只把组件声明成 FunctionComponent（漏了 forwardRef），
 * 但源码实际用 forwardRef + useImperativeHandle 暴露了下面这些方法，这里按真实形态补类型。
 */
type WebViewHandle = {
  goForward: () => void;
  goBack: () => void;
  reload: () => void;
  stopLoading: () => void;
  postMessage: (data: string) => void;
  injectJavaScript: (code: string) => void;
  requestFocus: () => void;
  clearFormData: () => void;
  clearCache: (includeDiskFiles: boolean) => void;
  clearHistory: () => void;
};

const WebViewWithRef = WebView as unknown as React.ComponentType<
  React.ComponentProps<typeof WebView> & { ref?: React.Ref<WebViewHandle | null> }
>;

/** player 模式下允许从其他站点跳转的外部播放页白名单 */
const PLAYER_URL_WHITELIST = [
  "xgct.com/video",
  "xgcartoon.com/"
];

export default function WebviewScreen() {
  const navigation = useNavigation();

  // url：要加载的页面地址；type：default / sources / player；userAgent：来源页指定的 UA
  const { url, type = 'default', userAgent } = useLocalSearchParams < {
    url ? : string,
    type ?: string;
    userAgent ?: string;
  } > ();

  // expo-router 的参数可能是 string | string[]，这里统一取第一个值
  const webUrl = useMemo(() => {
    if (!url) return '';
    return Array.isArray(url) ? url[0] : url;
  }, [url]);

  // 未传 UA 时返回 undefined，保持 WebView 的默认 UA
  const webUserAgent = useMemo(() => {
    if (!userAgent) return undefined;
    return Array.isArray(userAgent) ? userAgent[0] : userAgent;
  }, [userAgent]);

  const webRef = useRef<WebViewHandle | null>(null);

  const [title, setTitle] = useState('加载中...');
  const [errorText, setErrorText] = useState < string | null > (null);

  const [progress, setProgress] = useState(0); // 加载进度，取值 0 ~ 1
  const animatedProgress = useRef(new Animated.Value(0)).current;

  /** 加载进度变化时，驱动进度条动画过渡到新位置 */
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const [script, setScript] = useState('');
  const [fullScreenScript, setFullScreenScript] = useState('');

  /** 播放页才加载全屏监听脚本；其他页面直接跳过，避免无谓的 IO */
  useEffect(() => {
    const loadScripts = async () => {
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
  }, [type]);

  const scriptRef = useRef('');
  const timerRef = useRef<number | null>(null);

  /** 读取页面净化脚本，并同步写入 scriptRef，供定时器直接使用 */
  useEffect(() => {
    if (type !== "player") return;
    
    const load = async () => {
      try {
        const [{ localUri }] = await Asset.loadAsync(require('../assets/sources/config_scripts.js.txt'));
        if (localUri) {
          const content = await FileSystem.readAsStringAsync(localUri);
          setScript(content);
          scriptRef.current = content;
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [type]);

  /**
   * 每 2 秒把净化脚本重新注入一次。
   *
   * 单页应用跳转不会重新触发注入，所以用定时器兜底；
   * 脚本内容放 Ref 里读取，避免闭包拿到旧值。
   */
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

  /** 接收页面内注入脚本发回的消息，用于同步全屏状态下的屏幕方向 */
  const handleMessage = useCallback(async (event: any) => {
    let data: any = null;
    try {
      data = JSON.parse(event?.nativeEvent?.data || "{}");
    } catch {
      return;
    }

    if (data.type === "enter_fullscreen") {
      // 进入全屏后锁横屏；iOS 上能否立刻旋转还取决于系统策略、用户是否锁定竖屏、页面是否真的进入全屏
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch {}
    }

    if (data.type === "exit_fullscreen") {
      // 退出全屏后恢复竖屏；如需跟随系统，可改用 unlockAsync()
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch {}
    }
  }, []);

  const { url: initialUrl } = useLocalSearchParams<{ url?: string }>();
  const [currentUrl, setCurrentUrl] = useState(Array.isArray(initialUrl) ? initialUrl[0] : initialUrl || '');
  const [isFavorite, setIsFavorite] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');

  /** 查询当前地址是否已收藏；非播放页或地址为空时直接置为未收藏 */
  const checkFavoriteStatus = useCallback(async (url: string) => {
    if (type !== 'player' || !url) {
      setIsFavorite(false);
      return;
    }

    try {
      // 确保表已创建
      await FavoritesDB.init(); 
      
      const exists = await FavoritesDB.exists(url);
      setIsFavorite(exists);
    } catch (e) {
      console.error("检查收藏状态失败:", e);
    }
  }, [type]);

  /** 地址变化时先重置收藏状态，避免残留上一个页面的状态，再异步查询 */
  useEffect(() => {
    setIsFavorite(false); 
    
    if (currentUrl) {
      checkFavoriteStatus(currentUrl);
    }
  }, [currentUrl, checkFavoriteStatus]);

  /** 点击收藏按钮：已收藏则取消收藏，未收藏则打开命名弹窗 */
  const handleFavoritePress = async () => {
    if (isFavorite) {
      await FavoritesDB.removeByUrl(currentUrl);
      setIsFavorite(false);
      return;
    }
    // 打开命名弹窗，默认用当前页面标题作为收藏名
    setFavoriteName(title); 
    setModalVisible(true);
  };

  /** 保存收藏：名称为空时不做任何处理 */
  const saveFavorite = async () => {
    if (favoriteName.trim()) {
      await FavoritesDB.upsert({ name: favoriteName, url: currentUrl });
      setIsFavorite(true);
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

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

        <WebViewWithRef
          ref={webRef}
          source={{ uri: webUrl }}
          // 应用来源页传入的 UA，未传时使用 WebView 默认值
          userAgent={webUserAgent}
          // 核心：拦截所有跳转，强制链接在当前 WebView 中打开
          onShouldStartLoadWithRequest={(request) => {
            // 播放页只放行白名单域名和同站页面，防止被广告跳转
            if (type === "player") {
              if (PLAYER_URL_WHITELIST.some((item) => request.url.includes(item))) {
                return true;
              }
              console.log(`load url ${request.url} failed: permission dined.`)

              let domain = webUrl.split('/')[2];
              if (request.url.includes(domain) || request.url.includes(domain.replace("www.", "m."))) {
                return true;
              } else {
                return false;
              }
            } else {
              // 非播放页只放行 http/https，tel:、mailto: 等其他协议一律拦下
              if (request.url.startsWith('http')) {
                return true; 
              }
            }
            return false;
          }}
          style={styles.web}
          onLoadProgress={({ nativeEvent }) => {
            setProgress(nativeEvent.progress);
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
          // 允许全屏视频（主要针对 Android）
          allowsFullscreenVideo={true}
          // 媒体必须由用户手势触发，否则全屏切换在部分机型上会失效
          mediaPlaybackRequiresUserAction={true}
          // 如需 iOS 行内播放，可再加上 allowsInlineMediaPlayback={true}
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
  /** 页面骨架 */
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

  /** 加载失败遮罩 */
  errorMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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

  /** 顶部加载进度条 */
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 10, // 必须高于 WebView 才可见
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },

  /** 收藏命名弹窗 */
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
