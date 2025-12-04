// ================= CONFIGURAÇÕES =================
const N8N_WEBHOOK_URL = "https://n8n.srv890310.hstgr.cloud/webhook/webhookChatLeo";

// --- URLs DOS GIFs DO FEROZ ---
const FEROZ_IDLE = "src/ezgif-84361006d5034cf5.webp";
const FEROZ_THINKING = "src/ezgif-4bdc631b6d598fd4.webp";
const FEROZ_TALKING = "src/speaking.webp";

// Tempo de fala padrão (fallback)
const DEFAULT_TALKING_DURATION = 3000;

// ================= ELEMENTOS DOM =================
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const ferozCharacter = document.getElementById('feroz-character');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('.material-icons');

// ================= SISTEMA DE AVATAR 2D =================
let avatarTimeout;

// ATUALIZADO: Agora aceita uma duração personalizada
function setAvatarState(state, duration = DEFAULT_TALKING_DURATION) {
    clearTimeout(avatarTimeout);

    switch(state) {
        case 'thinking':
            ferozCharacter.src = FEROZ_THINKING;
            break;
        case 'talking':
            ferozCharacter.src = FEROZ_TALKING;
            // Usa a duração passada como parâmetro
            avatarTimeout = setTimeout(() => {
                setAvatarState('idle');
            }, duration);
            break;
        case 'idle':
        default:
            ferozCharacter.src = FEROZ_IDLE;
            break;
    }
}

// ================= SISTEMA DE DARK MODE =================
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.textContent = 'light_mode';
    } else {
        themeIcon.textContent = 'dark_mode';
    }
});


// ================= LÓGICA DO CHAT =================
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    addMessageToUI('user', messageText);
    chatInput.value = '';

    setAvatarState('thinking');
    addTypingIndicator();

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: messageText }),
        });

        if (!response.ok) throw new Error('Erro na resposta do n8n.');

        const data = await response.json();
        removeTypingIndicator();

        // === PROCESSAMENTO ROBUSTO DA RESPOSTA ===
        let rawContent = data.reply || data.output || data.text || "";

        if (typeof rawContent === 'string') {
            let cleanString = rawContent.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
            if ((cleanString.startsWith('{') && cleanString.endsWith('}')) || 
                (cleanString.startsWith('[') && cleanString.endsWith(']'))) {
                try { rawContent = JSON.parse(cleanString); } catch (e) { console.warn("Parse JSON falhou"); }
            }
        }
        if (Array.isArray(rawContent) && rawContent.length > 0) rawContent = rawContent[0];
        if (typeof rawContent === 'object' && rawContent !== null) {
            rawContent = rawContent.response || rawContent.text || rawContent.reply || JSON.stringify(rawContent);
        }
        // ===========================================

        // --- CÁLCULO DA DURAÇÃO DA FALA (NOVO) ---
        // Estima 60ms por caractere do texto final limpo
        let textLength = typeof rawContent === 'string' ? rawContent.length : 100;
        let calculatedDuration = textLength * 60;

        // Define limites: Mínimo 2 segundos, Máximo 15 segundos
        // Isso evita que ele fale pouco em "Oi" ou eternamente em textos longos
        calculatedDuration = Math.max(2000, Math.min(calculatedDuration, 15000));
        
        console.log(`Texto tamanho: ${textLength} chars. Duração calculada: ${calculatedDuration}ms`);

        // Passa a duração calculada para a função do avatar
        setAvatarState('talking', calculatedDuration);
        addMessageToUI('bot', rawContent, true);

    } catch (error) {
        console.error('Erro:', error);
        removeTypingIndicator();
        setAvatarState('idle');
        addMessageToUI('bot', 'Desculpe, tive um problema técnico. Tente novamente.');
    }
});


// Funções Utilitárias de UI
function addMessageToUI(sender, text, isMarkdown = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    
    if (isMarkdown && typeof text === 'string' && text.trim().startsWith('{')) {
        try { text = JSON.parse(text).response || text; } catch(e) {}
    }

    if (isMarkdown && typeof marked !== 'undefined') {
        bubbleDiv.innerHTML = marked.parse(text);
    } else {
        bubbleDiv.textContent = text;
    }
    
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot', 'typing');
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.innerHTML = '<span class="typing-dots">...</span>'; 
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.message.typing');
    if (typingIndicator) typingIndicator.remove();
}

setAvatarState('idle');