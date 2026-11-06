/**
 * @file 聚合搜索页：并发请求所有已适配站点，用各站点配置里的正则解析结果，并按站点分组展示。
 */

import {
  getSearchTimeout,
} from '@/src/services/storage/searchTimeout';
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-root-toast';
import { AppHeader } from "../components/app-header";
import { getMoreSearchAlert, setMoreSearchAlert } from '@/src/services/storage/moreSearchAlert';
import { Ionicons } from '@expo/vector-icons';
import sourceIndex from "../assets/sources/index.json";

const SOURCES_DIR = "../assets/sources/";

// RN 不支持动态 require，只能把用到的站点配置手动建立映射
const sourceConfigs: Record<number, any> = {
  1: require(`${SOURCES_DIR}/config_1.json`),
  4: require(`${SOURCES_DIR}/config_4.json`),
  5: require(`${SOURCES_DIR}/config_5.json`),
  10: require(`${SOURCES_DIR}/config_10.json`),
  11: require(`${SOURCES_DIR}/config_11.json`),
  12: require(`${SOURCES_DIR}/config_12.json`),
  14: require(`${SOURCES_DIR}/config_14.json`),
  19: require(`${SOURCES_DIR}/config_19.json`),
  20: require(`${SOURCES_DIR}/config_20.json`),
  21: require(`${SOURCES_DIR}/config_21.json`),
  24: require(`${SOURCES_DIR}/config_24.json`),
};

/** 单条搜索结果 */
interface SearchResult {
  id: string;
  title: string;
  image: string;
  url: string;
  sourceName: string;
}

/** 按站点分组后的搜索结果；moreUrl 为“查看全部”跳转地址 */
interface GroupedResult {
  sourceName: string;
  sourceUrl: string;
  moreUrl: string;
  data: SearchResult[];
}

/** 把配置里的 {q} 占位符替换为搜索词，支持嵌套对象与数组 */
const fillKeyword = (value: any, keyword: string): any => {
  if (typeof value === "string") {
    return value.replace(/\{q\}/g, keyword);
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillKeyword(item, keyword));
  }
  if (value && typeof value === "object") {
    const filled: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      filled[key] = fillKeyword(item, keyword);
    }
    return filled;
  }
  return value;
};

// 次元城（cycani）
const CYCANI_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const isCycaniUrl = (url: string) => url.includes("cycani.org");

// 稀饭动漫（xifanacg），其 Supabase 接口需要 apikey 鉴权
const XIFANACG_API_KEY = "sb_publishable_OBIVAWACIX6lPXrO98_z24_HcsmalkA";
const isXifanacgUrl = (url: string) => url.includes("xifanacg");

// girigirilove
const GIRIGIRILOVE_HOST = "https://ani.girigirilove.com";
const isGirigiriloveUrl = (url: string) => url.includes("girigirilove");

/** 从 girigirilove 的各种结果链接中提取 vod_id，取不到时返回空串 */
const extractGirigiriloveVodId = (url: string): string => {
  if (!url) return "";
  const patterns = [
    /\/detail\/([A-Za-z0-9_-]+?)(?:\.html)?(?:[/?#]|$)/, // /detail/123
    /[?&](?:vod_id|id)=([A-Za-z0-9_-]+)/,               // ?vod_id=123 / ?id=123
    /\/(\d+)(?:\.html)?(?:[/?#]|$)/,                    // /xxx/123.html 或 /xxx/123/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return "";
};

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  /** 关键词变化时重新发起一次聚合搜索 */
  useEffect(() => {
    if (q) {
      handleSearch(q);
    }
  }, [q]);

  /** 并发请求所有已适配站点，拿到一个就展示一个 */
  const handleSearch = async (keyword: string) => {
    setLoading(true);
    setResults([]);

    // 超时时间每次实时读取，保证设置页修改后立即生效
    const timeout = await getSearchTimeout();

    const activeSources = sourceIndex.filter((s: any) => s.enabled && s.adaptation);

    const searchTasks = activeSources.map(async (source: any) => {
      const config = sourceConfigs[source.id];
      if (!config) return;

      // 每个站点一个超时定时器，超时后中断该次请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      try {
        const { search_config } = config;
        const { cookie } = search_config;

        const searchUrl = search_config.url
          .replace("{q}", encodeURIComponent(keyword))
          .replace("{host}", source.url);

        const isCycani = isCycaniUrl(source.url);
        const isXifanacg = isXifanacgUrl(source.url);

        // “查看全部”地址：girigirilove 走站内搜索页，次元城跳分类页，稀饭动漫跳站内搜索页，其余沿用搜索地址
        const moreUrl = isGirigiriloveUrl(source.url)
          ? `${GIRIGIRILOVE_HOST}/search?q=${encodeURIComponent(keyword)}`
          : isCycaniUrl(source.url)
            ? `${source.url.replace(/\/+$/, "")}/category?q=${encodeURIComponent(keyword)}`
            : isXifanacgUrl(source.url)
              ? `https://next.xifanacg.com/search?q=${encodeURIComponent(keyword)}`
              : searchUrl;

        // 只有配置里声明了 body 才发 POST（如稀饭动漫的 Supabase 接口）
        const requestBody = search_config.body
          ? JSON.stringify(fillKeyword(search_config.body, keyword))
          : undefined;

        const response = await fetch(searchUrl, { 
          method: search_config.method || "GET",
          headers: { 
            "User-Agent": userAgent, 
            "Priority": "u=3, i", 
            "Accept-Language": "zh-CN,zh-Hans;q=0.9",
            ...(cookie ? { "Cookie": cookie } : {}),
            // 次元城的搜索接口要求携带 x-app-name
            ...(isCycani ? { "x-app-name": "cyc_web" } : {}),
            ...(isXifanacg ? {
              "apikey": XIFANACG_API_KEY,
              "authorization": `Bearer ${XIFANACG_API_KEY}`,
              "Content-Type": "application/json",
            } : {})
          },
          body: requestBody,
          // 强制忽略本地 Cookie 池，只发送 Header 里定义的 Cookie
          credentials: 'omit',
          signal: controller.signal,
        });
        
        const html = await response.text();
        const data = parseHtml(html,
          search_config, source.name,
          search_config.details_format, source.url
        );

        if (data.length > 0) {
          setResults(prev => [...prev, 
            { sourceName: source.name, sourceUrl: source.url, data: data, moreUrl: moreUrl }
          ]);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`${source.name} 搜索超时`);
          Toast.show(`${source.name} 搜索超时`, {
            duration: Toast.durations.SHORT,
            position: Toast.positions.CENTER,
          });
        } else {
          console.error(`${source.name} 搜索失败:`, err);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    });

    try {
      await Promise.allSettled(searchTasks);
    } finally {
      setLoading(false);
      // 只在第一次搜索时提示右上角还有更多站点，提示后立即写回，避免反复打扰
      const searchAlertStatus = await getMoreSearchAlert();
      if (searchAlertStatus) {
        await setMoreSearchAlert(false);
        Alert.alert('提示', '如果没有找到您想要的动漫，可以点击标题栏右上角使用更多的网站来手动检索。');
      }
    }
  };

  /** 还原 JSON 接口返回的转义字符（如封面地址里的 \\u0026） */
  const decodeJsonEscapes = (value: string) => {
    if (!value || !value.includes("\\")) return value;
    try {
      return JSON.parse(`"${value}"`);
    } catch {
      return value;
    }
  };

  /** 按配置里的 item_regex 和字段下标，把响应文本解析成结果列表 */
  const parseHtml = (html: string,
    config: any,
    sourceName: string,
    details_format: string,
    host: string
  ) => {
    const { item_regex, fields } = config;
    const list: SearchResult[] = [];
    
    // 加 g 标志才能逐个匹配所有条目
    const regex = new RegExp(item_regex, 'g');
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      // match[0] 是完整匹配，捕获组从 1 开始，配置里的 match_index 即对应捕获组下标
      let image = decodeJsonEscapes(match[fields.image.match_index] || "");
      const url = match[fields.url.match_index] || "";
      let title = decodeJsonEscapes(match[fields.title.match_index] || "");

      // 部分站点（如 18 号源）的标题值里混有 span 标签，需要剥掉
      if (title.includes("<span")) {
        title = title.replace(/<\/?span[^>]*>/g, '');
      }

      // 相对路径的封面要补上站点域名
      if (image.startsWith('/')) {
        image = host + image;
      }

      // 百度封面链接里的 &amp; 要还原成 &
      if (image.includes("baidu.com")) {
        image = image.replace(/&amp;/g, "&");
      }

      if (title && url) {
        const rawUrl = url.trim();
        let finalUrl = details_format.replace("{host}", host).replace('{result}', rawUrl);

        // girigirilove 的条目不直接跳原链接，统一改写为站内详情页地址
        if (isGirigiriloveUrl(host)) {
          const vodId = extractGirigiriloveVodId(rawUrl) || extractGirigiriloveVodId(finalUrl);
          if (vodId) {
            finalUrl = `${GIRIGIRILOVE_HOST}/detail/${vodId}`;
          }
        }

        list.push({
          id: `${sourceName}-${url}`, // 用站点名 + 原始地址拼一个临时唯一 ID
          title: title.trim(),
          image: image.trim(),
          url: finalUrl,
          sourceName: sourceName
        });
      }
    }

    console.log(`${sourceName} 搜索数量：`, list.length);
    return list;
  };

  const navigation = useNavigation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppHeader title={q ? `搜索: ${q}` : "搜索"} showBack={true} 
        onBackPress={() => navigation.goBack()}
        icon={<Ionicons name="albums-outline" size={24} color="#EAF0FF" />}
        onIconPress={() => router.push("/pages/more_search")}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.sourceName}
        contentContainerStyle={styles.listContent}
        // 只有加载结束且确实没有结果时才显示“未找到”
        ListEmptyComponent={!loading ? <Text style={styles.empty}>未找到相关内容</Text> : undefined}
        renderItem={({ item }) => (
          <View style={styles.sourceSection}>
            <View style={styles.sourceInfo}>
              <View style={styles.sourceInfoInner}>
                <Text style={styles.sourceTitle} numberOfLines={1}>
                  {item.sourceName}
                </Text>
                <Text style={styles.sourceTag2} numberOfLines={1}>
                  {item.sourceUrl} 
                </Text>
              </View>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push({
                pathname: "/webview",
                params: {
                  url: item.moreUrl,
                  type: "player",
                  ...(isCycaniUrl(item.sourceUrl) ? { userAgent: CYCANI_USER_AGENT } : {}),
                },
              })}>
                <Text style={styles.viewAllBtnText}>查看全部</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={item.data}
              style={styles.horizontalList}
              keyExtractor={(res) => res.id}
              renderItem={({ item: res }) => (
                <TouchableOpacity style={styles.horizontalItem} onPress={() => router.push({
                  pathname: "/webview",
                  params: {
                    url: res.url,
                    type: "player",
                    ...(isCycaniUrl(res.url) ? { userAgent: CYCANI_USER_AGENT } : {}),
                  },
                })}>
                  <Image source={{ uri: res.image }}
                    style={styles.horizontalCover} resizeMode="cover" />
                  <Text style={styles.horizontalTitle} numberOfLines={1}>{res.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E9EDF5" />
          <Text style={{color: '#FFF', marginTop: 10}}>正在搜索...</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  /** 搜索中遮罩 */
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0, // 手动铺满全屏，RN 0.88 已移除 StyleSheet.absoluteFillObject
    backgroundColor: 'rgba(5, 7, 12, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // 必须高于列表
  },

  /** 页面与列表骨架 */
  container: { flex: 1, backgroundColor: "#05070C" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingTop: 10, paddingBottom: 35 },
  empty: { color: "#90A0B8", textAlign: "center", marginTop: 50 },
  horizontalList: {
    paddingHorizontal: 7,
  },

  /** 单条结果卡片（当前列表未使用，保留备用） */
  item: { 
    flexDirection: "row", 
    marginBottom: 12, 
    backgroundColor: "#1E293B", 
    borderRadius: 8, 
    overflow: "hidden" 
  },
  cover: { width: 100, height: 140, backgroundColor: "#334155" },
  info: { flex: 1, padding: 10, justifyContent: "space-between" },
  title: { color: "#E9EDF5", fontSize: 16, fontWeight: "bold" },
  sourceTag: { 
    color: "#90A0B8", 
    fontSize: 12, 
    backgroundColor: "#0F172A", 
    alignSelf: "flex-start", 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },

  /** 按站点分组的分区块 */
  sourceSection: {
    backgroundColor: "#111827", // 略亮于页面背景，形成卡片层次
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 15,
    marginHorizontal: 10, // 左右留白，避免边框贴边
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceInfoInner: {
    flex: 1, // 占满剩余空间，避免标题把按钮挤出去
    marginRight: 10,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  sourceTag2: {
    fontSize: 12,
    color: '#CCC',
  },
  viewAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#ef5350',
  },
  viewAllBtnText: {
    fontSize: 13,
    color: '#FFF',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  horizontalItem: { 
    width: 110, 
    marginHorizontal: 7,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    overflow: "hidden"
  },
  horizontalCover: { 
    width: 110, 
    height: 150, 
    backgroundColor: "#334155" 
  },
  horizontalTitle: { 
    color: "#E9EDF5", 
    fontSize: 12, 
    padding: 6,
    textAlign: 'center'
  },
});
