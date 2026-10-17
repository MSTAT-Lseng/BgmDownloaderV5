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

type CalendarWeekday = {
  en: string;
  cn: string;
  ja: string;
  id: number; // 1..7
};

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

type CalendarDay = {
  weekday: CalendarWeekday;
  items: CalendarItem[];
};

function getTodayWeekdayId() {
  const jsDay = new Date().getDay(); // 0..6
  return jsDay === 0 ? 7 : jsDay;    // 转成 1..7（周一=1）
}

function pickTitle(item: CalendarItem) {
  const cn = (item.name_cn || "").trim();
  if (cn.length > 0) return cn;
  return item.name;
}

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

function formatScore(score?: number) {
  if (typeof score !== "number" || Number.isNaN(score)) return "—";
  // Bangumi score is typically one decimal
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

  const handleSearch = (text: string) => {
    const keyword = text.trim();
    if (keyword) {
      router.push({
        pathname: "/search",
        params: { q: query }
      });
    }
  };

  const matchItem = useCallback((item: CalendarItem, q: string) => {
    if (!q) return true;
    const keyword = q.trim().toLowerCase();
    return (
      item.name?.toLowerCase().includes(keyword) ||
      item.name_cn?.toLowerCase().includes(keyword)
    );
  }, []);

  const fetchCalendar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("https://api.bgm.tv/calendar?token=" + Math.random(), {
        headers: {
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as CalendarDay[];

      // 基本容错：确保数组形态
      if (!Array.isArray(json)) {
        throw new Error("Response is not an array");
      }

      // 过滤空 items，并按 weekday.id 升序保证顺序稳定
      const todayId = getTodayWeekdayId();
      
      const cleaned = json
        .map((d) => ({
          ...d,
          // 接口里的 `&amp;`、`&quot;` 等实体需要解码后再展示 / 搜索
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCalendar();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCalendar]);

  // 网格：根据屏宽动态决定每行个数（可变）
  const grid = useMemo(() => {
    const horizontalPadding = styles.page.paddingHorizontal ?? 0;
    const sectionPadding = 0;
    const available = width - horizontalPadding * 2 - sectionPadding * 2;

    const minCard = 100; // 想更紧凑可以调小
    const gap = 12;
    const cols = Math.max(2, Math.floor((available + gap) / (minCard + gap)));

    const cardWidth = Math.floor((available - gap * (cols - 1)) / cols);
    return { cols, gap, cardWidth };
  }, [width]);

  const openUrl = useCallback(async (url: string) => {
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert("无法打开链接", url);
      return;
    }
    Linking.openURL(url);
  }, []);

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#EEEEEE"     // iOS 菊花颜色
          title="Loading..."                // 不显示文字就保持空串
          titleColor="#EEEEEE"    // iOS 文字颜色（title 非空时更明显）
          colors={["#EEEEEE"]}    // Android 菊花颜色（iOS 会忽略，不影响）
          progressBackgroundColor="#05070C" // Android 背景色
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
          // 提交
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

  footerSpace: {
    height: 24,
  },

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

  loadingHeight: { height: 100 },

});
