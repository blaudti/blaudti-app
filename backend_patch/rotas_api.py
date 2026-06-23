# backend_patch/rotas_api.py
# Cole estas rotas no app.py do CT 102
# Adicione também no início do app.py:
#
#   from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
#   from modules.auth import init_db, autenticar, registrar_fcm_token, remover_fcm_token
#   from modules.fcm import notificar_push_fcm
#
#   app.config['JWT_SECRET_KEY'] = 'TROQUE_POR_STRING_ALEATORIA_LONGA'
#   app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
#   jwt = JWTManager(app)
#
#   # Chame no início, após criar o app:
#   init_db()

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from modules.auth import autenticar, registrar_fcm_token, remover_fcm_token, get_db
from datetime import timedelta

api = Blueprint('api', __name__, url_prefix='/api')

# ── AUTH ──────────────────────────────────────────────────────────────────────

@api.route('/auth/login', methods=['POST'])
def api_login():
    dados = request.get_json()
    if not dados or not dados.get('login') or not dados.get('senha'):
        return jsonify({'erro': 'Login e senha obrigatórios.'}), 400

    usuario = autenticar(dados['login'], dados['senha'])
    if not usuario:
        return jsonify({'erro': 'Credenciais inválidas.'}), 401

    token = create_access_token(
        identity=str(usuario['id']),
        additional_claims={'role': usuario['role'], 'nome': usuario['nome']},
        expires_delta=timedelta(days=30)
    )

    return jsonify({
        'token': token,
        'usuario': {
            'id': usuario['id'],
            'nome': usuario['nome'],
            'login': usuario['login'],
            'role': usuario['role'],
        }
    })

@api.route('/auth/logout', methods=['POST'])
@jwt_required()
def api_logout():
    # JWT é stateless — o app descarta o token localmente
    return jsonify({'ok': True})

# ── FCM TOKENS ────────────────────────────────────────────────────────────────

@api.route('/fcm/register', methods=['POST'])
@jwt_required()
def fcm_register():
    usuario_id = int(get_jwt_identity())
    dados = request.get_json()
    token = dados.get('token')
    device = dados.get('device', 'Android')

    if not token:
        return jsonify({'erro': 'Token obrigatório.'}), 400

    registrar_fcm_token(usuario_id, token, device)
    return jsonify({'ok': True})

@api.route('/fcm/unregister', methods=['DELETE'])
@jwt_required()
def fcm_unregister():
    usuario_id = int(get_jwt_identity())
    dados = request.get_json()
    token = dados.get('token')

    if not token:
        return jsonify({'erro': 'Token obrigatório.'}), 400

    remover_fcm_token(usuario_id, token)
    return jsonify({'ok': True})

# ── TICKETS (leitura via API para o app) ─────────────────────────────────────

@api.route('/tickets', methods=['GET'])
@jwt_required()
def api_tickets():
    """O app usa WebView — esta rota é opcional, para futuras telas nativas."""
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    role = claims.get('role')
    nome = claims.get('nome')

    import json, os
    tasks_path = '/opt/painel-blaudti/tasks.json'
    if not os.path.exists(tasks_path):
        return jsonify([])

    with open(tasks_path) as f:
        tasks = json.load(f)

    # Técnico só vê os próprios tickets
    if role == 'tecnico':
        tasks = [t for t in tasks if t.get('tecnico') == nome]

    return jsonify(tasks)

# ── USUARIOS (somente admin) ──────────────────────────────────────────────────

@api.route('/usuarios', methods=['GET'])
@jwt_required()
def api_usuarios():
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'erro': 'Acesso negado.'}), 403

    conn = get_db()
    usuarios = conn.execute(
        "SELECT id, nome, login, role, ativo, criado_em FROM usuarios ORDER BY nome"
    ).fetchall()
    conn.close()

    return jsonify([dict(u) for u in usuarios])

@api.route('/usuarios', methods=['POST'])
@jwt_required()
def api_criar_usuario():
    from flask_jwt_extended import get_jwt
    import bcrypt
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'erro': 'Acesso negado.'}), 403

    dados = request.get_json()
    nome = dados.get('nome', '').strip()
    login = dados.get('login', '').strip()
    senha = dados.get('senha', '').strip()
    role = dados.get('role', 'atendimento')

    if not nome or not login or not senha:
        return jsonify({'erro': 'Nome, login e senha obrigatórios.'}), 400

    if role not in ('admin', 'tecnico', 'vendedor', 'atendimento'):
        return jsonify({'erro': 'Role inválido.'}), 400

    senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO usuarios (nome, login, senha, role) VALUES (?, ?, ?, ?)",
            (nome, login, senha_hash, role)
        )
        conn.commit()
        conn.close()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'erro': f'Login já existe: {str(e)}'}), 409
