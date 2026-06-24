import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  SafeAreaView, StatusBar, BackHandler, Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://blaudti.com.br';

export default function App() {
  const [logado, setLogado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    // Verifica token salvo
    SecureStore.getItemAsync('jwt_token').then(async t => {
      if (t) {
        const ok = await criarSessao(t);
        setLogado(ok);
      }
      setVerificando(false);
    });
  }, []);

  // Botao voltar do Android navega na WebView
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

  // Splash de verificação
  if (verificando) return (
    <View style={s.splash}>
      <Text style={s.logo}>Blaud<Text style={s.blue}>TI</Text></Text>
      <ActivityIndicator size="large" color="#4da6ff" style={{marginTop: 24}} />
    </View>
  );

  // Tela de login nativa
  if (!logado) return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2340" />
      <View style={s.loginWrap}>
        <Text style={s.logo}>Blaud<Text style={s.blue}>TI</Text></Text>
        <Text style={s.subtitulo}>Painel de Gestão</Text>

        <View style={s.card}>
          <Text style={s.label}>USUÁRIO</Text>
          <TextInput
            style={s.input}
            placeholder="seu_usuario"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            autoCorrect={false}
            value={login}
            onChangeText={setLogin}
          />

          <Text style={s.label}>SENHA</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#52525b"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={handleLogin}
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

  // Painel web — sessão Flask já criada, sem login duplo
  return (
    <SafeAreaView style={{flex:1, backgroundColor:'#1a2340'}}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2340" />
      <View style={s.topBar}>
        <Text style={s.logo}>Blaud<Text style={s.blue}>TI</Text></Text>
        <TouchableOpacity onPress={handleLogout} style={s.sairBtn}>
          <Text style={s.sairText}>Sair</Text>
        </TouchableOpacity>
      </View>
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
    flex: 1, backgroundColor: '#1a2340',
    justifyContent: 'center', alignItems: 'center'
  },
  container: { flex: 1, backgroundColor: '#09090b' },
  loginWrap: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 24
  },
  logo: {
    fontSize: 36, fontWeight: '800',
    color: '#fafafa', letterSpacing: 1,
    marginBottom: 4
  },
  blue: { color: '#3b82f6' },
  subtitulo: {
    fontSize: 11, color: '#52525b',
    letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: 40
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
  topBar: {
    height: 52, backgroundColor: '#111113',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#27272a'
  },
  sairBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: '#27272a'
  },
  sairText: { color: '#71717a', fontSize: 13 },
});
