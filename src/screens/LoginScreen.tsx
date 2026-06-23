import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { authService } from '../services/auth';
import { notificacaoService } from '../services/notificacoes';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async () => {
    if (!login.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha login e senha.');
      return;
    }
    setCarregando(true);
    try {
      await authService.login(login.trim(), senha);
      await notificacaoService.registrar();
      onLogin();
    } catch (e: any) {
      const msg = e?.response?.data?.erro || 'Verifique suas credenciais.';
      Alert.alert('Erro ao entrar', msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logoArea}>
          <Text style={styles.logoTexto}>Blaud<Text style={styles.logoDestaque}>TI</Text></Text>
          <Text style={styles.logoSub}>Painel de Gestão</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Login"
          placeholderTextColor="#8a9bb5"
          autoCapitalize="none"
          value={login}
          onChangeText={setLogin}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#8a9bb5"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesabilitado]}
          onPress={handleLogin}
          disabled={carregando}
        >
          {carregando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botaoTexto}>Entrar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2340',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#222d47',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoTexto: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  logoDestaque: {
    color: '#4da6ff',
  },
  logoSub: {
    color: '#8a9bb5',
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1a2340',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2e3d5c',
  },
  botao: {
    backgroundColor: '#4da6ff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
