/**
 * @file 首页日历：拉取 Bangumi 每日放送数据，按“今天”起始的顺序分组展示，并支持本地关键词过滤。
 */

import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { decodeHtmlEntities } from "@/src/utils/html";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

/** Bangumi 返回的星期信息 */
type CalendarWeekday = {
  en: string;
  cn: string;
  ja: string;
  id: number; // 1 ~ 7，周一为 1
};

/** Bangumi 返回的单条番剧 */
type CalendarItem = {
  id: number;
  url: string;
  type: number;
  name: string;
  name_cn: string;
  summary: string;
  air_date: string; // "YYYY-MM-DD"
  air_weekday: number;
  rating?: { score?: number; total?: number };
  rank?: number;
  images?: {
    large?: string;
    common?: string;
    medium?: string;
    small?: string;
    grid?: string;
  };
  collection?: { doing?: number };
};

/** 按天分组后的放送列表 */
type CalendarDay = {
  weekday: CalendarWeekday;
  items: CalendarItem[];
};

/** 取今天的星期序号，统一成 1 ~ 7（周一为 1）；JS 的 0 表示周日 */
function getTodayWeekdayId() {
  const jsDay = new Date().getDay(); // 0 ~ 6
  return jsDay === 0 ? 7 : jsDay;
}

/** 优先使用中文名，没有则回退到原名 */
function pickTitle(item: CalendarItem) {
  const cn = (item.name_cn || "").trim();
  if (cn.length > 0) return cn;
  return item.name;
}

/** 按尺寸由小到大挑一张封面，都没有时返回空串 */
function pickCover(item: CalendarItem) {
  return (
    item.images?.common ||
    item.images?.grid ||
    item.images?.small ||
    item.images?.medium ||
    item.images?.large ||
    ""
  );
}

/** 评分统一保留一位小数，无评分时显示占位符 */
function formatScore(score?: number) {
  if (typeof score !== "number" || Number.isNaN(score)) return "—";
  return score.toFixed(1);
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const router = useRouter();

  /** 提交搜索：关键词非空时跳转到聚合搜索页 */
  const handleSearch = (text: string) => {
    const keyword = text.trim();
    if (keyword) {
      router.push({
        pathname: "/search",
        params: { q: query }
      });
    }
  };

  /** 本地过滤：命中中文名或原名任意一项即算匹配 */
  const matchItem = useCallback((item: CalendarItem, q: string) => {
    if (!q) return true;
    const keyword = q.trim().toLowerCase();
    return (
      item.name?.toLowerCase().includes(keyword) ||
      item.name_cn?.toLowerCase().includes(keyword)
    );
  }, []);

  /** 拉取每日放送数据，解码 HTML 实体，并调整成以“今天”开头的顺序 */
  const fetchCalendar = useCallback(async () => {
    setError("");
    try {
      // 加随机 token 规避接口缓存
      const res = await fetch("https://api.bgm.tv/calendar?token=" + Math.random(), {
        headers: {
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as CalendarDay[];

      // 基本容错：确保拿到的是数组
      if (!Array.isArray(json)) {
        throw new Error("Response is not an array");
      }

      // 先剔除星期信息缺失的坏数据，再按“距今天的天数”升序排列
      const todayId = getTodayWeekdayId();
      
      const cleaned = json
        .map((d) => ({
          ...d,
          // 标题、简介里的 `&amp;`、`&quot;` 等实体必须解码，否则展示和搜索都会受影响
          weekday: d.weekday && {
            ...d.weekday,
            cn: decodeHtmlEntities(d.weekday.cn),
            en: decodeHtmlEntities(d.weekday.en),
            ja: decodeHtmlEntities(d.weekday.ja),
          },
          items: Array.isArray(d.items)
            ? d.items.filter(Boolean).map((item) => ({
                ...item,
                name: decodeHtmlEntities(item.name),
                name_cn: decodeHtmlEntities(item.name_cn),
                summary: decodeHtmlEntities(item.summary),
              }))
            : [],
        }))
        .filter((d) => d.weekday && typeof d.weekday.id === "number")
        .sort((a, b) => {
          const aOffset = (a.weekday.id - todayId + 7) % 7;
          const bOffset = (b.weekday.id - todayId + 7) % 7;
          return aOffset - bOffset;
        });

      setData(cleaned);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  /** 下拉刷新：只切换刷新态，加载态复用 fetchCalendar */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCalendar();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCalendar]);

  /** 按屏宽动态计算每行卡片数；想更紧凑可以调小 minCard */
  const grid = useMemo(() => {
    const horizontalPadding = styles.page.paddingHorizontal ?? 0;
    const sectionPadding = 0;
    const available = width - horizontalPadding * 2 - sectionPadding * 2;

    const minCard = 100;
    const gap = 12;
    const cols = Math.max(2, Math.floor((available + gap) / (minCard + gap)));

    const cardWidth = Math.floor((available - gap * (cols - 1)) / cols);
    return { cols, gap, cardWidth };
  }, [width]);

  /** 安全打开外部链接，无法打开时提示用户 */
  const openUrl = useCallback(async (url: string) => {
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert("无法打开链接", url);
      return;
    }
    Linking.openURL(url);
  }, []);

  /** 按输入的关键词过滤，并丢掉过滤后没有条目的那几天 */
  const filteredData = useMemo(() => {
    if (!query) return data;

    return data
      .map((day) => ({
        ...day,
        items: day.items.filter((item) => matchItem(item, query)),
      }))
      .filter((day) => day.items.length > 0);
  }, [data, query, matchItem]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.page}
      // 下拉刷新：tintColor/titleColor 用于 iOS，colors/progressBackgroundColor 用于 Android
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#EEEEEE"
          title="Loading..."
          titleColor="#EEEEEE"
          colors={["#EEEEEE"]}
          progressBackgroundColor="#05070C"
        />
      }
    >

    <View style={styles.searchWrap}>
      <View style={styles.searchBox}>
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          style={styles.searchIcon}
        >
          <Circle
            cx={11}
            cy={11}
            r={7}
            stroke="#667085"
            strokeWidth={2}
          />
          <Path
            d="M20 20l-4-4"
            stroke="#667085"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索番剧..."
          placeholderTextColor="#667085"
          style={styles.searchInput}
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          // 键盘回车即提交搜索
          returnKeyType="search" 
          onSubmitEditing={() => handleSearch(query)}
        />
      </View>
    </View>

    {/* 加载中 */}
    {loading && (
      <View style={styles.center}>
        <View style={styles.loadingHeight}></View>
        <ActivityIndicator />
        <Text style={styles.mutedText}>加载中…</Text>
      </View>
    )}

    {/* 错误态 */}
    {!loading && error && (
      <View style={styles.center}>
        <View style={styles.loadingHeight}></View>
        <Text style={styles.title}>加载失败</Text>
        <Text style={styles.mutedText} selectable>
          {error}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchCalendar}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* 正常内容 */}
    {!loading && !error && filteredData.map((day) => (
        <View key={String(day.weekday.id)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{day.weekday.cn}</Text>
            <Text style={styles.sectionMeta}>
              {day.weekday.en} · {day.items.length} 条
            </Text>
          </View>

          <View style={[styles.grid, { gap: grid.gap }]}>
            {day.items.map((item) => {
              const title = pickTitle(item);
              const cover = pickCover(item);
              const score = formatScore(item.rating?.score);
              const doing = item.collection?.doing ?? 0;

              return (
                <TouchableOpacity
                  key={String(item.id)}
                  style={[styles.card, { width: grid.cardWidth }]}
                  activeOpacity={0.85}
                  onPress={() => router.push({
                    pathname: "/search",
                    params: { q: title }
                  })}
                >
                  <View style={styles.coverWrap}>
                    {cover ? (
                      <Image
                        source={{ uri: cover }}
                        style={styles.cover}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.cover, styles.coverPlaceholder]}>
                        <Text style={styles.coverPlaceholderText}>No Image</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {title}
                    </Text>

                    <View style={styles.cardRow}>
                      <Text style={styles.badge}>评分 {score}</Text>
                    </View>

                    <Text style={styles.miniMeta} numberOfLines={1}>
                      在看 {doing}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.footerSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /** 页面骨架与通用居中容器 */
  container: {
    flex: 1,
    backgroundColor: "#05070C",
  },
  page: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingHeight: { height: 100 },
  footerSpace: {
    height: 24,
  },

  /** 按天分组的分区块 */
  section: {
    marginTop: 14,
  },
  sectionHeader: {
    paddingHorizontal: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#E9EDF5",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionMeta: {
    color: "#90A0B8",
    fontSize: 12,
  },

  /** 番剧卡片网格 */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  coverWrap: {
    width: "100%",
    height: 125,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cover: {
    width: "100%",
    height: 125,
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  coverPlaceholderText: {
    color: "#90A0B8",
    fontSize: 12,
  },

  cardBody: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    gap: 6,
  },
  cardTitle: {
    color: "#E9EDF5",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    color: "#BFD0FF",
    fontSize: 12,
  },
  miniMeta: {
    color: "#90A0B8",
    fontSize: 12,
  },

  /** 加载失败与重试 */
  title: {
    color: "#E9EDF5",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  mutedText: {
    color: "#90A0B8",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  retryText: {
    color: "#E9EDF5",
    fontSize: 13,
    fontWeight: "700",
  },

  /** 顶部搜索框 */
  searchWrap: {
    marginBottom: 6,
    gap: 6,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: "#E9EDF5",
    fontSize: 14,
  },
});
