import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://blaudti.com.br';

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  role: 'admin' | 'tecnico' | 'vendedor' | 'atendimento';
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export const authService = {
  async login(login: string, senha: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/api/auth/login`, { login, senha });
    const data: AuthResponse = response.data;
    await SecureStore.setItemAsync('jwt_token', data.token);
    await SecureStore.setItemAsync('usuario', JSON.stringify(data.usuario));
    return data;
  },

  async logout(): Promise<void> {
    const token = await SecureStore.getItemAsync('jwt_token');
    if (token) {
      try {
        await axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (_) {}
    }
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('usuario');
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('jwt_token');
  },

  async getUsuario(): Promise<Usuario | null> {
    const raw = await SecureStore.getItemAsync('usuario');
    return raw ? JSON.parse(raw) : null;
  },

  async isLogado(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('jwt_token');
    return !!token;
  },
};
