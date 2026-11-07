// ============================================================
// 🏥 AGENTE DE IA PARA WHATSAPP — ASSISTENTE DE CLÍNICA MÉDICA
// ============================================================
// Autor: Agente IA
// Descrição: Bot para WhatsApp que atua como recepcionista
//            virtual de uma clínica médica, usando IA via Groq (Llama 3).
//
// Como usar:
//   1. npm install
//   2. Substitua SUA_GROQ_API_KEY_AQUI pela sua chave da Groq
//   3. node whatsapp_agent.js
//   4. Escaneie o QR code no terminal com o WhatsApp
// ============================================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// ============================================================
// ⚙️ CONFIGURAÇÕES
// ============================================================

// 🔑 Chave de API da Groq (pegue em https://console.groq.com)
// Configure a variável de ambiente GROQ_API_KEY antes de rodar o agente.
// Exemplo: GROQ_API_KEY="gsk_..." node whatsapp_agent.js
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY não configurada.');
    console.error('   Defina a variável de ambiente antes de iniciar:');
    console.error('   GROQ_API_KEY="gsk_sua_chave" node whatsapp_agent.js');
    process.exit(1);
}

// 🤖 Modelo de IA a ser usado (Llama 3 via Groq — gratuito)
const MODELO_IA = 'llama-3.3-70b-versatile';

// 📝 Número máximo de mensagens no histórico por usuário
const MAX_HISTORICO = 20;

// 🌐 URLs da API da Groq
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// ============================================================
// 🏥 PROMPT DO SISTEMA — Persona do agente
// ============================================================

const SYSTEM_PROMPT = `Você é a **Ana**, assistente virtual da **Clínica Saúde & Vida**.
Você é simpática, profissional e eficiente. Seu papel é ajudar os pacientes pelo WhatsApp.

🎯 **Suas responsabilidades:**

1. **Agendar consultas** — Colete: nome completo, data/horário desejado e especialidade médica.
2. **Cancelar ou remarcar consultas** — Peça confirmação antes de cancelar. Notifique a equipe.
3. **Informar sobre a clínica** — Horários de funcionamento, especialidades disponíveis, planos de saúde aceitos.
4. **Resultados de exames** — Oriente o paciente a acessar o portal online ou retirar na recepção.
5. **Urgências e emergências** — Se o paciente relatar sintomas graves, encaminhe IMEDIATAMENTE para:
   - 🚑 SAMU: 192
   - 🏥 UPA mais próxima
   - NÃO tente diagnosticar ou tratar. Apenas encaminhe.

📋 **Informações da Clínica Saúde & Vida:**
- Horário: Segunda a Sexta, 7h às 19h | Sábado, 8h às 12h
- Especialidades: Clínica Geral, Pediatria, Cardiologia, Ortopedia, Dermatologia, Ginecologia
- Planos aceitos: Unimed, Amil, SulAmérica, Bradesco Saúde, Hapvida
- Endereço: Rua Exemplo, 123 — Centro
- Telefone: (11) 1234-5678

⚠️ **Regras importantes:**
- NUNCA forneça diagnósticos médicos.
- NUNCA receite medicamentos.
- Seja sempre educada e empática.
- Use emojis com moderação para tornar a conversa agradável.
- Responda de forma concisa e objetiva.
- Se não souber algo, diga que vai verificar com a equipe.
- Sempre responda em português brasileiro.`;

// ============================================================
// 💾 ARMAZENAMENTO DE HISTÓRICO
// ============================================================

// Map para guardar o histórico de conversa de cada usuário
// Chave: ID do usuário | Valor: Array de mensagens {role, content}
const historicoUsuarios = new Map();

// Variável para registrar o momento de início do agente
const inicioAgente = Date.now();

// Contador de mensagens processadas
let mensagensProcessadas = 0;

// ============================================================
// 📱 INICIALIZAÇÃO DO CLIENTE WHATSAPP
// ============================================================

console.log('🏥 Iniciando Agente da Clínica Saúde & Vida...\n');

// Cria o cliente do WhatsApp com autenticação local
// (salva a sessão para não precisar escanear o QR toda vez)
const cliente = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        // Opcional: defina CHROME_PATH se o Chrome/Chromium não for encontrado
        // automaticamente pelo Puppeteer.
        ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
        ]
    }
});

// ============================================================
// 📷 EVENTO: QR CODE
// ============================================================

// Quando o QR code for gerado, exibe no terminal para o usuário escanear
cliente.on('qr', (qr) => {
    console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📲 Abra o WhatsApp > Menu > Aparelhos conectados > Conectar aparelho\n');
});

// ============================================================
// ✅ EVENTO: CLIENTE PRONTO
// ============================================================

cliente.on('ready', () => {
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Agente da Clínica Saúde & Vida está ONLINE!');
    console.log('═══════════════════════════════════════════════');
    console.log(`🤖 Modelo: ${MODELO_IA}`);
    console.log(`📅 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
    console.log('💬 Aguardando mensagens dos pacientes...\n');
});

// ============================================================
// 🔐 EVENTO: AUTENTICADO
// ============================================================

cliente.on('authenticated', () => {
    console.log('🔐 Autenticação realizada com sucesso!\n');
});

// ============================================================
// ⚠️ EVENTO: FALHA NA AUTENTICAÇÃO
// ============================================================

cliente.on('auth_failure', (erro) => {
    console.error('❌ Falha na autenticação:', erro);
    console.log('💡 Tente deletar a pasta .wwebjs_auth e escanear o QR novamente.\n');
});

// ============================================================
// 🔌 EVENTO: DESCONECTADO
// ============================================================

cliente.on('disconnected', (motivo) => {
    console.log('🔌 Desconectado:', motivo);
    console.log('🔄 Tentando reconectar...\n');
    cliente.initialize();
});

// ============================================================
// 💬 EVENTO: MENSAGEM RECEBIDA — Lógica principal
// ============================================================

cliente.on('message', async (mensagem) => {
    try {
        // 🚫 Ignora mensagens de grupos — responde apenas em conversas privadas
        const chat = await mensagem.getChat();
        if (chat.isGroup) {
            return; // Não responde em grupos
        }

        // 🚫 Ignora mensagens de status (status@broadcast)
        const idUsuario = mensagem.from;
        if (idUsuario === 'status@broadcast') {
            return;
        }

        // ============================================================
        // 🎤 PROCESSAMENTO DE ÁUDIOS
        // ============================================================

        // Verifica se a mensagem é um áudio ou mensagem de voz (ptt)
        const tipoMensagem = mensagem.type;
        let textoRecebido = mensagem.body.trim();

        if (tipoMensagem === 'ptt' || tipoMensagem === 'audio') {
            console.log(`🎤 Áudio recebido de ${idUsuario}, transcrevendo...`);

            // Mostra indicador de "digitando..." enquanto transcreve
            await chat.sendStateTyping();

            // Baixa o áudio da mensagem
            const media = await mensagem.downloadMedia();
            if (!media) {
                await mensagem.reply('⚠️ Não consegui baixar o áudio. Pode enviar novamente?');
                return;
            }

            // Transcreve o áudio usando Groq Whisper
            const transcricao = await transcreverAudio(media);
            if (!transcricao) {
                await mensagem.reply(
                    '⚠️ Não consegui entender o áudio. Pode tentar enviar novamente ou digitar sua mensagem?'
                );
                return;
            }

            console.log(`📝 Transcrição: "${transcricao}"`);
            textoRecebido = transcricao;
        }

        // Ignora mensagens vazias ou de mídia sem texto
        if (!textoRecebido) {
            return;
        }

        console.log(`📩 Mensagem de ${idUsuario}: ${textoRecebido}`);

        // ============================================================
        // 🎮 COMANDOS ESPECIAIS
        // ============================================================

        // Comando /reset — Limpa o histórico de conversa do usuário
        if (textoRecebido.toLowerCase() === '/reset') {
            historicoUsuarios.delete(idUsuario);
            await mensagem.reply(
                '🔄 *Histórico limpo!*\n\n' +
                'Sua conversa foi reiniciada. Como posso ajudar? 😊'
            );
            console.log(`🔄 Histórico resetado para ${idUsuario}`);
            return;
        }

        // Comando /ajuda — Mostra os comandos e funcionalidades disponíveis
        if (textoRecebido.toLowerCase() === '/ajuda') {
            await mensagem.reply(
                '🏥 *Clínica Saúde & Vida — Assistente Virtual*\n\n' +
                '📋 *O que posso fazer por você:*\n\n' +
                '📅 Agendar consultas\n' +
                '🔄 Cancelar ou remarcar consultas\n' +
                'ℹ️ Informar horários e especialidades\n' +
                '📄 Orientar sobre resultados de exames\n' +
                '🚑 Encaminhar para urgências/emergências\n\n' +
                '⌨️ *Comandos disponíveis:*\n\n' +
                '`/ajuda` — Mostra esta mensagem\n' +
                '`/reset` — Limpa o histórico da conversa\n' +
                '`/status` — Mostra informações do agente\n\n' +
                '💬 Ou simplesmente me envie uma mensagem e eu te ajudo! 😊'
            );
            console.log(`ℹ️ Comando /ajuda executado para ${idUsuario}`);
            return;
        }

        // Comando /status — Mostra informações sobre o agente
        if (textoRecebido.toLowerCase() === '/status') {
            const tempoAtivo = calcularTempoAtivo();
            const conversasAtivas = historicoUsuarios.size;

            await mensagem.reply(
                '📊 *Status do Agente*\n\n' +
                `🤖 Modelo: ${MODELO_IA}\n` +
                `⏱️ Tempo ativo: ${tempoAtivo}\n` +
                `💬 Conversas ativas: ${conversasAtivas}\n` +
                `📨 Mensagens processadas: ${mensagensProcessadas}\n` +
                `🟢 Status: Online e funcionando!`
            );
            console.log(`📊 Comando /status executado para ${idUsuario}`);
            return;
        }

        // ============================================================
        // 🤖 PROCESSAMENTO COM IA (Groq / Llama 3)
        // ============================================================

        // Mostra indicador de "digitando..." no WhatsApp
        await chat.sendStateTyping();

        // Obtém ou cria o histórico do usuário
        if (!historicoUsuarios.has(idUsuario)) {
            historicoUsuarios.set(idUsuario, []);
        }
        const historico = historicoUsuarios.get(idUsuario);

        // Adiciona a mensagem do usuário ao histórico
        historico.push({
            role: 'user',
            content: textoRecebido
        });

        // Limita o histórico para não exceder o máximo configurado
        if (historico.length > MAX_HISTORICO) {
            // Remove as mensagens mais antigas (mantém as mais recentes)
            historico.splice(0, historico.length - MAX_HISTORICO);
        }

        // Chama a API do OpenRouter para gerar a resposta
        const respostaIA = await chamarOpenRouterAPI(historico);

        // Adiciona a resposta da IA ao histórico
        historico.push({
            role: 'assistant',
            content: respostaIA
        });

        // Envia a resposta ao paciente
        await mensagem.reply(respostaIA);

        // Incrementa o contador de mensagens processadas
        mensagensProcessadas++;

        console.log(`✅ Resposta enviada para ${idUsuario}`);

    } catch (erro) {
        console.error('❌ Erro ao processar mensagem:', erro.message);

        // Tenta enviar mensagem de erro amigável ao paciente
        try {
            await mensagem.reply(
                '😔 Desculpe, tive um problema técnico ao processar sua mensagem.\n\n' +
                'Por favor, tente novamente em alguns instantes. ' +
                'Se o problema persistir, entre em contato pelo telefone: *(11) 1234-5678*'
            );
        } catch (erroResposta) {
            console.error('❌ Erro ao enviar mensagem de erro:', erroResposta.message);
        }
    }
});

// ============================================================
// 🎤 FUNÇÃO: Transcrever áudio com Groq Whisper
// ============================================================

/**
 * Transcreve um áudio usando a API Whisper da Groq (gratuita).
 * @param {MessageMedia} media - Mídia do áudio baixado do WhatsApp
 * @returns {string|null} - Texto transcrito ou null em caso de erro
 */
async function transcreverAudio(media) {
    try {
        // Salva o áudio temporariamente em disco
        const nomeArquivo = `audio_${Date.now()}.ogg`;
        const caminhoTemp = path.join('/tmp', nomeArquivo);
        const bufferAudio = Buffer.from(media.data, 'base64');
        fs.writeFileSync(caminhoTemp, bufferAudio);

        // Prepara o FormData para enviar à API
        const formData = new FormData();
        formData.append('file', fs.createReadStream(caminhoTemp), {
            filename: nomeArquivo,
            contentType: media.mimetype || 'audio/ogg'
        });
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'pt');          // Português
        formData.append('response_format', 'json');

        // Envia para a API Whisper da Groq
        const resposta = await axios.post(GROQ_WHISPER_URL, formData, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        // Remove o arquivo temporário
        fs.unlinkSync(caminhoTemp);

        // Retorna o texto transcrito
        const texto = resposta.data.text?.trim();
        return texto || null;

    } catch (erro) {
        console.error('❌ Erro ao transcrever áudio:', erro.response?.data || erro.message);

        // Tenta limpar o arquivo temporário em caso de erro
        try {
            const caminhoTemp = path.join('/tmp', `audio_${Date.now()}.ogg`);
            if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
        } catch (_) { }

        return null;
    }
}

// ============================================================
// 🌐 FUNÇÃO: Chamar API da Groq
// ============================================================

/**
 * Envia o histórico de conversa para a API da Groq e retorna a resposta da IA.
 * @param {Array} historico - Array de mensagens {role, content}
 * @returns {string} - Texto da resposta gerada pela IA
 */
async function chamarOpenRouterAPI(historico) {
    try {
        // Monta as mensagens com o system prompt + histórico do usuário
        const mensagens = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historico
        ];

        // Faz a requisição para a API da Groq
        const resposta = await axios.post(
            GROQ_CHAT_URL,
            {
                model: MODELO_IA,
                messages: mensagens,
                temperature: 0.7,       // Criatividade moderada
                max_tokens: 1024,       // Limite de tokens na resposta
                top_p: 0.9,             // Nucleus sampling
                stream: false           // Resposta completa (sem streaming)
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // Timeout de 30 segundos
            }
        );

        // Extrai e retorna o texto da resposta
        const textoResposta = resposta.data.choices[0].message.content;
        return textoResposta;

    } catch (erro) {
        // Trata erros específicos da API
        if (erro.response) {
            const status = erro.response.status;

            if (status === 401) {
                console.error('❌ Erro de autenticação: Verifique sua GROQ_API_KEY');
                return '⚠️ Estou com um problema de configuração. Por favor, entre em contato pelo telefone (11) 1234-5678.';
            }

            if (status === 429) {
                console.error('⚠️ Limite de requisições atingido na API da Groq');
                return '⏳ Estou recebendo muitas mensagens no momento. Por favor, aguarde um minutinho e tente novamente!';
            }

            if (status === 503) {
                console.error('⚠️ API da Groq temporariamente indisponível');
                return '🔧 Estou em manutenção no momento. Por favor, tente novamente em alguns minutos.';
            }

            console.error(`❌ Erro da API (${status}):`, erro.response.data);
        } else if (erro.code === 'ECONNABORTED') {
            console.error('⏱️ Timeout na requisição para a API');
            return '⏱️ Demorei muito para pensar na resposta. Pode tentar de novo?';
        } else {
            console.error('❌ Erro de conexão:', erro.message);
        }

        return '😔 Desculpe, não consegui processar sua mensagem agora. Tente novamente em instantes!';
    }
}

// ============================================================
// ⏱️ FUNÇÃO: Calcular tempo ativo do agente
// ============================================================

/**
 * Calcula quanto tempo o agente está rodando de forma legível.
 * @returns {string} - Tempo formatado (ex: "2h 15min 30s")
 */
function calcularTempoAtivo() {
    const agora = Date.now();
    const diferenca = agora - inicioAgente;

    const segundos = Math.floor((diferenca / 1000) % 60);
    const minutos = Math.floor((diferenca / (1000 * 60)) % 60);
    const horas = Math.floor((diferenca / (1000 * 60 * 60)) % 24);
    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));

    const partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0) partes.push(`${minutos}min`);
    partes.push(`${segundos}s`);

    return partes.join(' ');
}

// ============================================================
// 🚀 INICIAR O CLIENTE WHATSAPP
// ============================================================

// Inicializa a conexão com o WhatsApp
cliente.initialize().catch((erro) => {
    console.error('❌ Erro fatal ao inicializar o agente:', erro.message);
    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Verifique se o Google Chrome/Chromium está instalado');
    console.log('   2. Delete a pasta .wwebjs_auth e tente novamente');
    console.log('   3. Verifique sua conexão com a internet');
    process.exit(1);
});

// ============================================================
// 🛡️ TRATAMENTO DE ERROS GLOBAIS
// ============================================================

// Captura erros não tratados para evitar que o agente pare
process.on('unhandledRejection', (erro) => {
    console.error('⚠️ Erro não tratado (Promise):', erro.message || erro);
});

process.on('uncaughtException', (erro) => {
    console.error('⚠️ Erro não tratado (Exception):', erro.message);
});

// Encerramento gracioso (Ctrl+C)
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Encerrando o agente...');
    try {
        await cliente.destroy();
        console.log('👋 Agente encerrado com sucesso. Até a próxima!');
    } catch (erro) {
        console.error('Erro ao encerrar:', erro.message);
    }
    process.exit(0);
});
