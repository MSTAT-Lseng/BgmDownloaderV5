import { FavoriteItem, FavoritesDB } from "@/src/services/storage/FavoriteDatabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function FavoriteScreen() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await FavoritesDB.init();
      const list = await FavoritesDB.list({ orderBy: "name", order: "ASC" });
      setItems(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const router = useRouter();
  const onOpen = useCallback(async (url: string) => {
    try {
      router.push({
        pathname: "/webview",
        params: { url: url, type: "player" },
      })
    } catch (e) {
      console.error(e);
      Alert.alert("打开失败", url);
    }
  }, []);

  const onLongPressDelete = useCallback((it: FavoriteItem) => {
    Alert.alert(
      "删除收藏？",
      `确定删除“${it.name}”吗？\n\n${it.url}`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: async () => {
            try {
              await FavoritesDB.removeByUrl(it.url);
              // 本地同步删除，避免再查库造成等待
              setItems((prev) => prev.filter((x) => x.url !== it.url));
            } catch (e) {
              console.error(e);
              Alert.alert("删除失败", "请稍后重试");
            }
          },
        },
      ]
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 页面显示（获得焦点）
      load();

      // 返回函数：页面隐藏（失去焦点）时触发
      return () => {
        // 这里一般不需要做什么；如需停止订阅/定时器可放这里
      };
    }, [load])
  );

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    return (
      <Pressable
        onPress={() => onOpen(item.url)}
        onLongPress={() => onLongPressDelete(item)}
        delayLongPress={350}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          <Text style={styles.badge}>收藏</Text>
        </View>

        <Text numberOfLines={2} style={styles.url}>
          {item.url}
        </Text>

        <Text style={styles.hint}>点击打开 · 长按删除</Text>
      </Pressable>
    );
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <FlatList
        data={items}
        keyExtractor={(it) => it.url}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>暂无收藏</Text>
            <Text style={styles.emptyDesc}>在其它页面添加收藏后会显示在这里</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070C",
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  separator: {
    height: 10,
  },

  card: {
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
  },

  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  name: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  badge: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  url: {
    marginTop: 8,
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 16,
  },

  hint: {
    marginTop: 10,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
  },

  loading: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  empty: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  emptyDesc: {
    marginTop: 8,
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    lineHeight: 18,
  },
});
