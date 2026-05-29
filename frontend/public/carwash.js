(function () {
  'use strict';

  // ── Config from script tag attributes ────────────────────────
  const scriptTag = document.currentScript || document.querySelector('script[data-token]');
  const CONFIG = {
    TOKEN:       scriptTag?.getAttribute('data-token')   || 'b737e5eb0768c62006fe11df67646a087dcaae250c97ec0809e47a6eb7a184f2',
    BACKEND_HTTP: scriptTag?.getAttribute('data-backend') || 'http://192.168.0.245:8000',
    BACKEND_WS:   scriptTag?.getAttribute('data-ws')     || '',
    TITLE:        scriptTag?.getAttribute('data-title')   || 'CarWash AI Support',
    ACCENT:       scriptTag?.getAttribute('data-color')   || '#d81d1d',
  };
  CONFIG.BACKEND_WS = CONFIG.BACKEND_WS || CONFIG.BACKEND_HTTP.replace('https://', 'wss://').replace('http://', 'ws://');

  const API = {
    VALIDATE: `${CONFIG.BACKEND_HTTP}/api/v1/validate`,
    WS_CHAT:  `${CONFIG.BACKEND_WS}/api/v1/ws/chat`,
  };

  // ── Prevent double-init ───────────────────────────────────────
  if (document.getElementById('__cw_chatbot_root')) return;

  // ── UUID Generator ────────────────────────────────────────────
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  const SESSION_UUID = uuid();

  // ── Injected Styles (Matching React UI Styles & Markdown) ─────
  const styles = `
#__cw_chatbot_root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}
#__cw_chatbot_root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 999999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
#__cw_fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: ${CONFIG.ACCENT};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
  transition: transform 0.15s;
}
#__cw_fab:hover {
  transform: scale(1.05);
}
#__cw_fab svg {
  width: 24px;
  height: 24px;
}
#__cw_window {
  display: flex;
  flex-direction: column;
  height: 500px;
  width: 380px;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid rgba(226,232,240,0.8);
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  background-color: #f8fafc;
  margin-bottom: 16px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
#__cw_window.cw-hidden {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
  pointer-events: none;
}

/* Markdown prose definitions from React code */
.cw-prose p { margin-bottom: 4px; white-space: pre-wrap; }
.cw-prose p:last-child { margin-bottom: 0; }
.cw-prose ul { list-style-type: disc; padding-left: 16px; margin: 4px 0; }
.cw-prose ol { list-style-type: decimal; padding-left: 16px; margin: 4px 0; }
.cw-prose li { font-size: 12px; }
.cw-prose strong { font-weight: 600; }
.cw-prose em { italic; }
.cw-prose code { background-color: #f1f5f9; border-radius: 4px; padding: 0 4px; font-size: 11px; font-family: mono; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}
@media(max-width: 440px) {
  细腻#__cw_window { width: calc(100vw - 32px); height: 70vh; }
}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ── Lucide Equivalent SVGs from React components ──────────────
  const icons = {
    car:   `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M13 17H9"/><path d="M11 10h5"/></svg>`,
    msg:   `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    x:     `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    send:  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    wifioff: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"/><path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.5 8"/><path d="M1.5 8a15.93 15.93 0 0 1 7-2.43"/><path d="M8.58 14.24a4.5 4.5 0 0 1 6.84 0"/></svg>`
  };

  // ── Build DOM Base Structure ──────────────────────────────────
  const root = document.createElement('div');
  root.id = '__cw_chatbot_root';
  root.innerHTML = `
    <div id="__cw_window" class="cw-hidden">
      <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; background-color: ${CONFIG.ACCENT}; padding: 14px 16px; color: white; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background-color: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
            <span style="color: #bfdbfe; display: flex;">${icons.car}</span>
          </div>
          <div>
            <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.03em;">${CONFIG.TITLE}</p>
            <div id="__cw_status_container" style="display: flex; align-items: center; gap: 6px; marginTop: 2px;">
              </div>
          </div>
        </div>
        <div style="display: flex; gap: 4px;">
          <button id="__cw_clear_btn" title="Clear" type="button" style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px; color: #bfdbfe; display: flex;">${icons.trash}</button>
          <button id="__cw_close_btn" title="Close" type="button" style="background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px; color: #bfdbfe; display: flex;">${icons.x}</button>
        </div>
      </div>

      <div id="__cw_messages" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px;">
        </div>

      <form id="__cw_form" style="flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 12px; border-top: 1px solid #e2e8f0; background-color: white; z-index: 10;">
        <input id="__cw_input" type="text" placeholder="Type your message..." autocomplete="off" style="flex: 1; border-radius: 12px; background-color: #f1f5f9; border: none; outline: none; padding: 10px 16px; font-size: 12px; color: #1e293b;" />
        <button type="submit" style="width: 36px; height: 36px; flex-shrink: 0; border-radius: 12px; background-color: ${CONFIG.ACCENT}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <span style="color: white; display: flex;">${icons.send}</span>
        </button>
      </form>
    </div>

    <button id="__cw_fab" aria-label="Open chat">
      <span id="__cw_fab_icon" style="display: flex;">${icons.msg}</span>
    </button>
  `;
  document.body.appendChild(root);

  // ── Element references ────────────────────────────────────────
  const win        = root.querySelector('#__cw_window');
  const fab        = root.querySelector('#__cw_fab');
  const fabIcon    = root.querySelector('#__cw_fab_icon');
  const msgBox     = root.querySelector('#__cw_messages');
  const statusCont = root.querySelector('#__cw_status_container');
  const input      = root.querySelector('#__cw_input');
  const chatForm   = root.querySelector('#__cw_form');
  const closeBtn   = root.querySelector('#__cw_close_btn');
  const clearBtn   = root.querySelector('#__cw_clear_btn');

  // ── State ─────────────────────────────────────────────────────
  let isOpen         = false;
  let wsConn         = null;
  let messages       = [];
  let streamingId    = null;
  let isTyping       = false;
  let reconnectTimer = null;
  let isConnected    = false;

  const suggestions = [
    "🏎️ Full Car Wash Price?",
    "📅 Book an Appointment",
    "📍 Where is your workshop?"
  ];

  // ── Open / Close ──────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.remove('cw-hidden');
    fabIcon.innerHTML = icons.x;
    input.focus();
    renderMessages();
  }
  function closeChat() {
    isOpen = false;
    win.classList.add('cw-hidden');
    fabIcon.innerHTML = icons.msg;
  }
  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── Clear Chat ────────────────────────────────────────────────
  function clearMessages() {
    messages = [];
    streamingId = null;
    isTyping = false;
    renderMessages();
  }
  clearBtn.addEventListener('click', clearMessages);

  // ── Clean Assistant Content (<think> tags removal) ──────────
  function cleanContent(text) {
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .trim();
  }

  // ── Simple Markdown Parser (Matches React Components rules) ──
  function parseMarkdown(text) {
    let html = text;
    // Strong text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    // Em text
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    // Inline code
    html = html.replace(/`(.*?)`/g, '<code class="bg-slate-100 rounded px-1 text-[11px] font-mono">$1</code>');
    
    // Lists transformations
    let lines = html.split('\n');
    let inUl = false, inOl = false;
    let newLines = [];

    lines.forEach(line => {
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        if (!inUl) { newLines.push('<ul class="list-disc pl-4 my-1 space-y-0.5">'); inUl = true; }
        newLines.push(`<li class="text-xs">${line.trim().substring(2)}</li>`);
      } else if (/^\d+\.\s/.test(line.trim())) {
        if (!inOl) { newLines.push('<ol class="list-decimal pl-4 my-1 space-y-0.5">'); inOl = true; }
        let content = line.trim().replace(/^\d+\.\s/, '');
        newLines.push(`<li class="text-xs">${content}</li>`);
      } else {
        if (inUl) { newLines.push('</ul>'); inUl = false; }
        if (inOl) { newLines.push('</ol>'); inOl = false; }
        if (line.trim()) {
          newLines.push(`<p class="mb-1 last:mb-0 whitespace-pre-wrap">${line}</p>`);
        }
      }
    });
    if (inUl) newLines.push('</ul>');
    if (inOl) newLines.push('</ol>');

    return newLines.join('');
  }

  // ── Render functions ──────────────────────────────────────────
  function scrollToBottom() {
    setTimeout(() => { msgBox.scrollTop = msgBox.scrollHeight; }, 50);
  }

  function suggestionClick(text) {
    if (text.includes("Full Car Wash Price")) {
      window.open('/CarWash_Pricing.pdf', '_blank');
      return;
    }
    sendMessage(text);
  }

  function renderMessages() {
    // If empty stack, render Empty Welcome State precisely matching React UI
    if (messages.length === 0) {
      msgBox.innerHTML = `
        <div style="flex: 1; display: flex; flexDirection: column; align-items: center; justify-content: center; text-align: center; padding: 16px; margin: auto 0;">
          <div style="margin-bottom: 12px; padding: 12px; border-radius: 50%; background-color: #eff6ff; color: ${CONFIG.ACCENT}; display: flex;">
            ${icons.car}
          </div>
          <p style="margin: 0; font-size: 13px; font-weight: 500; color: #334155;">Welcome to CarWash Express!</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Ask me anything about wash plans, pricing, or bookings.</p>
          <div id="__cw_chips_container" style="margin-top: 20px; display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 280px;">
            ${suggestions.map(text => `
              <button type="button" class="cw-suggestion-btn" data-msg="${text}" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ${text}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      // Attach listeners to click suggestion chips
      msgBox.querySelectorAll('.cw-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => suggestionClick(btn.dataset.msg));
      });
      return;
    }

    let html = '';
    messages.forEach(msg => {
      const isUser = msg.role === 'user';
      const content = isUser ? msg.content : cleanContent(msg.content);

      if (!content && !isUser) return;

      const outerWrapStyle = `display: flex; items-start; gap: 10px; width: 100%; ${isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}`;
      const bubbleStyle = `max-w-[80%] rounded-2xl px-[14px] py-[10px] text-xs shadow-sm leading-relaxed ${
        isUser 
          ? `background-color: ${CONFIG.ACCENT}; color: white; border-top-right-radius: 0px;` 
          : 'background-color: white; color: #1e293b; border: 1px solid rgba(226,232,240,0.8); border-top-left-radius: 0px;'
      }`;

      html += `
        <div style="${outerWrapStyle}">
          <div style="${bubbleStyle}">
            ${isUser ? `<p style="white-space: pre-wrap; margin:0;">${escapeHtml(content)}</p>` : `<div class="cw-prose">${parseMarkdown(content)}</div>`}
          </div>
        </div>`;
    });

    if (isTyping) {
      html += `
        <div style="display: flex; justify-content: flex-start;">
          <div style="background: white; border: 1px solid #f1f5f9; border-radius: 16px; border-top-left-radius: 4px; padding: 10px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); display: flex; gap: 4px; align-items: center;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #94a3b8; display: inline-block; animation: bounce 1.2s ease-in-out -0.3s infinite;"></span>
            <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #94a3b8; display: inline-block; animation: bounce 1.2s ease-in-out -0.15s infinite;"></span>
            <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #94a3b8; display: inline-block; animation: bounce 1.2s ease-in-out 0s infinite;"></span>
          </div>
        </div>`;
    }

    // Set scrollable inner view anchor point
    html += `<div id="__cw_anchor" style="height: 1px; flex-shrink: 0;"></div>`;
    msgBox.innerHTML = html;
    scrollToBottom();
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Connection Status Controller ────────────────────────────────
  function updateStatusDisplay() {
    if (isConnected) {
      statusCont.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #10b924; display: inline-block;"></span>
        <span style="font-size: 11px; color: #bfdbfe;">Online Agent</span>
      `;
    } else {
      statusCont.innerHTML = `
        <span style="display: flex; color: #fca5a5;">${icons.wifioff}</span>
        <span style="font-size: 11px; color: #fca5a5; font-weight: 500;">Reconnecting...</span>
      `;
    }
  }

  // ── WebSocket Pipeline ──────────────────────────────────────────
  function connect() {
    if (wsConn && wsConn.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(API.WS_CHAT);
      wsConn = ws;

      ws.onopen = () => {
        isConnected = true;
        updateStatusDisplay();
        clearTimeout(reconnectTimer);
      };

      ws.onclose = (e) => {
        isConnected = false;
        isTyping = false;
        updateStatusDisplay();
        if (e.code !== 4003) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        isConnected = false;
        updateStatusDisplay();
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data);
          if (frame.type === 'chunk' && streamingId) {
            const msg = messages.find(m => m.id === streamingId);
            if (msg) { msg.content += frame.data; renderMessages(); }
          } else if (frame.type === 'done') {
            const msg = messages.find(m => m.id === streamingId);
            if (msg) msg.isStreaming = false;
            streamingId = null;
            isTyping = false;
            renderMessages();
          } else if (frame.type === 'error') {
            isTyping = false;
            streamingId = null;
            messages.push({ id: uuid(), role: 'assistant', content: '⚠️ ' + frame.data });
            renderMessages();
          }
        } catch (_) {}
      };
    } catch (err) {
      isConnected = false;
      updateStatusDisplay();
      reconnectTimer = setTimeout(connect, 3000);
    }
  }

  // ── Send Logic Engine ───────────────────────────────────────────
  function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    messages.push({ id: uuid(), role: 'user', content: trimmed });

    const aiId = uuid();
    streamingId = aiId;
    messages.push({ id: aiId, role: 'assistant', content: '', isStreaming: true });
    isTyping = true;
    renderMessages();

    if (!wsConn || wsConn.readyState !== WebSocket.OPEN) {
      connect();
      setTimeout(() => _wsSend(trimmed), 1200);
    } else {
      _wsSend(trimmed);
    }
  }

  function _wsSend(text) {
    if (!wsConn || wsConn.readyState !== WebSocket.OPEN) {
      setTimeout(() => _wsSend(text), 800);
      return;
    }
    wsConn.send(JSON.stringify({
      token:        CONFIG.TOKEN,
      origin:       window.location.hostname || 'localhost',
      session_uuid: SESSION_UUID,
      message:      text,
    }));
  }

  // ── Submit Input Flow ───────────────────────────────────────────
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value;
    if (!val.trim()) return;
    sendMessage(val);
    input.value = '';
  });

  // ── Token Verification Validation & Init ────────────────────────
  async function init() {
    updateStatusDisplay(); // Init with offline indicator first
    try {
      const res = await fetch(API.VALIDATE, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${CONFIG.TOKEN}`,
        },
        body: JSON.stringify({ origin: window.location.hostname || 'localhost' }),
      });
      if (!res.ok) {
        console.warn('[CarWashBot] Validation failed — widget hidden.');
        root.style.display = 'none';
        return;
      }
    } catch (_) {
      console.warn('[CarWashBot] Backend unreachable — showing in dev mode.');
    }
    connect();
    renderMessages();
  }

  // Run application
  init();
})();