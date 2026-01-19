import {
  getSearchTimeout,
} from '@/src/services/storage/searchTimeout';
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-root-toast';
import { AppHeader } from "../components/app-header";

const SOURCES_DIR = "../assets/sources/";

// 导入源列表
import { getMoreSearchAlert, setMoreSearchAlert } from '@/src/services/storage/moreSearchAlert';
import { Ionicons } from '@expo/vector-icons';
import sourceIndex from "../assets/sources/index.json";

// 由于 RN 不支持动态 require，需手动建立映射)
const sourceConfigs: Record<number, any> = {
  1: require(`${SOURCES_DIR}/config_1.json`),
  4: require(`${SOURCES_DIR}/config_4.json`),
  5: require(`${SOURCES_DIR}/config_5.json`),
  6: require(`${SOURCES_DIR}/config_6.json`),
  7: require(`${SOURCES_DIR}/config_7.json`),
  9: require(`${SOURCES_DIR}/config_9.json`),
  10: require(`${SOURCES_DIR}/config_10.json`),
  11: require(`${SOURCES_DIR}/config_11.json`),
  12: require(`${SOURCES_DIR}/config_12.json`),
  14: require(`${SOURCES_DIR}/config_14.json`),
  16: require(`${SOURCES_DIR}/config_16.json`),
  18: require(`${SOURCES_DIR}/config_18.json`),
  21: require(`${SOURCES_DIR}/config_21.json`),
  24: require(`${SOURCES_DIR}/config_24.json`),
};

interface SearchResult {
  id: string; // 唯一标识
  title: string;
  image: string;
  url: string;
  sourceName: string; // 源的名称
}

interface GroupedResult {
  sourceName: string;
  sourceUrl: string;
  searchUrl: string;
  data: SearchResult[];
}

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  useEffect(() => {
    if (q) {
      handleSearch(q);
    }
  }, [q]);

  const handleSearch = async (keyword: string) => {
    setLoading(true);
    setResults([]);

    // 实时获取最新的配置
    const timeout = await getSearchTimeout();

    const activeSources = sourceIndex.filter((s: any) => s.enabled && s.adaptation);

    const searchTasks = activeSources.map(async (source: any) => {
      const config = sourceConfigs[source.id];
      if (!config) return;

      // 1. 创建 AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000); // 5.5秒超时

      try {
        const { search_config } = config;
        const searchUrl = search_config.url
          .replace("{q}", encodeURIComponent(keyword))
          .replace("{host}", source.url);

        const response = await fetch(searchUrl, { 
          headers: { "User-Agent": userAgent },
          signal: controller.signal, // 2. 绑定信号
        });
        
        const html = await response.text();
        const data = parseHtml(html,
          search_config, source.name,
          search_config.details_format, source.url
        );

        if (data.length > 0) {
          setResults(prev => [...prev, 
            { sourceName: source.name, sourceUrl: source.url, data: data, searchUrl: searchUrl }
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
        // 3. 清除定时器
        clearTimeout(timeoutId);
      }
    });

    try {
      await Promise.allSettled(searchTasks);
    } finally {
      setLoading(false);
      const searchAlertStatus = await getMoreSearchAlert();
      if (searchAlertStatus) {
        await setMoreSearchAlert(false);
        Alert.alert('提示', '如果没有找到您想要的动漫，可以点击标题栏右上角使用更多的网站来手动检索。');
      }
    }
  };

  // 正则解析核心逻辑
  const parseHtml = (html: string,
    config: any,
    sourceName: string,
    details_format: string,
    host: string
  ) => {
    const { item_regex, fields } = config;
    const list: SearchResult[] = [];
    
    // 创建正则对象 (添加 'g' 标志以进行全局匹配)
    const regex = new RegExp(item_regex, 'g');
    
    let match;
    // 循环匹配所有结果
    while ((match = regex.exec(html)) !== null) {
      // 根据 config 中定义的 match_index 提取数据
      // 注意：match[0] 是完整匹配，group 从 1 开始
      let image = match[fields.image.match_index] || "";
      const url = match[fields.url.match_index] || "";
      let title = match[fields.title.match_index] || "";

      // ID 18 特殊处理，其标签含有 span。
      if (title.includes("<span")) {
        title = title.replace(/<\/?span[^>]*>/g, '');
      }

      // image 特殊处理：如果 image 是绝对路径要加域名
      if (image.startsWith('/')) {
        image = host + image;
      }

      if (title && url) {
        list.push({
          id: `${sourceName}-${url}`, // 生成临时唯一ID
          title: title.trim(),
          image: image.trim(),
          url: details_format.replace("{host}", host).replace('{result}', url.trim()),
          sourceName: sourceName
        });
      }
    }

    console.log(`${sourceName} 搜索数量：`, list.length);
    return list;
  };

  // 在你的页面组件内
  const navigation = useNavigation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <AppHeader title={q ? `搜索: ${q}` : "搜索"} showBack={true} 
        onBackPress={() => navigation.goBack()}
        icon={<Ionicons name="albums-outline" size={24} color="#EAF0FF" />}
        onIconPress={() => router.push("/pages/more_search")}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.sourceName}
        contentContainerStyle={styles.listContent}
        // 只有当加载结束且真的没数据时才显示“未找到”
        ListEmptyComponent={!loading ? <Text style={styles.empty}>未找到相关内容</Text> : null}
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
                params: { url: item.searchUrl, type: "player" },
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
                  params: { url: res.url, type: "player" },
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // 铺满全屏
    backgroundColor: 'rgba(5, 7, 12, 0.7)', // 半透明背景
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // 确保在列表之上
  },
  horizontalList: {
    paddingHorizontal: 7,
  },

  container: { flex: 1, backgroundColor: "#05070C" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  empty: { color: "#90A0B8", textAlign: "center", marginTop: 50 },
  listContent: { paddingTop: 10, paddingBottom: 35 },
  sourceSection: {
    backgroundColor: "#111827", // 稍亮于背景的深蓝色/灰色
    borderWidth: 1,
    borderColor: "#1E293B",     // 边框颜色
    borderRadius: 12,           // 圆角让整体更现代
    paddingVertical: 15,        // 上下内边距
    marginHorizontal: 10,       // 左右留白，防止边框贴边
    marginVertical: 8,
    // 阴影（可选，增加层次感）
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sourceInfoInner: {
    flex: 1, // 占据剩余空间，防止文字溢出挤压按钮
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
