import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://blaudti.com.br';

export default function App() {
  const [logado, setLogado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('jwt_token').then(token => {
      setLogado(!!token);
      setVerificando(false);
    });
  }, []);

  const handleLogin = async () => {
    if (!login || !senha) { Alert.alert('Preencha login e senha'); return; }
    setCarregando(true);
    try {
      const resp = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha })
      });
      const data = await resp.json();
      if (data.token) {
        await SecureStore.setItemAsync('jwt_token', data.token);
        setLogado(true);
      } else {
        Alert.alert('Erro', data.erro || 'Credenciais invalidas');
      }
    } catch (e) {
      Alert.alert('Erro', 'Nao foi possivel conectar');
    }
    setCarregando(false);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    setLogado(false);
  };

  if (verificando) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4da6ff" />
      </View>
    );
  }

  if (!logado) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a2340" />
        <View style={styles.card}>
          <Text style={styles.logo}>Blaud<Text style={styles.blue}>TI</Text></Text>
          <TextInput style={styles.input} placeholder="Login" placeholderTextColor="#8a9bb5" autoCapitalize="none" value={login} onChangeText={setLogin} />
          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#8a9bb5" secureTextEntry value={senha} onChangeText={setSenha} />
          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={carregando}>
            {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Entrar</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a2340' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2340" />
      <View style={styles.topBar}>
        <Text style={styles.logo}>Blaud<Text style={styles.blue}>TI</Text></Text>
        <TouchableOpacity onPress={handleLogout} style={styles.sairBtn}>
          <Text style={styles.sairText}>Sair</Text>
        </TouchableOpacity>
      </View>
      <WebView source={{ uri: API_URL + '/painel' }} style={{ flex: 1 }} javaScriptEnabled domStorageEnabled />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#1a2340', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#1a2340', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#222d47', borderRadius: 16, padding: 32 },
  logo: { fontSize: 32, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 32 },
  blue: { color: '#4da6ff' },
  input: { backgroundColor: '#1a2340', color: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#2e3d5c' },
  btn: { backgroundColor: '#4da6ff', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  topBar: { height: 48, backgroundColor: '#1a2340', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#2e3d5c' },
  sairBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2e3d5c' },
  sairText: { color: '#8a9bb5', fontSize: 13 },
});
