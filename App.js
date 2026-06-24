import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  SafeAreaView, StatusBar, BackHandler,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const API_URL = 'https://blaudti.com.br';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function pedirPermissao() {
  if (!Device.isDevice) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export default function App() {
  const [logado, setLogado]       = useState(false);
  const [verificando, setVerif]   = useState(true);
  const [login, setLogin]         = useState('');
  const [senha, setSenha]         = useState('');
  const [lembrar, setLembrar]     = useState(true);
  const [carregando, setLoad]     = useState(false);
  const [semInternet, setSemNet]  = useState(false);
  const [webLoading, setWebLoad]  = useState(true);
  const webviewRef = useRef(null);

  // Inicializa
  useEffect(() => {
    pedirPermissao();
    inicializar();
  }, []);

  const inicializar = async () => {
    // Carrega credenciais salvas
    const loginSalvo = await SecureStore.getItemAsync('salvo_login');
    const senhaSalva = await SecureStore.getItemAsync('salvo_senha');
    if (loginSalvo) setLogin(loginSalvo);
    if (senhaSalva) setSenha(senhaSalva);

    // Verifica token
    const token = await SecureStore.getItemAsync('jwt_token');
    if (token) {
      const ok = await criarSessao(token);
      setLogado(ok);
    }
    setVerif(false);
  };

  // Botão voltar Android
  useEffect(() => {
    const onBack = () => {
      if (logado && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
  }, [logado]);

  const criarSessao = async (token) => {
    try {
      const resp = await fetch(API_URL + '/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });
      return resp.ok;
    } catch {
      return false;
    }
  };

  const handleLogin = async () => {
    if (!login.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha login e senha.');
      return;
    }
    setLoad(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({login: login.trim(), senha}),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await resp.json();
      if (data.token) {
        // Salva token
        await SecureStore.setItemAsync('jwt_token', data.token);
        // Salva credenciais se "lembrar" ativo
        if (lembrar) {
          await SecureStore.setItemAsync('salvo_login', login.trim());
          await SecureStore.setItemAsync('salvo_senha', senha);
        } else {
          await SecureStore.deleteItemAsync('salvo_login');
          await SecureStore.deleteItemAsync('salvo_senha');
        }
        await criarSessao(data.token);
        setLogado(true);
      } else {
        Alert.alert('Erro', data.erro || 'Credenciais inválidas.');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        Alert.alert('Tempo esgotado', 'O servidor não respondeu. Verifique sua conexão.');
      } else {
        Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
      }
    }
    setLoad(false);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    // Mantém credenciais salvas para próximo login
    setLogado(false);
  };

  // Splash
  if (verificando) return (
    <View style={s.splash}>
      <Text style={s.logoGrande}>Blaud<Text style={s.blue}>TI</Text></Text>
      <ActivityIndicator size="large" color="#3b82f6" style={{marginTop: 32}} />
    </View>
  );

  // Tela de login
  if (!logado) return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}
      >
        <ScrollView
          contentContainerStyle={s.loginWrap}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.logoGrande}>Blaud<Text style={s.blue}>TI</Text></Text>
          <Text style={s.subtitulo}>Painel de Gestão</Text>

          <View style={s.card}>
            <Text style={s.label}>USUÁRIO</Text>
            <TextInput
              style={s.input}
              placeholder="seu_usuario"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              value={login}
              onChangeText={setLogin}
              returnKeyType="next"
            />

            <Text style={s.label}>SENHA</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            {/* Lembrar credenciais */}
            <TouchableOpacity
              style={s.lembrarRow}
              onPress={() => setLembrar(!lembrar)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, lembrar && s.checkboxOn]}>
                {lembrar && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.lembrarText}>Lembrar login e senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, carregando && s.btnDisabled]}
              onPress={handleLogin}
              disabled={carregando}
              activeOpacity={0.8}
            >
              {carregando
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Entrar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Sem internet
  if (semInternet) return (
    <SafeAreaView style={s.semNet}>
      <Text style={s.semNetIcon}>📡</Text>
      <Text style={s.semNetTxt}>Sem conexão com o servidor</Text>
      <TouchableOpacity style={s.btn} onPress={() => {
        setSemNet(false);
        setWebLoad(true);
        if (webviewRef.current) webviewRef.current.reload();
      }}>
        <Text style={s.btnText}>Tentar novamente</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Painel web
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#09090b'}}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      {webLoading && (
        <View style={s.webLoading}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
      <WebView
        ref={webviewRef}
        source={{uri: API_URL + '/painel'}}
        style={{flex: 1}}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onLoadStart={() => setWebLoad(true)}
        onLoadEnd={() => setWebLoad(false)}
        onError={() => setSemNet(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) setSemNet(true);
        }}
        onShouldStartLoadWithRequest={(req) =>
          req.url.startsWith('https://blaudti.com.br') ||
          req.url.startsWith('about:')
        }
        renderLoading={() => <View />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#09090b',
    justifyContent: 'center', alignItems: 'center'
  },
  container: { flex: 1, backgroundColor: '#09090b' },
  loginWrap: {
    flexGrow: 1, justifyContent: 'center',
    alignItems: 'center', padding: 24, paddingVertical: 48
  },
  logoGrande: {
    fontSize: 40, fontWeight: '800',
    color: '#fafafa', letterSpacing: 1,
  },
  blue: { color: '#3b82f6' },
  subtitulo: {
    fontSize: 11, color: '#52525b',
    letterSpacing: 3, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 40
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: '#111113',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#27272a',
    padding: 24
  },
  label: {
    fontSize: 11, fontWeight: '600',
    color: '#71717a', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 6
  },
  input: {
    backgroundColor: '#18181b',
    color: '#fafafa',
    borderRadius: 8,
    borderWidth: 1, borderColor: '#27272a',
    padding: 12, fontSize: 14,
    marginBottom: 16
  },
  lembrarRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, gap: 10
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1, borderColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  checkboxOn: { backgroundColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  lembrarText: { color: '#71717a', fontSize: 13 },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 4
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  semNet: {
    flex: 1, backgroundColor: '#09090b',
    justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16
  },
  semNetIcon: { fontSize: 48 },
  semNetTxt: { color: '#71717a', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  webLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center',
    zIndex: 10
  },
});
