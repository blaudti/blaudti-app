# BlaudTI App

App Android para gestão de tickets, hotspot e cloud da BlaudTI.
Desenvolvido com React Native (Expo) + WebView + Push Notifications via Expo/FCM.

---

## Arquitetura

```
App Android (Expo WebView)
        ↓ HTTPS
CT 102 Flask (blaudti.com.br/painel)
        ↓ Expo Push API
Expo Servers → FCM → Celular
```

O app é uma casca nativa que:
- Exibe o painel web via WebView (sem recriar telas)
- Gerencia login com JWT persistente
- Recebe push notifications confiáveis via FCM
- Filtra notificações por role do usuário

---

## Roles e Notificações

| Evento               | Admin | Técnico         | Vendedor | Atendimento |
|----------------------|-------|-----------------|----------|-------------|
| Ticket criado        | ✅    | ✅              | ✅       | ✅          |
| Status atualizado    | ✅    | ✅ (só os seus) | ✅       | ✅          |
| Orçamento aprovado   | ✅    | ❌              | ✅       | ❌          |
| Revisão solicitada   | ✅    | ❌              | ✅       | ❌          |
| D-1 vencimento       | ✅    | ✅ (só os seus) | ✅       | ✅          |

---

## Passo 1 — Backend CT 102

SSH no CT 102 e execute:

```bash
# Instalar dependências
cd /opt/painel-blaudti
source venv/bin/activate
pip install flask-jwt-extended bcrypt

# Copiar módulos
cp modules_auth.py modules/auth.py
cp modules_fcm.py modules/fcm.py
cp rotas_api.py modules/rotas_api.py
```

No `app.py`, adicione após os imports existentes:

```python
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from datetime import timedelta
from modules.auth import init_db
from modules.rotas_api import api as api_blueprint

app.config['JWT_SECRET_KEY'] = 'TROQUE_POR_STRING_ALEATORIA_AQUI'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)
app.register_blueprint(api_blueprint)
init_db()  # Cria tabelas e insere admin padrão
```

Restart:
```bash
systemctl restart painel-blaudti
```

Teste:
```bash
curl -X POST https://blaudti.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"blaudt_ADMIN","senha":"Bm#153040"}'
# Deve retornar {"token":"eyJ...","usuario":{...}}
```

---

## Passo 2 — Conta Expo

1. Acesse https://expo.dev e crie conta gratuita
2. Crie um projeto chamado `blaudti-app`
3. Copie o **Project ID** e cole em `app.json`:
   ```json
   "projectId": "SEU_PROJECT_ID_AQUI"
   ```

---

## Passo 3 — EAS Build (gerar APK sem PC)

No terminal do seu PC ou via GitHub Actions:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Ou configure GitHub Actions para buildar automaticamente a cada push.

O build demora ~10-15 minutos. Ao final, baixe o `.apk` e instale no celular.

---

## Passo 4 — Instalar no celular

1. Baixe o `.apk` gerado pelo EAS
2. No Android: Configurações → Segurança → Fontes desconhecidas → Ativar
3. Abra o `.apk` e instale
4. Faça login com as credenciais do painel
5. Aceite a permissão de notificações

---

## Estrutura do projeto

```
blaudti-app/
├── App.tsx                    # Ponto de entrada
├── app.json                   # Config Expo
├── eas.json                   # Config build EAS
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx    # Tela de login
│   │   └── PainelScreen.tsx   # WebView + nav
│   └── services/
│       ├── auth.ts            # JWT + SecureStore
│       └── notificacoes.ts    # Registro FCM
└── backend_patch/
    ├── modules_auth.py        # Copiar para modules/auth.py
    ├── modules_fcm.py         # Copiar para modules/fcm.py
    └── rotas_api.py           # Importar no app.py
```

---

## Gestão de usuários

Após aplicar o patch no backend, crie usuários via API:

```bash
# Pegar token admin
TOKEN=$(curl -s -X POST https://blaudti.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"blaudt_ADMIN","senha":"Bm#153040"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Criar técnico
curl -X POST https://blaudti.com.br/api/usuarios \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"João Silva","login":"joao","senha":"senha123","role":"tecnico"}'

# Criar vendedor
curl -X POST https://blaudti.com.br/api/usuarios \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria Santos","login":"maria","senha":"senha123","role":"vendedor"}'
```

Roles disponíveis: `admin`, `tecnico`, `vendedor`, `atendimento`

---

## Próximos passos

- [ ] Tela nativa de gestão de usuários no app (admin)
- [ ] Substituir web push VAPID pelo FCM em todos os eventos
- [ ] Publicar na Play Store
