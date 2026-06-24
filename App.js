import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  SafeAreaView, StatusBar, BackHandler, Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const API_URL = 'https://blaudti.com.br';

// Configura comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function pedirPermissaoNotificacao() {
  if (!Device.isDevice) return null;
  const { status: atual } = await Notifications.getPermissionsAsync();
  if (atual === 'granted') return 'granted';
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

export default function App() {
  const [logado, setLogado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    // Pede permissão de notificação ao iniciar
    pedirPermissaoNotificacao();

    // Verifica sessão salva
    SecureStore.getItemAsync('jwt_token').then(async t => {
      if (t) {
        const ok = await criarSessao(t);
        setLogado(ok);
      }
      setVerificando(false);
    });
  }, []);

  // Botao voltar Android navega na WebView
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
    setCarregando(true);
    try {
      const resp = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({login: login.trim(), senha})
      });
      const data = await resp.json();
      if (data.token) {
        await SecureStore.setItemAsync('jwt_token', data.token);
        await SecureStore.setItemAsync('ultimo_login', login.trim());
        await criarSessao(data.token);
        setLogado(true);
      } else {
        Alert.alert('Erro', data.erro || 'Credenciais inválidas.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    }
    setCarregando(false);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    setLogin('');
    setSenha('');
    setLogado(false);
  };

  // Carrega último login salvo
  useEffect(() => {
    SecureStore.getItemAsync('ultimo_login').then(u => {
      if (u) setLogin(u);
    });
  }, []);

  if (verificando) return (
    <View style={s.splash}>
      <Text style={s.logoGrande}>Blaud<Text style={s.blue}>TI</Text></Text>
      <ActivityIndicator size="large" color="#4da6ff" style={{marginTop: 32}} />
    </View>
  );

  if (!logado) return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={s.loginWrap}>
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
          />
          <Text style={s.label}>SENHA</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#52525b"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />
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
      </View>
    </SafeAreaView>
  );

  // Painel web — sem barra superior, ocupa tela toda
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#09090b'}}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <WebView
        ref={webviewRef}
        source={{uri: API_URL + '/painel'}}
        style={{flex: 1}}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onShouldStartLoadWithRequest={(req) =>
          req.url.startsWith('https://blaudti.com.br') ||
          req.url.startsWith('about:')
        }
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
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 24
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
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 4
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
