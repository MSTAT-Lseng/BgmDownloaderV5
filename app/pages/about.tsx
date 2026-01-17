import { AppHeader } from '@/components/app-header';
import { checkUpdate } from '@/src/services/Update';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-root-toast';

export default function AboutScreen() {
  const navigation = useNavigation();
  const appVersion = 
      Constants.expoConfig?.version ?? 
      Constants.nativeAppVersion ?? 
      '0.0.0';

  // 处理外部链接跳转
  const openUrl = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const logo = require('../../assets/images/icon.png');

  const checkUpdateHandler = async () => {
    Toast.show(`检查更新中...`, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.CENTER,
    });
    checkUpdate(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <AppHeader title={"关于"} showBack={true} onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部 Logo 与 名称 */}
        <View style={styles.logoSection}>
          <Image source={logo} style={styles.logo} />
          <Text style={styles.appName}>番剧下载</Text>
          <Text style={styles.appVersion}>Version {appVersion}</Text>
        </View>

        {/* 列表项 */}
        <View style={styles.listSection}>
          <AboutItem 
            title="访问官网" 
            subTitle="番剧下载的官方网站"
            icon="earth-outline"
            onPress={() => openUrl('https://mstat.top/bgm_downloader/')} 
          />
          
          <AboutItem 
            title="检查更新" 
            icon="cloud-download-outline"
            onPress={() => { checkUpdateHandler(); }} 
          />

          <AboutItem 
            title="邮箱反馈" 
            subTitle="ms_tat@163.com"
            icon="mail-outline"
            onPress={() => openUrl('mailto:ms_tat@163.com')} 
          />
        </View>
      </ScrollView>

      {/* 底部版权 */}
      <View style={styles.footer}>
        <Text style={styles.copyright}>Copyright © 2026 过气萌新</Text>
        <Text style={styles.copyright}>Some Rights Reserved</Text>
      </View>
    </View>
  );
}

// 复用 SettingItem 风格的组件
function AboutItem({ title, icon, onPress, subTitle }: any) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={20} color="#fff" style={styles.icon} />
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemText}>{title}</Text>
          {subTitle && <Text style={styles.itemSubText}>{subTitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#444" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070C" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 40 },
  
  // Logo 区域
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  appVersion: { color: '#999', fontSize: 14, marginTop: 4 },

  // 列表区域
  listSection: {},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12141C',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 12 },
  itemTextContainer: { flexDirection: 'column' },
  itemText: { color: '#FFF', fontSize: 16 },
  itemSubText: { color: '#AAA', fontSize: 12, marginTop: 2 },

  // 底部版权
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  copyright: {
    color: '#444',
    fontSize: 12,
    lineHeight: 18,
  },

  logo: {
    width: 92,
    height: 92,
    resizeMode: 'contain',
    borderRadius: 20,
    marginBottom: 16,
  },
});