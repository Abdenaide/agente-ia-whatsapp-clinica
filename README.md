# 🏥 Agente de IA para WhatsApp — Clínica Saúde & Vida

Bot de atendimento para WhatsApp que funciona como **recepcionista virtual** de uma clínica médica. Ele conversa com os pacientes usando IA (Llama 3 via Groq), entende mensagens de texto e áudio, mantém o contexto da conversa e encaminha casos de urgência para os canais corretos.

> ⚠️ Projeto **educacional/demonstrativo**. A clínica, endereço, telefone e planos citados são fictícios. O agente **não** faz diagnósticos, não receita medicamentos e não substitui atendimento médico profissional.

## O que o projeto faz

- Recebe mensagens do WhatsApp automaticamente via QR Code (sem Twilio, ngrok ou custo de API de WhatsApp).
- Responde com IA generativa usando o modelo `llama-3.3-70b-versatile` da [Groq](https://console.groq.com).
- Transcreve **mensagens de voz** com o Whisper (`whisper-large-v3`, também pela Groq).
- Mantém histórico por paciente (até 20 mensagens) para respostas com contexto.
- Responde **apenas conversas privadas** — ignora grupos e status.
- Mostra o indicador "digitando…" enquanto processa a resposta.
- Possui comandos especiais: `/ajuda`, `/reset` e `/status`.
- Reconecta automaticamente caso a sessão caia e encerra de forma segura com `Ctrl+C`.
- Trata erros da API (chave inválida, limite de requisições, timeout etc.) com mensagens amigáveis ao paciente.

## Funcionalidades do assistente

| Área | O que o agente faz |
|------|--------------------|
| Agendamento | Coleta nome, data/horário e especialidade |
| Cancelamento/remarcação | Confirma antes de cancelar e orienta o paciente |
| Informações | Horários, especialidades, planos aceitos e endereço |
| Resultados de exames | Orienta o acesso ao portal ou à recepção |
| Urgências | Encaminha imediatamente para SAMU (192) / UPA, sem diagnosticar |

## Tecnologias

- **Node.js**
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) (WhatsApp Web + Puppeteer)
- [Groq API](https://console.groq.com) — Llama 3.3 70B e Whisper
- `axios`, `qrcode-terminal`, `form-data`

## Pré-requisitos

- Node.js 18+
- Google Chrome ou Chromium instalado
- Uma chave de API gratuita da Groq

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Defina sua chave da Groq
export GROQ_API_KEY="gsk_sua_chave_aqui"      # Linux/macOS
# set GROQ_API_KEY=gsk_sua_chave_aqui          # Windows (CMD)
# $env:GROQ_API_KEY="gsk_sua_chave_aqui"       # Windows (PowerShell)

# 3. Inicie o agente
npm start
```

Escaneie o QR Code exibido no terminal:

> WhatsApp → Menu → **Aparelhos conectados** → **Conectar aparelho**

A sessão fica salva em `.wwebjs_auth/`, então nas próximas execuções não é necessário escanear o QR novamente.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GROQ_API_KEY` | ✅ | Chave da API da Groq |
| `CHROME_PATH` | ❌ | Caminho do Chrome/Chromium, se o Puppeteer não encontrar sozinho |

Copie `.env.example` para `.env` como referência (o projeto não carrega `.env` automaticamente; exporte as variáveis no shell ou use uma ferramenta como `dotenv`).

## Comandos no WhatsApp

| Comando | Ação |
|---------|------|
| `/ajuda` | Lista o que o assistente pode fazer |
| `/reset` | Limpa o histórico da conversa do paciente |
| `/status` | Mostra modelo, tempo ativo, conversas e mensagens processadas |

## Estrutura

```
whatsapp_agent.js     # todo o agente (conexão, IA, comandos e tratamento de erros)
package.json          # dependências e script de start
.env.example          # exemplo de variáveis de ambiente
INSTRUCOES.MD         # requisitos originais do projeto
```

## Personalização

- **Persona e informações da clínica:** edite o `SYSTEM_PROMPT` em `whatsapp_agent.js`.
- **Modelo de IA:** altere a constante `MODELO_IA`.
- **Tamanho do histórico:** ajuste `MAX_HISTORICO`.
- **Comandos:** adicione novos blocos no evento `message`.

## Segurança e privacidade

- **Nunca** faça commit da sua `GROQ_API_KEY`. Use variáveis de ambiente.
- As pastas `.wwebjs_auth/` e `.wwebjs_cache/` contêm dados de sessão e já estão no `.gitignore`.
- Mensagens de pacientes são enviadas à API da Groq para gerar respostas. Em uso real, avalie requisitos de **LGPD**, consentimento e políticas de retenção de dados.
- Este projeto usa a API não oficial do WhatsApp Web; para produção, considere a API oficial do WhatsApp Business.

## Aviso médico

Este agente não fornece diagnóstico, prescrição ou orientação clínica. Em emergências, procure imediatamente o **SAMU (192)** ou a UPA mais próxima.
