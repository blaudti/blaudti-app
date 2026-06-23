import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { authService } from './src/services/auth';
import LoginScreen from './src/screens/LoginScreen';
import PainelScreen from './src/screens/PainelScreen';

export default function App() {
  const [logado, setLogado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Verifica se já tem sessão salva
    authService.isLogado().then((resultado) => {
      setLogado(resultado);
      setVerificando(false);
    });

    // Listener para notificações recebidas com app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notificação recebida:', notification);
    });

    // Listener para quando usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Navega para o ticket se vier com numero
      if (data?.numero) {
        console.log('Abrir ticket:', data.numero);
        // WebView vai navegar automaticamente via deep link
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  if (verificando) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4da6ff" />
      </View>
    );
  }

  if (!logado) {
    return <LoginScreen onLogin={() => setLogado(true)} />;
  }

  return <PainelScreen onLogout={() => setLogado(false)} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1a2340',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
