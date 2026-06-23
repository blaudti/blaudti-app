# modules/fcm.py
# Usa Expo Push API (sem precisar do Firebase Admin SDK diretamente)
# O Expo roteia para o FCM automaticamente — mais simples de configurar
#
# Não precisa de google-services.json no servidor!

import requests
import logging
from modules.auth import get_tokens_por_roles, get_tokens_do_tecnico

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

# Matriz de roles por evento
ROLES_POR_EVENTO = {
    'ticket_criado':      ['admin', 'tecnico', 'vendedor', 'atendimento'],
    'status_atualizado':  ['admin', 'tecnico', 'vendedor', 'atendimento'],
    'orcamento_aprovado': ['admin', 'vendedor'],
    'revisao_solicitada': ['admin', 'vendedor'],
    'd1_vencimento':      ['admin', 'tecnico', 'vendedor', 'atendimento'],
}

TITULOS = {
    'ticket_criado':      '🎫 Novo ticket',
    'status_atualizado':  '🔄 Status atualizado',
    'orcamento_aprovado': '✅ Orçamento aprovado!',
    'revisao_solicitada': '🔄 Revisão solicitada',
    'd1_vencimento':      '⏰ Ticket vence amanhã',
}

def notificar_push_fcm(evento: str, task: dict, mensagem: str = None):
    """
    Dispara push via Expo para os roles corretos.
    Para eventos de técnico (status/d1), filtra pelo técnico do ticket.
    """
    roles = ROLES_POR_EVENTO.get(evento, [])
    titulo = TITULOS.get(evento, 'BlaudTI')
    numero = task.get('numero', '')
    client = task.get('client', '')
    body = mensagem or f'{numero} — {client}'

    tokens = []

    if evento in ('status_atualizado', 'd1_vencimento'):
        # Admin, vendedor e atendimento recebem sempre
        tokens_gerais = get_tokens_por_roles(['admin', 'vendedor', 'atendimento'])
        tokens.extend(tokens_gerais)
        # Técnico só recebe se for o responsável pelo ticket
        nome_tecnico = task.get('tecnico') or task.get('vendedor', '')
        if nome_tecnico:
            tokens_tec = get_tokens_do_tecnico(nome_tecnico)
            tokens.extend(tokens_tec)
    else:
        tokens = get_tokens_por_roles(roles)

    if not tokens:
        logger.info(f'[FCM] Nenhum token para evento {evento}')
        return

    # Remove duplicatas
    tokens = list(set(tokens))

    # Monta mensagens (Expo aceita até 100 por request)
    mensagens = [
        {
            'to': token,
            'title': titulo,
            'body': body,
            'data': {
                'evento': evento,
                'numero': numero,
                'ticket_id': task.get('id', ''),
            },
            'sound': 'default',
            'priority': 'high',
        }
        for token in tokens
    ]

    # Envia em chunks de 100
    for i in range(0, len(mensagens), 100):
        chunk = mensagens[i:i+100]
        try:
            resp = requests.post(
                EXPO_PUSH_URL,
                json=chunk,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                timeout=10
            )
            logger.info(f'[FCM] Evento {evento} → {len(chunk)} tokens → HTTP {resp.status_code}')
        except Exception as e:
            logger.error(f'[FCM] Erro ao enviar push: {e}')
