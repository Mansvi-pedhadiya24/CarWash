
(function () {
  'use strict';

  // ── Config from script tag attributes ────────────────────────
  const scriptTag = document.currentScript || document.querySelector('script[data-token]');
  const CONFIG = {
    TOKEN:       scriptTag?.getAttribute('data-token')   || 'devtoken00000000000000000000000000000000000000000000000000000001',
    BACKEND_HTTP: scriptTag?.getAttribute('data-backend') || 'http://192.168.0.245:8001',
    BACKEND_WS:   scriptTag?.getAttribute('data-ws')     || '',
    TITLE:        scriptTag?.getAttribute('data-title')   || 'CarWash AI Support',
    ACCENT:       scriptTag?.getAttribute('data-color')   || '#eb2525',
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

  // ── Inject Styles ─────────────────────────────────────────────
  const accent = CONFIG.ACCENT;
  const styles = `
    #__cw_chatbot_root * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; }
    #__cw_chatbot_root { position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; flex-direction: column; align-items: flex-end; }

    /* FAB Button */
    #__cw_fab {
      width: 56px; height: 56px; border-radius: 50%;
      background: ${accent}; color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #__cw_fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
    #__cw_fab:active { transform: scale(0.95); }
    #__cw_fab svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    #__cw_badge {
      position: absolute; top: -4px; right: -4px;
      width: 18px; height: 18px; background: #f59e0b; border-radius: 50%;
      font-size: 10px; font-weight: 700; color: #fff;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid ${accent};
    }

    /* Chat Window */
    #__cw_window {
      width: 380px; height: 560px; margin-bottom: 12px;
      background: #f8fafc; border-radius: 18px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
      border: 1px solid rgba(0,0,0,0.08);
      display: flex; flex-direction: column;
      transform-origin: bottom right;
      transition: transform 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.28s;
    }
    #__cw_window.cw-hidden { transform: scale(0.88) translateY(16px); opacity: 0; pointer-events: none; }

    /* Header */
    #__cw_header {
      background: ${accent}; color: #fff;
      padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    #__cw_header .cw-left { display: flex; align-items: center; gap: 12px; }
    #__cw_header .cw-avatar {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    #__cw_header .cw-avatar svg { width: 20px; height: 20px; fill: none; stroke: #dbeafe; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    #__cw_header .cw-title { font-size: 13.5px; font-weight: 600; letter-spacing: 0.2px; }
    #__cw_header .cw-status { font-size: 11px; color: rgba(255,255,255,0.75); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
    #__cw_header .cw-dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 2px rgba(52,211,153,0.3); }
    #__cw_header .cw-dot.offline { background: #f87171; box-shadow: none; }
    #__cw_header .cw-actions { display: flex; gap: 4px; }
    #__cw_header button {
      background: transparent; border: none; color: rgba(255,255,255,0.75); cursor: pointer;
      padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    #__cw_header button:hover { background: rgba(255,255,255,0.15); color: #fff; }
    #__cw_header button svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    /* Messages */
    #__cw_messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    #__cw_messages::-webkit-scrollbar { width: 4px; }
    #__cw_messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    /* Empty state */
    #__cw_empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; padding: 16px; min-height: 360px; }
    #__cw_empty .cw-icon-wrap { background: #eff6ff; padding: 16px; border-radius: 50%; margin-bottom: 12px; }
    #__cw_empty .cw-icon-wrap svg { width: 32px; height: 32px; fill: none; stroke: ${accent}; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    #__cw_empty h4 { font-size: 14px; font-weight: 600; color: #1e293b; }
    #__cw_empty p { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    #__cw_chips { display: grid; grid-template-columns: 1fr; gap: 8px; width: 100%; max-width: 280px; margin-top: 18px; }
    .cw-chip {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 10px 14px; font-size: 12px; font-weight: 500; color: #475569;
      cursor: pointer; text-align: left; transition: all 0.15s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .cw-chip:hover { border-color: ${accent}; background: #eff6ff; color: ${accent}; transform: translateX(2px); }

    /* Bubbles */
    .cw-bubble-wrap { display: flex; align-items: flex-start; gap: 8px; }
    .cw-bubble-wrap.user { flex-direction: row-reverse; }
    .cw-bubble {
      max-width: 80%; padding: 10px 14px; border-radius: 16px;
      font-size: 12.5px; line-height: 1.55; word-break: break-word; white-space: pre-wrap;
    }
    .cw-bubble.user { background: ${accent}; color: #fff; border-top-right-radius: 4px; }
    .cw-bubble.bot { background: #fff; color: #1e293b; border: 1px solid #e2e8f0; border-top-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }

    /* Typing */
    .cw-typing { display: flex; align-items: center; gap: 4px; padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; border-top-left-radius: 4px; width: fit-content; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .cw-typing span { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: cwBounce 1.2s ease-in-out infinite; display: inline-block; }
    .cw-typing span:nth-child(2) { animation-delay: 0.15s; }
    .cw-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes cwBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

    /* Footer */
    #__cw_footer { padding: 10px 12px; border-top: 1px solid #e2e8f0; background: #fff; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    #__cw_input {
      flex: 1; padding: 9px 14px; border-radius: 12px; border: 1px solid #e2e8f0;
      background: #f1f5f9; font-size: 12.5px; color: #1e293b; outline: none;
      transition: border 0.15s, background 0.15s;
    }
    #__cw_input::placeholder { color: #94a3b8; }
    #__cw_input:focus { border-color: ${accent}; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    #__cw_send {
      width: 36px; height: 36px; border-radius: 10px; background: ${accent};
      border: none; cursor: pointer; color: #fff;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: transform 0.15s, background 0.15s;
    }
    #__cw_send:hover { background: ${accent}dd; }
    #__cw_send:active { transform: scale(0.92); }
    #__cw_send svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

    /* Animations */
    .cw-slide-in { animation: cwSlideIn 0.3s cubic-bezier(0.16,1,0.3,1); }
    @keyframes cwSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

    @media (max-width: 440px) {
      #__cw_window { width: calc(100vw - 24px); height: 75vh; right: 12px; }
      #__cw_chatbot_root { right: 12px; bottom: 12px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ── SVG Icons ─────────────────────────────────────────────────
  const icons = {
    car: `<svg viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h1l3-5h12l3 5h1a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/><path d="M5 12h14"/></svg>`,
    msg: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    x:   `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash:`<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  };

  // ── Build DOM ─────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = '__cw_chatbot_root';
  root.innerHTML = `
    <div id="__cw_window" class="cw-hidden">
      <div id="__cw_header">
        <div class="cw-left">
          <div class="cw-avatar">${icons.car}</div>
          <div>
            <div class="cw-title">${CONFIG.TITLE}</div>
            <div class="cw-status" id="__cw_status">
              <div class="cw-dot offline" id="__cw_dot"></div>
              <span id="__cw_status_text">Connecting...</span>
            </div>
          </div>
        </div>
        <div class="cw-actions">
          <button id="__cw_clear_btn" title="Clear chat">${icons.trash}</button>
          <button id="__cw_close_btn" title="Close">${icons.x}</button>
        </div>
      </div>
      <div id="__cw_messages">
        <div id="__cw_empty">
          <div class="cw-icon-wrap">${icons.car}</div>
          <h4>Welcome to ${CONFIG.TITLE}!</h4>
          <p>Ask me about wash plans, pricing, or bookings.</p>
          <div id="__cw_chips">
            <button class="cw-chip" data-msg="🏎️ Full Body Wash Price?">🏎️ Full Body Wash Price?</button>
            <button class="cw-chip" data-msg="📅 Book an Appointment">📅 Book an Appointment</button>
            <button class="cw-chip" data-msg="✨ Ceramic Coating Details">✨ Ceramic Coating Details</button>
            <button class="cw-chip" data-msg="📍 Where is your workshop?">📍 Where is your workshop?</button>
          </div>
        </div>
      </div>
      <div id="__cw_footer">
        <input id="__cw_input" type="text" placeholder="Type your message..." autocomplete="off" />
        <button id="__cw_send">${icons.send}</button>
      </div>
    </div>

    <button id="__cw_fab" aria-label="Open chat">
      <span id="__cw_badge">1</span>
      <span id="__cw_fab_icon">${icons.msg}</span>
    </button>
  `;
  document.body.appendChild(root);

  // ── Element refs ──────────────────────────────────────────────
  const win        = root.querySelector('#__cw_window');
  const fab        = root.querySelector('#__cw_fab');
  const badge      = root.querySelector('#__cw_badge');
  const fabIcon    = root.querySelector('#__cw_fab_icon');
  const msgBox     = root.querySelector('#__cw_messages');
  const emptyState = root.querySelector('#__cw_empty');
  const statusDot  = root.querySelector('#__cw_dot');
  const statusTxt  = root.querySelector('#__cw_status_text');
  const input      = root.querySelector('#__cw_input');
  const sendBtn    = root.querySelector('#__cw_send');
  const closeBtn   = root.querySelector('#__cw_close_btn');
  const clearBtn   = root.querySelector('#__cw_clear_btn');

  // ── State ─────────────────────────────────────────────────────
  let isOpen         = false;
  let wsConn         = null;
  let messages       = [];
  let streamingId    = null;
  let isTyping       = false;
  let reconnectTimer = null;

  // ── Open / Close ──────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.remove('cw-hidden');
    badge.style.display = 'none';
    fabIcon.innerHTML = icons.x;
    input.focus();
    scrollToBottom();
  }
  function closeChat() {
    isOpen = false;
    win.classList.add('cw-hidden');
    fabIcon.innerHTML = icons.msg;
  }
  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── Clear chat ────────────────────────────────────────────────
  function clearChat() {
    messages = [];
    streamingId = null;
    isTyping = false;
    renderMessages();
  }
  clearBtn.addEventListener('click', clearChat);

  // ── Chips ─────────────────────────────────────────────────────
  root.querySelectorAll('.cw-chip').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
  });

  // ── Render ────────────────────────────────────────────────────
  function scrollToBottom() {
    setTimeout(() => { msgBox.scrollTop = msgBox.scrollHeight; }, 50);
  }

  function renderMessages() {
    if (messages.length === 0) {
      msgBox.innerHTML = emptyState.outerHTML;
      // re-attach chip listeners
      root.querySelectorAll('.cw-chip').forEach(btn => {
        btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
      });
      return;
    }

    let html = '';
    messages.forEach(msg => {
      const isUser = msg.role === 'user';
      const bubbleClass = isUser ? 'user' : 'bot';
      const wrapClass = isUser ? 'user' : '';
      const content = escapeHtml(msg.content);
      html += `
        <div class="cw-bubble-wrap ${wrapClass} cw-slide-in">
          <div class="cw-bubble ${bubbleClass}">${content}</div>
        </div>`;
    });

    if (isTyping) {
      html += `
        <div class="cw-bubble-wrap cw-slide-in">
          <div class="cw-typing"><span></span><span></span><span></span></div>
        </div>`;
    }

    msgBox.innerHTML = html;
    scrollToBottom();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // ── WebSocket ─────────────────────────────────────────────────
  function connect() {
    if (wsConn && wsConn.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(API.WS_CHAT);
      wsConn = ws;

      ws.onopen = () => {
        setStatus(true);
        clearTimeout(reconnectTimer);
      };

      ws.onclose = (e) => {
        setStatus(false);
        isTyping = false;
        if (e.code !== 4003) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => setStatus(false);

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
      setStatus(false);
      reconnectTimer = setTimeout(connect, 3000);
    }
  }

  function setStatus(online) {
    if (online) {
      statusDot.classList.remove('offline');
      statusTxt.textContent = 'Online Agent';
    } else {
      statusDot.classList.add('offline');
      statusTxt.textContent = 'Reconnecting...';
    }
  }

  // ── Send message ──────────────────────────────────────────────
  function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    // Hide empty state after first message
    const emptyEl = msgBox.querySelector('#__cw_empty');
    if (emptyEl) emptyEl.remove();

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

  // ── Footer input events ───────────────────────────────────────
  sendBtn.addEventListener('click', () => {
    const val = input.value;
    if (!val.trim()) return;
    sendMessage(val);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = input.value;
      if (!val.trim()) return;
      sendMessage(val);
      input.value = '';
    }
  });

  // ── Validate token & init connection ──────────────────────────
  async function init() {
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
      // Network error in dev — still show widget
      console.warn('[CarWashBot] Backend unreachable — showing in dev mode.');
    }
    connect();
  }

  // ── Kick off ──────────────────────────────────────────────────
  init();
})();