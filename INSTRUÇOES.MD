Quero criar um agente de IA integrado ao WhatsApp usando apenas ferramentas gratuitas, em um único arquivo.
Versão escolhida: Node.js com whatsapp-web.js (sem precisar de Twilio ou ngrok — só escanear um QR code).
O que o agente deve fazer:

Receber mensagens do WhatsApp automaticamente
Responder usando a API da Groq (grátis) com o modelo Llama 3
Lembrar o histórico da conversa por usuário
Ter comandos especiais: /reset, /ajuda, /status
Funcionar em mensagens privadas (NÃO RESPONDER GRUPOS)

Ferramentas usadas:

whatsapp-web.js → conecta ao WhatsApp via QR code
qrcode-terminal → mostra o QR no terminal
axios → faz chamadas à API da Groq
Groq API (gratuita) → gera as respostas com IA

Como rodar:

npm install whatsapp-web.js qrcode-terminal axios
Colocar a Groq API Key no arquivo (pegar em console.groq.com)
Rodar node whatsapp_agent.js
Escanear o QR code que aparece no terminal com o WhatsApp

Crie o código completo em um único arquivo .js, bem comentado em português, com tratamento de erros.


EXEMPLO DE COMO O AGENTE DEVE FUNCIONAR:
┌─────────────────────────────────────┐
│     PACIENTE ENVIA MENSAGEM         │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│      AGENTE IDENTIFICA              │
│       intenção da mensagem          │
└──────────────────┬──────────────────┘
                   │
     ┌─────────────┼─────────────┐─────────────┐─────────────┐
     │             │             │             │             │
     ▼             ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐
│ AGENDAR │  │CANCELAR │  │INFORMAÇÕES│  │RESULTADOS│  │URGÊNCIA │
│consulta │  │ou remar.│  │horários,  │  │de exames │  │emergên. │
└────┬────┘  └────┬────┘  │  planos   │  └────┬─────┘  └────┬────┘
     │             │       └─────┬─────┘       │             │
     ▼             ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐
│ Coleta  │  │Confirma │  │ Responde  │  │ Orienta  │  │Encamin. │
│nome,    │  │e notif. │  │com dados  │  │acesso ao │  │SAMU/UPA │
│data,esp.│  │ equipe  │  │da clínica │  │portal    │  │         │
└────┬────┘  └────┬────┘  └─────┬─────┘  └────┬─────┘  └────┬────┘
     │             │             │             │             │
     └─────────────┴─────────────┴─────────────┘             │
                                 │                            │
                                 ▼                            │
              ┌─────────────────────────────────┐            │
              │   RESPOSTA ENVIADA AO PACIENTE  │◄───────────┘
              └─────────────────────────────────┘

