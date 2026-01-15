import { AppHeader } from '@/components/app-header';
import {
  getSearchTimeout,
  setSearchTimeout,
} from '@/src/services/storage/searchTimeout';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function App() {
  const navigation = useNavigation();
  
  // 状态控制
  const [isPushEnabled, setIsPushEnabled] = useState(true);

  const [timeout, setTimeoutState] = useState<number>(5);

  // 超时设置弹窗
  const [timeoutModalVisible, setTimeoutModalVisible] = useState(false);
  const [savingTimeout, setSavingTimeout] = useState(false);

  const timeoutOptions = useMemo(() => [3, 5, 8, 10, 15, 20], []);

  useEffect(() => {
    getSearchTimeout().then(setTimeoutState);
  }, []);

  const openTimeoutPicker = () => {
    setTimeoutModalVisible(true);
  };

  const closeTimeoutPicker = () => {
    if (savingTimeout) return;
    setTimeoutModalVisible(false);
  };

  const handleSelectTimeout = async (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;

    try {
      setSavingTimeout(true);
      await setSearchTimeout(value);
      setTimeoutState(value);
      setTimeoutModalVisible(false);
    } finally {
      setSavingTimeout(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <AppHeader title={"设置"} showBack={true} onBackPress={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* 分组标题 */}
        <Text style={styles.sectionTitle}>搜索</Text>

        {/* 右侧文字形式 */}
        <SettingItem 
          title="超时时间" 
          icon="timer-outline"
          rightText={`${timeout} 秒`}
          onPress={openTimeoutPicker}
          subTitle="加载搜索结果最长的等待时间"
        />
        
        {/* 开关形式 */}
        {/*<SettingItem 
          title="推送通知"
          subTitle="已开启"
          icon="notifications-outline"
          rightElement={
            <Switch 
              value={isPushEnabled} 
              onValueChange={setIsPushEnabled}
              trackColor={{ false: "#3e3e3e", true: "#007AFF" }}
            />
          }
        />

        <Text style={styles.sectionTitle}>账户</Text>*/}

        {/* 普通箭头跳转 */}
        {/*<SettingItem 
          title="个人资料" 
          icon="person-outline"
          onPress={() => {}} 
        />
        
        <SettingItem 
          title="关于我们" 
          icon="information-circle-outline"
          rightText="v1.0.1"
          onPress={() => {}} 
        />*/}
      </View>

      {/* 超时时间选择弹窗 */}
      <Modal
        visible={timeoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTimeoutPicker}
      >
        <Pressable style={styles.modalMask} onPress={closeTimeoutPicker}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>搜索超时时间</Text>
              <TouchableOpacity onPress={closeTimeoutPicker} disabled={savingTimeout}>
                <Ionicons name="close" size={20} color="#AAA" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetDesc}>选择一次搜索最多等待的时间（单位：秒）。</Text>

            <View style={styles.optionList}>
              {timeoutOptions.map((v) => {
                const selected = v === timeout;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.optionItem, selected && styles.optionItemSelected]}
                    onPress={() => handleSelectTimeout(v)}
                    disabled={savingTimeout}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionLeft}>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {v} 秒
                      </Text>
                      {selected && (
                        <Text style={styles.optionTag}>当前</Text>
                      )}
                    </View>

                    {selected ? (
                      <Ionicons name="checkmark-circle" size={18} color="#2F80ED" />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#444" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sheetHint}>
              提示：超时时间越长，弱网下更不容易失败，但等待会更久。
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// 通用配置行组件
function SettingItem({ title, icon, rightText, rightElement, onPress, subTitle }: any) {
  return (
    <TouchableOpacity 
      style={styles.item} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={20} color="#fff" style={styles.icon} />
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemText}>{title}</Text>
          {subTitle && <Text style={styles.itemSubText}>{subTitle}</Text>}
        </View>
      </View>
      
      <View style={styles.itemRight}>
        {rightText && <Text style={styles.rightText}>{rightText}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={18} color="#444" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070C" },
  content: { paddingHorizontal: 16, marginTop: 10 },
  sectionTitle: { color: "#666", fontSize: 13, marginBottom: 8, marginTop: 16, marginLeft: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12141C',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  icon: { marginRight: 12 },
  itemText: { color: '#FFF', fontSize: 16 },
  itemRight: { flexDirection: 'row', alignItems: 'center' },
  rightText: { color: '#AAA', fontSize: 14, marginRight: 8 },
  itemSubText: { color: '#AAA', fontSize: 12 },
  itemTextContainer: { flexDirection: 'column' },

  // Modal / Bottom Sheet
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F121A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#1B1F2A',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  sheetDesc: { color: '#AAA', fontSize: 12, marginTop: 8 },
  optionList: { marginTop: 12 },
  optionItem: {
    backgroundColor: '#12141C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#12141C',
  },
  optionItemSelected: {
    borderColor: '#2F80ED',
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionText: { color: '#FFF', fontSize: 14 },
  optionTextSelected: { color: '#EAF2FF' },
  optionTag: {
    marginLeft: 8,
    fontSize: 11,
    color: '#2F80ED',
  },
  sheetHint: { color: '#777', fontSize: 11, marginTop: 6 },
});