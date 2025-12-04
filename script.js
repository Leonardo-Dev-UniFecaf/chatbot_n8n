// --- COLOQUE O URL DO SEU WEBHOOK DO N8N AQUI ---
const N8N_WEBHOOK_URL = "https://n8n.srv890310.hstgr.cloud/webhook/webhookChatLeo";

// --- URLs dos Avatares ---
const AVATAR_BOT_URL = "src/image 28.png"; 
const AVATAR_USER_URL = "https://www.pngplay.com/wp-content/uploads/12/User-Avatar-Profile-PNG-Pic-Clip-Art-Background.png"; 

// ----------------------------------------------------

// Elementos do DOM
const chatWindow = document.getElementById('chat-window-fullscreen'); 
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Envio de mensagem
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = chatInput.value.trim();

    if (messageText === '') return;

    // 1. Mostrar a mensagem do usuário na tela
    addMessageToUI('user', messageText);
    chatInput.value = '';

    // 2. Mostrar "Digitando..."
    addTypingIndicator();

    try {
        // 3. Enviar a mensagem para o n8n
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: messageText 
            }),
        });

        if (!response.ok) {
            throw new Error('Erro na resposta do n8n.');
        }

        const data = await response.json();
        
        // 4. Remover "Digitando..."
        removeTypingIndicator();

        // 5. Processar a resposta do bot com extração/normalização robusta
        function normalizeReply(value) {
            if (value === null || value === undefined) return null;

            if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    return value.map(v => normalizeReply(v)).filter(Boolean).join('\n\n');
                }
                if ('response' in value) return normalizeReply(value.response);
                if ('text' in value) return normalizeReply(value.text);
                if ('message' in value) return normalizeReply(value.message);
                if ('choices' in value && Array.isArray(value.choices)) {
                    const texts = value.choices.map(c => normalizeReply(c.text || c.message || c.content || c));
                    return texts.filter(Boolean).join('\n\n');
                }
                // tenta encontrar a primeira propriedade string
                for (const k in value) {
                    if (typeof value[k] === 'string' && value[k].trim() !== '') return normalizeReply(value[k]);
                    if (typeof value[k] === 'object') {
                        const nested = normalizeReply(value[k]);
                        if (nested) return nested;
                    }
                }
                try { return JSON.stringify(value, null, 2); } catch (e) { return String(value); }
            }

            if (typeof value === 'string') {
                const s = value.trim();
                // tenta desserializar strings que contenham JSON
                if (s.startsWith('{') || s.startsWith('[') || s.startsWith('"')) {
                    try {
                        const parsed = JSON.parse(s);
                        return normalizeReply(parsed);
                    } catch (e) {
                        // não era JSON válido, segue com o texto original
                    }
                }
                return value;
            }

            return String(value);
        }

        // pega possíveis campos onde o n8n pode retornar o conteúdo
        const rawReply = data?.reply ?? data?.output ?? data?.result ?? data?.message ?? data;
        const botReply = normalizeReply(rawReply) || "Desculpe, não consegui processar a resposta.";

        // 6. Mostrar a resposta final na tela
        addMessageToUI('bot', botReply, true); // true = formatar com markdown

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        removeTypingIndicator();
        addMessageToUI('bot', 'Desculpe, algo deu errado. Tente novamente.');
    }
});

// FUNÇÃO PARA ADICIONAR MENSAGEM NA TELA
function addMessageToUI(sender, text, isMarkdown = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    // Adiciona o avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    const avatarImg = document.createElement('img');
    avatarImg.src = sender === 'bot' ? AVATAR_BOT_URL : AVATAR_USER_URL;
    avatarImg.alt = sender === 'bot' ? 'Bot Avatar' : 'User Avatar';
    avatarDiv.appendChild(avatarImg);
    messageDiv.appendChild(avatarDiv);

    // Adiciona a bolha de texto
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    
    // Verifica se o texto é um objeto (caso o JSON parse tenha sobrado) e converte para string se necessário
    if (typeof text === 'object') {
        text = JSON.stringify(text, null, 2);
    }

    if (isMarkdown && typeof marked !== 'undefined') {
        bubbleDiv.innerHTML = marked.parse(text);
    } else {
        bubbleDiv.textContent = text;
    }
    
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    
    // Rolar para o final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Funções para "Digitando..."
function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot', 'typing');
    
    // Adiciona o avatar do bot ao indicador de digitação
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    const avatarImg = document.createElement('img');
    avatarImg.src = AVATAR_BOT_URL;
    avatarImg.alt = 'Bot Avatar';
    avatarDiv.appendChild(avatarImg);
    messageDiv.appendChild(avatarDiv);

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.textContent = "Digitando..."; 
    
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.message.typing');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}