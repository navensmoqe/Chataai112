// ============================================
//  Suna Ai — Premium Chat Interface v2.0
// ============================================

'use strict';

// ----------------------------
//  State & Config
// ----------------------------

let currentMode = 'chat';
let attachedFile = null;
let isTyping = false;
let isListening = false;
let recognition = null;
let lastAssistantMsgId = null;
let lastUserPrompt = '';
let searchActive = false;

const SYSTEM_INSTRUCTION = {
    role: "system",
    content: "أنت مساعد ذكي وودود اسمك Suna Ai. أنت شامل، واثق، وقادر على قراءة وتحليل الصور والملفات المرفقة وتذكر المحادثات دائماً. تجيب دائماً بشكل منظم وواضح. عند الإجابة بنقاط، استخدم التنسيق المناسب. أنت تفهم العربية والإنجليزية وتجيب بنفس لغة المستخدم."
};

const SUGGESTIONS = [
    "✍️ اكتب لي قصيدة عربية جميلة",
    "🧮 حل لي مسألة رياضية",
    "💡 اشرح لي كيف يعمل الذكاء الاصطناعي",
    "🌍 ما هي عواصم الدول العربية؟",
    "💻 اكتب كود بايثون بسيط",
    "🎯 ساعدني في كتابة سيرة ذاتية احترافية"
];

const MODEL_LABELS = {
    // GPT-5.6
    'gpt-5.6-sol': 'GPT-5.6 Sol',
    'gpt-5.6-sol-pro': 'GPT-5.6 Sol Pro',
    'gpt-5.6-terra': 'GPT-5.6 Terra',
    'gpt-5.6-terra-pro': 'GPT-5.6 Terra Pro',
    'gpt-5.6-luna': 'GPT-5.6 Luna',
    'gpt-5.6-luna-pro': 'GPT-5.6 Luna Pro',
    // GPT-5.5
    'gpt-5.5': 'GPT-5.5',
    'gpt-5.5-pro': 'GPT-5.5 Pro',
    // GPT-5.4
    'gpt-5.4-nano': 'GPT-5.4 Nano',
    'gpt-5.4-mini': 'GPT-5.4 Mini',
    'gpt-5.4': 'GPT-5.4',
    'gpt-5.4-pro': 'GPT-5.4 Pro',
    // GPT-5.x Other
    'gpt-5.3-chat': 'GPT-5.3 Chat',
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.2-chat': 'GPT-5.2 Chat',
    'gpt-5.2-pro': 'GPT-5.2 Pro',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5.1-chat-latest': 'GPT-5.1 Chat Latest',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    'gpt-5-chat-latest': 'GPT-5 Chat Latest',
    // Codex
    'gpt-5.3-codex': 'GPT-5.3 Codex',
    'gpt-5.2-codex': 'GPT-5.2 Codex',
    'gpt-5.1-codex': 'GPT-5.1 Codex',
    'gpt-5.1-codex-mini': 'GPT-5.1 Codex Mini',
    'gpt-5.1-codex-max': 'GPT-5.1 Codex Max',
    'gpt-5-codex': 'GPT-5 Codex',
    // GPT-4.x
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'gpt-4.1-nano': 'GPT-4.1 Nano',
    'gpt-4.5-preview': 'GPT-4.5 Preview',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    // OpenAI Reasoning
    'o1': 'o1',
    'o1-mini': 'o1 Mini',
    'o1-pro': 'o1 Pro',
    'o3': 'o3',
    'o3-mini': 'o3 Mini',
    'o4-mini': 'o4 Mini',
    // Claude
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'claude-opus-4-5': 'Claude Opus 4.5',
    // Gemini
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
};

// Multiple chat sessions
let allSessions = JSON.parse(localStorage.getItem('suna_sessions') || '[]');
let currentSessionId = null;
let chatHistory = [];

// ----------------------------
//  Initialization
// ----------------------------

window.onload = function() {
    // Apply saved theme
    const savedTheme = localStorage.getItem('suna_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            const icon = themeBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = 'dark_mode';
        }
        const themeText = document.getElementById('themeText');
        if (themeText) themeText.textContent = 'وضع الليل';
    }

    // Load or create session
    if (allSessions.length > 0) {
        loadSession(allSessions[allSessions.length - 1].id);
    } else {
        createNewSession();
    }

    setupTextareaListener();
    updateModelBadge();
    setupVoiceInput();
    setupKeyboardShortcuts();
    renderSessionsUI();
    setupWordCounter();
};

// ----------------------------
//  Sessions Management
// ----------------------------

function createNewSession() {
    const session = {
        id: 'session_' + Date.now(),
        title: 'محادثة جديدة',
        createdAt: Date.now(),
        history: [SYSTEM_INSTRUCTION]
    };
    allSessions.push(session);
    currentSessionId = session.id;
    chatHistory = session.history;
    saveSessions();
    renderSessionsUI();
    renderHistoryUI();
}

function loadSession(sessionId) {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;
    currentSessionId = sessionId;
    chatHistory = session.history;
    renderSessionsUI();
    renderHistoryUI();
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) toggleSidebar();
    }
}

function deleteSession(sessionId, e) {
    e.stopPropagation();
    allSessions = allSessions.filter(s => s.id !== sessionId);
    saveSessions();
    if (currentSessionId === sessionId) {
        if (allSessions.length > 0) {
            loadSession(allSessions[allSessions.length - 1].id);
        } else {
            createNewSession();
        }
    } else {
        renderSessionsUI();
    }
    showToast('تم حذف المحادثة 🗑️');
}

function saveSessions() {
    try {
        const session = allSessions.find(s => s.id === currentSessionId);
        if (session) session.history = chatHistory;
        localStorage.setItem('suna_sessions', JSON.stringify(allSessions));
    } catch (e) {
        // If storage full, trim old sessions
        allSessions = allSessions.slice(-5);
        localStorage.setItem('suna_sessions', JSON.stringify(allSessions));
    }
}

function updateSessionTitle(text) {
    const session = allSessions.find(s => s.id === currentSessionId);
    if (session && session.title === 'محادثة جديدة') {
        session.title = text.substring(0, 40) + (text.length > 40 ? '...' : '');
        saveSessions();
        renderSessionsUI();
    }
}

function renderSessionsUI() {
    const list = document.getElementById('chatHistoryList');
    list.innerHTML = '';

    if (allSessions.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:12px 10px;text-align:center;">لا توجد محادثات سابقة</div>';
        return;
    }

    [...allSessions].reverse().forEach(session => {
        const item = document.createElement('div');
        item.className = 'chat-history-item' + (session.id === currentSessionId ? ' active' : '');
        item.onclick = () => loadSession(session.id);
        item.innerHTML = `
            <span class="history-icon">💬</span>
            <span class="history-title">${escapeHtml(session.title)}</span>
            <button class="delete-session-btn" onclick="deleteSession('${session.id}', event)" title="حذف">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        list.appendChild(item);
    });
}

// ----------------------------
//  Theme
// ----------------------------

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('suna_theme', isLight ? 'light' : 'dark');
    const themeText = document.getElementById('themeText');
    if (themeText) themeText.textContent = isLight ? 'وضع الليل' : 'وضع النهار';
    // Update icon
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        const icon = themeBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = isLight ? 'dark_mode' : 'light_mode';
    }
}

// ----------------------------
//  Sidebar
// ----------------------------

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

// ----------------------------
//  Model
// ----------------------------

function updateModelBadge() {
    const modelVal = document.getElementById('modelSelect').value;
    const badge = document.getElementById('modelBadge');
    if (badge) badge.textContent = MODEL_LABELS[modelVal] || modelVal;
}

// ----------------------------
//  Textarea & Word Counter
// ----------------------------

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
}

function setupTextareaListener() {
    const textarea = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    textarea.addEventListener('input', () => {
        sendBtn.disabled = textarea.value.trim().length === 0 && !attachedFile;
        updateWordCounter(textarea.value);
    });
}

function setupWordCounter() {
    const counter = document.getElementById('wordCounter');
    if (counter) counter.textContent = '';
}

function updateWordCounter(text) {
    const counter = document.getElementById('wordCounter');
    if (!counter) return;
    if (!text.trim()) { counter.textContent = ''; return; }
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    counter.textContent = `${chars} حرف · ${words} كلمة`;
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!document.getElementById('sendBtn').disabled) processInput();
    }
}

// ----------------------------
//  Keyboard Shortcuts
// ----------------------------

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeLightbox();
            closeSearch();
        }
        // Ctrl+K => New Chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            startNewChat();
            showToast('محادثة جديدة ✨');
        }
        // Ctrl+E => Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportChat();
        }
        // Ctrl+F => Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            toggleSearch();
        }
    });
}

// ----------------------------
//  Mode
// ----------------------------

function setMode(mode) {
    currentMode = mode;
    const chatBtn = document.getElementById('modeChat');
    const imgBtn = document.getElementById('modeImage');
    const inputField = document.getElementById('userInput');
    const modelSelect = document.getElementById('modelSelect');

    if (mode === 'chat') {
        chatBtn.classList.add('active');
        imgBtn.classList.remove('active');
        inputField.placeholder = 'أرسل رسالة لـ Suna Ai...';
        modelSelect.style.display = '';
    } else {
        imgBtn.classList.add('active');
        chatBtn.classList.remove('active');
        inputField.placeholder = 'صف الصورة التي تريد رسمها بالتفصيل...';
        modelSelect.style.display = 'none';
    }
}

// ----------------------------
//  Chat Management
// ----------------------------

function startNewChat() {
    createNewSession();
    clearAttachedFile();
    if (window.innerWidth <= 768 && document.getElementById('sidebar').classList.contains('open')) {
        toggleSidebar();
    }
}

function clearMemory() {
    if (confirm('هل أنت متأكد من مسح جميع المحادثات والذاكرة بالكامل؟')) {
        allSessions = [];
        localStorage.removeItem('suna_sessions');
        createNewSession();
        showToast('تم مسح الذاكرة بنجاح 🗑️');
    }
}

function saveHistory() {
    saveSessions();
}

// ----------------------------
//  Render UI
// ----------------------------

function renderHistoryUI() {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    lastAssistantMsgId = null;

    const hasMessages = chatHistory.filter(m => m.role !== 'system').length > 0;

    if (!hasMessages) {
        renderWelcomeScreen();
    } else {
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                appendMessageUI(msg.role, msg.content, msg.imageUrl);
            }
        });
    }
}

function renderWelcomeScreen() {
    const chatBox = document.getElementById('chatBox');
    const div = document.createElement('div');
    div.className = 'welcome-screen';
    div.id = 'welcomeScreen';
    div.innerHTML = `
        <div class="welcome-orb">✦</div>
        <h1 class="welcome-title">مرحباً بك في Suna Ai</h1>
        <p class="welcome-subtitle">مساعدك الذكي القادر على الدردشة، تحليل الملفات، وتوليد الصور. كيف يمكنني مساعدتك اليوم؟</p>
        <div class="suggestion-chips">
            ${SUGGESTIONS.map(s => `<button class="chip" onclick="sendSuggestion('${s.replace(/'/g, "\\'")}')  ">${s}</button>`).join('')}
        </div>
    `;
    chatBox.appendChild(div);
}

function sendSuggestion(text) {
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    document.getElementById('userInput').value = cleanText || text;
    autoResize(document.getElementById('userInput'));
    document.getElementById('sendBtn').disabled = false;
    processInput();
}

// ----------------------------
//  File Handling
// ----------------------------

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const bar     = document.getElementById('filePreviewBar');
    const thumb   = document.getElementById('filePreviewThumb');
    const nameEl  = document.getElementById('filePreviewName');
    const sendBtn = document.getElementById('sendBtn');

    const ext     = file.name.split('.').pop().toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);
    const isPdf   = file.type === 'application/pdf' || ext === 'pdf';

    // ---- PDF ----
    if (isPdf) {
        nameEl.textContent = `📄 ${file.name} (جاري استخراج النص...)`;
        thumb.style.display = 'none';
        bar.style.display = 'flex';

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                // Set PDF.js worker
                if (window.pdfjsLib) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc =
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

                    let fullText = '';
                    const totalPages = pdf.numPages;

                    for (let i = 1; i <= totalPages; i++) {
                        const page    = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map(item => item.str).join(' ');
                        fullText += `\n--- صفحة ${i} من ${totalPages} ---\n${pageText}`;
                    }

                    if (!fullText.trim()) {
                        showToast('⚠️ الملف لا يحتوي على نص قابل للاستخراج');
                        nameEl.textContent = `📄 ${file.name} (صورة/ممسوح ضوئياً)`;
                    } else {
                        attachedFile = {
                            name: file.name,
                            type: 'application/pdf',
                            data: fullText,
                            isImage: false,
                            isPdf: true,
                            pages: totalPages
                        };
                        nameEl.textContent = `📄 ${file.name} · ${totalPages} صفحة`;
                        sendBtn.disabled = false;
                        showToast(`✅ تم استخراج ${totalPages} صفحة`);
                    }
                } else {
                    throw new Error('PDF.js غير محمّل');
                }
            } catch (err) {
                console.error('PDF error:', err);
                showToast('❌ تعذّر قراءة ملف PDF');
                nameEl.textContent = `📄 ${file.name} (خطأ في القراءة)`;
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // ---- Image: compress before sending ----
    const reader = new FileReader();
    reader.onload = function(e) {
        const rawDataUrl = e.target.result;

        if (isImage) {
            // Show preview immediately
            bar.style.display = 'flex';
            thumb.src = rawDataUrl;
            thumb.style.display = 'block';
            nameEl.textContent = `🖼️ ${file.name} (جاري الضغط...)`;

            // Compress image using Canvas (max 1024px, 85% quality)
            const img = new Image();
            img.onload = function() {
                const MAX = 1024;
                let { width, height } = img;

                // Scale down if larger than MAX
                if (width > MAX || height > MAX) {
                    if (width > height) {
                        height = Math.round((height * MAX) / width);
                        width = MAX;
                    } else {
                        width = Math.round((width * MAX) / height);
                        height = MAX;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width  = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressed = canvas.toDataURL('image/jpeg', 0.85);
                const sizeKB = Math.round((compressed.length * 3) / 4 / 1024);

                attachedFile = {
                    name: file.name,
                    type: 'image/jpeg',
                    data: compressed,
                    isImage: true
                };

                nameEl.textContent = `🖼️ ${file.name} · ${width}×${height}px · ~${sizeKB}KB`;
                sendBtn.disabled = false;
                showToast(`✅ الصورة جاهزة (${sizeKB}KB)`);
            };
            img.onerror = function() {
                // Fallback: use raw if compression fails
                attachedFile = { name: file.name, type: file.type, data: rawDataUrl, isImage: true };
                nameEl.textContent = file.name;
                sendBtn.disabled = false;
            };
            img.src = rawDataUrl;

        } else {
            attachedFile = { name: file.name, type: file.type, data: rawDataUrl, isImage: false };
            bar.style.display = 'flex';
            nameEl.textContent = file.name;
            thumb.style.display = 'none';
            sendBtn.disabled = false;
        }
    };

    if (isImage) reader.readAsDataURL(file);
    else reader.readAsText(file, 'UTF-8');
}

function clearAttachedFile() {
    attachedFile = null;
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    document.getElementById('filePreviewBar').style.display = 'none';
    const textarea = document.getElementById('userInput');
    document.getElementById('sendBtn').disabled = textarea.value.trim().length === 0;
}

// ----------------------------
//  Voice Input
// ----------------------------

function setupVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.style.display = 'none';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
        const transcript = Array.from(event.results)
            .map(r => r[0].transcript)
            .join('');
        const textarea = document.getElementById('userInput');
        textarea.value = transcript;
        autoResize(textarea);
        document.getElementById('sendBtn').disabled = transcript.trim().length === 0;
        updateWordCounter(transcript);
    };

    recognition.onend = function() {
        isListening = false;
        updateVoiceBtn(false);
    };

    recognition.onerror = function() {
        isListening = false;
        updateVoiceBtn(false);
        showToast('تعذر التعرف على الصوت');
    };
}

function toggleVoice() {
    if (!recognition) { showToast('المتصفح لا يدعم الإدخال الصوتي'); return; }

    if (isListening) {
        recognition.stop();
        isListening = false;
        updateVoiceBtn(false);
    } else {
        recognition.lang = document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-US';
        recognition.start();
        isListening = true;
        updateVoiceBtn(true);
        showToast('جاري الاستماع... 🎤');
    }
}

function updateVoiceBtn(listening) {
    const btn = document.getElementById('voiceBtn');
    if (!btn) return;
    btn.classList.toggle('listening', listening);
    btn.title = listening ? 'إيقاف الاستماع' : 'إدخال صوتي';
}

// ----------------------------
//  Search in Chat
// ----------------------------

function toggleSearch() {
    const bar = document.getElementById('searchBar');
    if (!bar) return;
    searchActive = !searchActive;
    bar.style.display = searchActive ? 'flex' : 'none';
    if (searchActive) {
        document.getElementById('searchInput').focus();
    } else {
        clearSearch();
    }
}

function closeSearch() {
    searchActive = false;
    const bar = document.getElementById('searchBar');
    if (bar) bar.style.display = 'none';
    clearSearch();
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    // Remove highlights
    document.querySelectorAll('.search-highlight').forEach(el => {
        el.outerHTML = el.textContent;
    });
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    // Clear previous highlights first
    document.querySelectorAll('.search-highlight').forEach(el => {
        el.outerHTML = el.textContent;
    });
    if (!query) return;

    let found = 0;
    document.querySelectorAll('.ai-text-content, .user-bubble').forEach(el => {
        const text = el.textContent;
        if (text.toLowerCase().includes(query)) {
            found++;
            el.innerHTML = el.innerHTML.replace(
                new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                '<mark class="search-highlight">$1</mark>'
            );
        }
    });

    if (found > 0) {
        const first = document.querySelector('.search-highlight');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast(`تم إيجاد ${found} نتيجة 🔍`);
    } else {
        showToast('لا توجد نتائج');
    }
}

// ----------------------------
//  Export Chat
// ----------------------------

function exportChat() {
    const messages = chatHistory.filter(m => m.role !== 'system');
    if (messages.length === 0) { showToast('لا توجد رسائل للتصدير'); return; }

    let text = `=== محادثة Suna Ai ===\n`;
    text += `التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n`;
    text += `===================\n\n`;

    messages.forEach(msg => {
        const sender = msg.role === 'user' ? '👤 أنت' : '🤖 Suna Ai';
        text += `${sender}:\n${msg.content}\n\n`;
        text += `─────────────────\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suna-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير المحادثة 📥');
}

// ----------------------------
//  Regenerate Last Response
// ----------------------------

async function regenerateLastResponse() {
    if (isTyping) return;
    if (!lastUserPrompt) { showToast('لا يوجد رد سابق لإعادة توليده'); return; }

    // Remove last assistant message from history
    const lastIdx = [...chatHistory].reverse().findIndex(m => m.role === 'assistant');
    if (lastIdx !== -1) {
        chatHistory.splice(chatHistory.length - 1 - lastIdx, 1);
    }

    // Remove last assistant message from UI
    if (lastAssistantMsgId) {
        const el = document.getElementById(lastAssistantMsgId);
        if (el) el.remove();
    }

    saveHistory();
    showToast('جاري إعادة التوليد... 🔄');
    await handleChat(lastUserPrompt, true);
}

// ----------------------------
//  Send & Process
// ----------------------------

async function processInput() {
    if (isTyping) return;
    const inputField = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    let text = inputField.value.trim();

    if (!text && !attachedFile) return;

    inputField.value = '';
    inputField.style.height = 'auto';
    sendBtn.disabled = true;
    updateWordCounter('');

    // Remove welcome screen on first message
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove();

    if (currentMode === 'chat') {
        await handleChat(text);
    } else {
        await handleImageGeneration(text);
    }
}

// ----------------------------
//  Chat Handler
// ----------------------------

async function handleChat(promptText, isRegenerate = false) {
    isTyping = true;
    let fullPrompt = promptText;
    let currentImageUrl = null;

    if (!isRegenerate) {
        lastUserPrompt = promptText;
    }

    // Handle text files & PDFs
    if (attachedFile && !attachedFile.isImage) {
        if (attachedFile.isPdf) {
            fullPrompt = `[📄 ملف PDF: "${attachedFile.name}" - ${attachedFile.pages} صفحة]\n\n${attachedFile.data}\n\n[طلب المستخدم]: ${promptText || 'يرجى تحليل وتلخيص هذا الملف بشكل شامل.'}`;
        } else {
            fullPrompt = `[محتوى الملف: ${attachedFile.name}]\n${attachedFile.data}\n\n[طلب المستخدم]: ${promptText || 'يرجى تحليل وتلخيص هذا الملف.'}`;
        }
    }

    // Handle images
    if (attachedFile && attachedFile.isImage) {
        currentImageUrl = attachedFile.data;
        if (!fullPrompt) fullPrompt = 'ماذا ترى في هذه الصورة؟';
    }

    if (!isRegenerate) {
        appendMessageUI('user', promptText || '📎 ملف مرفق', currentImageUrl);
        chatHistory.push({ role: 'user', content: fullPrompt, imageUrl: currentImageUrl });
        updateSessionTitle(promptText || 'ملف مرفق');
        saveHistory();
    }

    const selectedModel = document.getElementById('modelSelect').value;
    const loadingId = appendLoadingUI();
    clearAttachedFile();

    try {
        let response;
        // Strip imageUrl field — API only accepts role + content
        const apiHistory = chatHistory.map(({ role, content }) => ({ role, content }));

        if (currentImageUrl) {
            // Standard OpenAI vision format
            const imageMsg = {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: currentImageUrl } },
                    { type: 'text', text: fullPrompt || 'ماذا ترى في هذه الصورة؟' }
                ]
            };
            response = await puter.ai.chat([imageMsg], { model: selectedModel });
        } else {
            response = await puter.ai.chat(apiHistory, { model: selectedModel });
        }

        removeMessageUI(loadingId);

        let replyText = '';
        if (typeof response === 'string') {
            replyText = response;
        } else if (response?.message?.content) {
            replyText = response.message.content;
        } else if (response?.text) {
            replyText = response.text;
        } else {
            replyText = String(response);
        }

        // Support streaming response
        if (response && typeof response[Symbol.asyncIterator] === 'function') {
            const msgId = appendMessageUI('assistant', '');
            lastAssistantMsgId = msgId;
            let full = '';
            for await (const chunk of response) {
                full += chunk?.text || '';
                const el = document.getElementById(msgId)?.querySelector('.ai-text-content');
                if (el) el.innerHTML = formatMarkdown(full);
                scrollToBottom();
            }
            replyText = full;
            chatHistory.push({ role: 'assistant', content: replyText });
            saveHistory();
        } else {
            chatHistory.push({ role: 'assistant', content: replyText });
            lastAssistantMsgId = appendMessageUI('assistant', replyText);
            saveHistory();
        }

    } catch (error) {
        console.error('Chat error:', error);
        removeMessageUI(loadingId);
        appendMessageUI('system', '❌ حدث خطأ: ' + (error.message || 'تعذر معالجة الطلب. تحقق من اتصالك بالإنترنت.'));
        if (chatHistory[chatHistory.length - 1].role === 'user') chatHistory.pop();
        saveHistory();
    } finally {
        isTyping = false;
        document.getElementById('sendBtn').disabled = document.getElementById('userInput').value.trim().length === 0;
    }
}

// ----------------------------
//  Image Generation Handler
// ----------------------------

async function handleImageGeneration(prompt) {
    if (!prompt) { showToast('أدخل وصفاً للصورة أولاً'); return; }
    isTyping = true;
    appendMessageUI('user', prompt);
    const loadingId = appendLoadingUI('جاري رسم الصورة... 🎨');

    try {
        const result = await puter.ai.txt2img(prompt, { model: 'gpt-image-2' });
        removeMessageUI(loadingId);

        let imgSrc = '';
        if (result instanceof HTMLElement) imgSrc = result.src;
        else if (typeof result === 'string') imgSrc = result;
        else if (result?.src) imgSrc = result.src;

        appendMessageUI('assistant', 'إليك الصورة التي رسمتها لك! 🎨', imgSrc);

    } catch (error) {
        console.warn('Primary image engine failed, using fallback...', error);
        try {
            const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
            removeMessageUI(loadingId);
            appendMessageUI('assistant', 'إليك الصورة التي رسمتها لك! 🎨', fallbackUrl);
        } catch (fallbackError) {
            removeMessageUI(loadingId);
            appendMessageUI('system', '❌ حدث خطأ أثناء رسم الصورة. حاول مرة أخرى.');
        }
    } finally {
        isTyping = false;
    }
}

// ----------------------------
//  Message Rendering
// ----------------------------

function appendMessageUI(role, text, imageUrl = null) {
    const chatBox = document.getElementById('chatBox');
    const rowDiv = document.createElement('div');
    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    rowDiv.id = msgId;
    rowDiv.className = `message-row ${role}`;

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    const imageHtml = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" class="msg-image-thumb" alt="صورة" onclick="openLightbox('${escapeHtml(imageUrl)}')" loading="lazy">`
        : '';

    if (role === 'user') {
        const displayText = imageUrl && !text ? '' : formatMarkdown(text);
        rowDiv.innerHTML = `
            <div class="user-bubble">
                ${imageHtml}
                ${displayText ? `<div class="ai-text-content" style="white-space: pre-wrap;">${displayText}</div>` : ''}
            </div>
        `;
    } else {
        const avatarLabel = role === 'system' ? '⚙' : 'S';
        const senderName = role === 'system' ? 'النظام' : 'Suna Ai';
        const formattedText = formatMarkdown(text);
        const copyBtn = role === 'assistant'
            ? `<button class="action-btn" onclick="copyMessage(this, '${escapeForAttr(text)}')" title="نسخ">📋 نسخ</button>`
            : '';
        const regenBtn = role === 'assistant'
            ? `<button class="action-btn" onclick="regenerateLastResponse()" title="إعادة توليد">🔄 إعادة</button>`
            : '';

        rowDiv.innerHTML = `
            <div class="avatar-wrapper">
                <div class="avatar ${role}">${avatarLabel}</div>
            </div>
            <div class="message-content-wrapper">
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="ai-text">
                    ${imageHtml}
                    <div class="ai-text-content">${formattedText}</div>
                </div>
                ${copyBtn ? `<div class="message-actions">${copyBtn}${regenBtn}</div>` : ''}
            </div>
        `;
    }

    chatBox.appendChild(rowDiv);
    scrollToBottom();
    return msgId;
}

function appendLoadingUI(customText = null) {
    const chatBox = document.getElementById('chatBox');
    const rowDiv = document.createElement('div');
    const msgId = 'msg-loading-' + Date.now();
    rowDiv.id = msgId;
    rowDiv.className = 'message-row assistant';

    rowDiv.innerHTML = `
        <div class="avatar-wrapper">
            <div class="avatar assistant">S</div>
        </div>
        <div class="message-content-wrapper">
            <div class="message-header">
                <span class="message-sender">Suna Ai</span>
            </div>
            <div class="ai-text">
                ${customText
                    ? `<span style="color:var(--text-secondary); font-size:0.9rem;">${customText}</span>`
                    : `<div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>`
                }
            </div>
        </div>
    `;

    chatBox.appendChild(rowDiv);
    scrollToBottom();
    return msgId;
}

function removeMessageUI(msgId) {
    const el = document.getElementById(msgId);
    if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-8px)';
        el.style.transition = 'all 0.2s ease';
        setTimeout(() => el.remove(), 200);
    }
}

// ----------------------------
//  Markdown Formatter (Enhanced)
// ----------------------------

function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Code blocks (``` ```) with copy button
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const id = 'code-' + Math.random().toString(36).slice(2,8);
        const escapedCode = code.trim();
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-lang">${lang || 'code'}</span>
                <button class="code-copy-btn" onclick="copyCode('${id}')">📋 نسخ الكود</button>
            </div>
            <pre><code id="${id}" class="lang-${lang}">${escapedCode}</code></pre>
        </div>`;
    });

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold **text**
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Blockquote
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Bullet lists
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

    // Numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border-light);margin:12px 0;">');

    // Line breaks (wrap paragraphs)
    const lines = html.split('\n');
    const result = [];
    let buffer = [];

    for (const line of lines) {
        if (line.match(/^<(h[1-3]|ul|ol|pre|blockquote|hr|div)/)) {
            if (buffer.length > 0) {
                result.push('<p>' + buffer.join('<br>') + '</p>');
                buffer = [];
            }
            result.push(line);
        } else if (line.trim() === '') {
            if (buffer.length > 0) {
                result.push('<p>' + buffer.join('<br>') + '</p>');
                buffer = [];
            }
        } else {
            buffer.push(line);
        }
    }
    if (buffer.length > 0) result.push('<p>' + buffer.join('<br>') + '</p>');

    return result.join('\n');
}

// ----------------------------
//  Copy Code Block
// ----------------------------

function copyCode(codeId) {
    const el = document.getElementById(codeId);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => {
        showToast('تم نسخ الكود ✅');
    }).catch(() => showToast('تعذر النسخ'));
}

// ----------------------------
//  Utilities
// ----------------------------

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function escapeForAttr(text) {
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/"/g, '&quot;');
}

function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    requestAnimationFrame(() => {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    });
}

// ----------------------------
//  Copy Message
// ----------------------------

function copyMessage(btn, text) {
    const decoded = text.replace(/\\n/g, '\n').replace(/\\'/g, "'");
    navigator.clipboard.writeText(decoded).then(() => {
        btn.textContent = '✅ تم النسخ';
        setTimeout(() => { btn.innerHTML = '📋 نسخ'; }, 2000);
        showToast('تم نسخ الرسالة ✅');
    }).catch(() => {
        showToast('تعذر النسخ');
    });
}

// ----------------------------
//  Lightbox
// ----------------------------

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
}

// ----------------------------
//  Toast Notification
// ----------------------------

let toastTimeout = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}