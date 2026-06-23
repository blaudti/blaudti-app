import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, ActivityIndicator,
  TouchableOpacity, Text, Platform, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { authService } from '../services/auth';
import { notificacaoService } from '../services/notificacoes';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://blaudti.com.br';

interface Props {
  onLogout: () => void;
}

export default function PainelScreen({ onLogout }: Props) {
  const webviewRef = useRef<WebView>(null);
  const [carregando, setCarregando] = useState(true);
  const [urlAtual, setUrlAtual] = useState(`${API_URL}/painel`);

  const handleLogout = async () => {
    await notificacaoService.removerToken();
    await authService.logout();
    onLogout();
  };

  // Injeta o JWT no cookie da WebView para autenticar automaticamente
  const injectAuth = async () => {
    const token = await authService.getToken();
    if (!token || !webviewRef.current) return;
    webviewRef.current.injectJavaScript(`
      document.cookie = 'app_jwt=${token}; path=/; SameSite=Lax';
      true;
    `);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2340" />

      {/* Barra superior */}
      <View style={styles.topBar}>
        <Text style={styles.topBarLogo}>
          Blaud<Text style={styles.topBarDestaque}>TI</Text>
        </Text>
        <TouchableOpacity onPress={handleLogout} style={styles.sairBtn}>
          <Text style={styles.sairTexto}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* WebView do painel */}
      <WebView
        ref={webviewRef}
        source={{ uri: `${API_URL}/painel` }}
        style={styles.webview}
        onLoadStart={() => setCarregando(true)}
        onLoadEnd={() => {
          setCarregando(false);
          injectAuth();
        }}
        onNavigationStateChange={(state) => setUrlAtual(state.url)}
        // Bloqueia saída para domínios externos
        onShouldStartLoadWithRequest={(request) => {
          return request.url.startsWith(API_URL) || request.url.startsWith('about:');
        }}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
      />

      {carregando && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4da6ff" />
        </View>
      )}

      {/* Barra inferior de navegação */}
      <View style={styles.bottomBar}>
        <NavBtn
          label="Dashboard"
          onPress={() => webviewRef.current?.injectJavaScript(`window.location='${API_URL}/painel'; true;`)}
          ativo={urlAtual.endsWith('/painel') || urlAtual.endsWith('/painel/')}
        />
        <NavBtn
          label="Tickets"
          onPress={() => webviewRef.current?.injectJavaScript(`window.location='${API_URL}/painel/tickets'; true;`)}
          ativo={urlAtual.includes('/tickets')}
        />
        <NavBtn
          label="Hotspot"
          onPress={() => webviewRef.current?.injectJavaScript(`window.location='${API_URL}/painel/hotspot'; true;`)}
          ativo={urlAtual.includes('/hotspot')}
        />
        <NavBtn
          label="Cloud"
          onPress={() => webviewRef.current?.injectJavaScript(`window.location='${API_URL}/painel/cloud'; true;`)}
          ativo={urlAtual.includes('/cloud')}
        />
      </View>
    </View>
  );
}

function NavBtn({ label, onPress, ativo }: { label: string; onPress: () => void; ativo: boolean }) {
  return (
    <TouchableOpacity style={styles.navBtn} onPress={onPress}>
      <Text style={[styles.navBtnTexto, ativo && styles.navBtnAtivo]}>{label}</Text>
      {ativo && <View style={styles.navBtnIndicador} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2340',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBar: {
    height: 48,
    backgroundColor: '#1a2340',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2e3d5c',
  },
  topBarLogo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  topBarDestaque: {
    color: '#4da6ff',
  },
  sairBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e3d5c',
  },
  sairTexto: {
    color: '#8a9bb5',
    fontSize: 13,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a2340',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    height: 56,
    backgroundColor: '#1a2340',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2e3d5c',
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnTexto: {
    color: '#8a9bb5',
    fontSize: 12,
  },
  navBtnAtivo: {
    color: '#4da6ff',
    fontWeight: '700',
  },
  navBtnIndicador: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4da6ff',
    marginTop: 3,
  },
});
