# modules/auth.py
# Adicionar ao CT 102 em /opt/painel-blaudti/modules/auth.py
#
# Dependências: pip install flask-jwt-extended bcrypt --break-system-packages
# (ou no venv: /opt/painel-blaudti/venv/bin/pip install flask-jwt-extended bcrypt)

import sqlite3
import bcrypt
from datetime import timedelta
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity

DB_PATH = '/opt/painel-blaudti/painel.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Cria tabelas se não existirem e insere o admin padrão."""
    conn = get_db()
    cur = conn.cursor()

    cur.executescript('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            nome      TEXT NOT NULL,
            login     TEXT UNIQUE NOT NULL,
            senha     TEXT NOT NULL,
            role      TEXT NOT NULL DEFAULT 'atendimento',
            ativo     INTEGER DEFAULT 1,
            criado_em TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS fcm_tokens (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
            token      TEXT NOT NULL,
            device     TEXT,
            criado_em  TEXT DEFAULT (datetime('now')),
            UNIQUE(usuario_id, token)
        );
    ''')

    # Insere admin padrão se não existir
    existe = cur.execute("SELECT id FROM usuarios WHERE login = 'blaudt_ADMIN'").fetchone()
    if not existe:
        senha_hash = bcrypt.hashpw(b'Bm#153040', bcrypt.gensalt()).decode()
        cur.execute(
            "INSERT INTO usuarios (nome, login, senha, role) VALUES (?, ?, ?, ?)",
            ('Administrador', 'blaudt_ADMIN', senha_hash, 'admin')
        )

    conn.commit()
    conn.close()

def autenticar(login: str, senha: str):
    """Retorna dict do usuário ou None."""
    conn = get_db()
    usuario = conn.execute(
        "SELECT * FROM usuarios WHERE login = ? AND ativo = 1", (login,)
    ).fetchone()
    conn.close()

    if not usuario:
        return None

    if not bcrypt.checkpw(senha.encode(), usuario['senha'].encode()):
        return None

    return dict(usuario)

def registrar_fcm_token(usuario_id: int, token: str, device: str = None):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO fcm_tokens (usuario_id, token, device) VALUES (?, ?, ?)",
        (usuario_id, token, device)
    )
    conn.commit()
    conn.close()

def remover_fcm_token(usuario_id: int, token: str):
    conn = get_db()
    conn.execute(
        "DELETE FROM fcm_tokens WHERE usuario_id = ? AND token = ?",
        (usuario_id, token)
    )
    conn.commit()
    conn.close()

def get_tokens_por_roles(roles: list) -> list:
    """Retorna lista de tokens FCM dos usuários com os roles especificados."""
    conn = get_db()
    placeholders = ','.join(['?' for _ in roles])
    tokens = conn.execute(f'''
        SELECT ft.token FROM fcm_tokens ft
        JOIN usuarios u ON ft.usuario_id = u.id
        WHERE u.role IN ({placeholders}) AND u.ativo = 1
    ''', roles).fetchall()
    conn.close()
    return [t['token'] for t in tokens]

def get_tokens_do_tecnico(nome_tecnico: str) -> list:
    """Tokens do técnico específico pelo nome."""
    conn = get_db()
    tokens = conn.execute('''
        SELECT ft.token FROM fcm_tokens ft
        JOIN usuarios u ON ft.usuario_id = u.id
        WHERE u.nome = ? AND u.role = 'tecnico' AND u.ativo = 1
    ''', (nome_tecnico,)).fetchall()
    conn.close()
    return [t['token'] for t in tokens]
