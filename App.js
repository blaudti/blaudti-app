import React, { useRef } from 'react';
import {
  View, StyleSheet, SafeAreaView,
  StatusBar, TouchableOpacity, Text, BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';

const PAINEL_URL = 'https://blaudti.com.br/painel';

export default function App() {
  const webviewRef = useRef(null);

  // Botao voltar do Android navega dentro da WebView
  React.useEffect(() => {
    const onBack = () => {
      if (webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2340" />
      <View style={s.topBar}>
        <Text style={s.logo}>Blaud<Text style={s.blue}>TI</Text></Text>
      </View>
      <WebView
        ref={webviewRef}
        source={{ uri: PAINEL_URL }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        onShouldStartLoadWithRequest={(req) => {
          return req.url.startsWith('https://blaudti.com.br') ||
                 req.url.startsWith('about:');
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2340' },
  topBar: {
    height: 48,
    backgroundColor: '#1a2340',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2e3d5c',
  },
  logo: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  blue: { color: '#4da6ff' },
});
