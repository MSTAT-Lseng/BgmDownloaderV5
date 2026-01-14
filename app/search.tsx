import { useLocalSearchParams, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader } from "../components/app-header";

// 导入源列表
import sourceIndex from "../assets/sources/index.json";

// 由于 RN 不支持动态 require，需手动建立映射)
const sourceConfigs: Record<number, any> = {
  1: require("../assets/sources/config_1.json"),
};

interface SearchResult {
  id: string; // 唯一标识
  title: string;
  image: string;
  url: string;
  sourceName: string; // 源的名称
}

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const [results, setResults] = useState<SearchResult[]>([]);
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
    
    try {
      // 1. 过滤出开启了 adaptation 的源
      const activeSources = sourceIndex.filter((s: any) => s.enabled && s.adaptation);
      
      const searchPromises = activeSources.map(async (source: any) => {
        const config = sourceConfigs[source.id];
        if (!config) return []; // 如果没有对应的配置文件，跳过

        try {
          // 2. 拿到 search_config
          const { search_config } = config;
          
          // 3. 构造搜索 URL
          const searchUrl = search_config.url
            .replace("{q}", encodeURIComponent(keyword))
            .replace("{host}", source.url);

          // 4. 请求 HTML
          const response = await fetch(searchUrl, {
            headers: {
              "User-Agent": userAgent
            }
          });
          const html = await response.text();

          // 5. 正则解析
          return parseHtml(html, search_config, source.name);
        } catch (err) {
          console.error(`Error fetching source ${source.name}:`, err);
          return [];
        }
      });

      // 并行执行所有搜索
      const resultsArray = await Promise.all(searchPromises);
      // 拍平数组并去重或排序
      const allResults = resultsArray.flat();
      setResults(allResults);

    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 正则解析核心逻辑
  const parseHtml = (html: string, config: any, sourceName: string) => {
    const { item_regex, fields } = config;
    const list: SearchResult[] = [];
    
    // 创建正则对象 (添加 'g' 标志以进行全局匹配)
    const regex = new RegExp(item_regex, 'g');
    
    let match;
    // 循环匹配所有结果
    while ((match = regex.exec(html)) !== null) {
      // 根据 config 中定义的 match_index 提取数据
      // 注意：match[0] 是完整匹配，group 从 1 开始
      const image = match[fields.image.match_index] || "";
      const url = match[fields.url.match_index] || "";
      const title = match[fields.title.match_index] || "";

      if (title && url) {
        list.push({
          id: `${sourceName}-${url}`, // 生成临时唯一ID
          title: title.trim(),
          image: image.trim(),
          url: url.trim(),
          sourceName
        });
      }
    }
    return list;
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.item}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.cover} 
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.sourceTag}>{item.sourceName}</Text>
      </View>
    </TouchableOpacity>
  );

  // 在你的页面组件内
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <AppHeader title={q ? `搜索: ${q}` : "搜索"} showBack={true} onBackPress={() => navigation.goBack()} />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E9EDF5" />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>未找到相关内容</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070C" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 10 },
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
});
