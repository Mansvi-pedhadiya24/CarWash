/**
 * CarWash AI Chatbot — Standalone Embeddable Script
 * Usage: <script src="carwash-chatbot.js" data-token="YOUR_TOKEN" data-backend="http://127.0.0.1:8000"></script>
 */
(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const BACKEND_HTTP = currentScript.getAttribute('data-backend') || 'http://127.0.0.1:8000';
  const BACKEND_WS   = BACKEND_HTTP.replace(/^http/, 'ws');
  const TOKEN        = currentScript.getAttribute('data-token') || 'devtoken00000000000000000000000000000000000000000000000000000001';

  const API = {
    VALIDATE: `${BACKEND_HTTP}/api/v1/validate`,
    WS_CHAT:  `${BACKEND_WS}/api/v1/ws/chat`,
  };

  // ── UUID ───────────────────────────────────────────────────────────────────
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const SESSION_UUID = generateUUID();

  // ── Inject Styles ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cw-chatbot-root * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Outfit', ui-sans-serif, system-ui, -apple-system, sans-serif;
    }
    #cw-chatbot-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    /* ── FAB Button ── */
    #cw-fab {
      width: 56px;
      height: 56px;
      border-radius: 9999px;
      background: #2563eb;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,.18), 0 4px 6px -2px rgba(0,0,0,.1);
      transition: background .2s, transform .2s;
      position: relative;
    }
    #cw-fab:hover { background: #1d4ed8; transform: scale(1.05); }
    #cw-fab:active { transform: scale(0.95); }
    #cw-fab svg { width: 24px; height: 24px; }

    #cw-fab-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      border-radius: 9999px;
      background: #f59e0b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      border: 2px solid #2563eb;
    }

    /* ── Chat Window ── */
    #cw-window {
      margin-bottom: 16px;
      width: 380px;
      height: 560px;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      border: 1px solid rgba(203,213,225,.8);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,.18);
      transform-origin: bottom right;
      transition: transform .3s cubic-bezier(.16,1,.3,1), opacity .3s cubic-bezier(.16,1,.3,1);
    }
    #cw-window.cw-hidden {
      transform: scale(0.95) translateY(10px);
      opacity: 0;
      pointer-events: none;
    }
    #cw-window.cw-visible {
      transform: scale(1) translateY(0);
      opacity: 1;
    }

    /* ── Header ── */
    #cw-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #2563eb;
      padding: 14px 16px;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,.1);
      z-index: 10;
    }
    #cw-header-left { display: flex; align-items: center; gap: 12px; }
    #cw-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,.1);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    #cw-avatar svg { width: 20px; height: 20px; color: #bfdbfe; }
    #cw-header-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: .025em;
      line-height: 1.2;
    }
    #cw-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #bfdbfe;
      margin-top: 2px;
    }
    .cw-dot-wrap {
      position: relative;
      width: 8px;
      height: 8px;
      flex-shrink: 0;
    }
    .cw-dot-ping {
      position: absolute;
      inset: 0;
      border-radius: 9999px;
      background: #34d399;
      opacity: .75;
      animation: cw-ping 1.4s cubic-bezier(0,0,.2,1) infinite;
    }
    .cw-dot-solid {
      position: absolute;
      inset: 0;
      border-radius: 9999px;
      background: #10b981;
    }
    @keyframes cw-ping {
      75%, 100% { transform: scale(2); opacity: 0; }
    }
    #cw-status.offline { color: #fca5a5; }
    #cw-status.offline .cw-dot-wrap { display: none; }
    #cw-header-actions { display: flex; align-items: center; gap: 4px; }
    .cw-icon-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s, color .15s;
    }
    .cw-icon-btn:hover { background: rgba(255,255,255,.1); color: #fff; }
    .cw-icon-btn svg { width: 16px; height: 16px; }

    /* ── Messages Area ── */
    #cw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    #cw-messages::-webkit-scrollbar { width: 4px; }
    #cw-messages::-webkit-scrollbar-track { background: transparent; }
    #cw-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }

    /* ── Empty State ── */
    #cw-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      text-align: center;
      padding: 0 8px;
    }
    #cw-empty-icon {
      width: 56px;
      height: 56px;
      border-radius: 9999px;
      background: #eff6ff;
      color: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    #cw-empty-icon svg { width: 32px; height: 32px; }
    #cw-empty-title {
      font-size: 14px;
      font-weight: 500;
      color: #334155;
    }
    #cw-empty-sub {
      margin-top: 4px;
      font-size: 12px;
      color: #94a3b8;
    }
    #cw-suggestions {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 280px;
    }
    .cw-suggestion-btn {
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      padding: 10px 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: border-color .15s, background .15s, color .15s;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }
    .cw-suggestion-btn:hover {
      border-color: #60a5fa;
      background: rgba(239,246,255,.5);
      color: #2563eb;
    }

    /* ── Chat Bubbles ── */
    .cw-bubble-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .cw-bubble-row.user { justify-content: flex-end; }
    .cw-bubble-row.assistant { justify-content: flex-start; }
    .cw-bubble {
      max-width: 80%;
      border-radius: 16px;
      padding: 10px 14px;
      font-size: 12px;
      line-height: 1.6;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
      word-break: break-word;
      white-space: pre-wrap;
    }
    .cw-bubble.user {
      background: #2563eb;
      color: #fff;
      border-top-right-radius: 4px;
    }
    .cw-bubble.assistant {
      background: #fff;
      color: #1e293b;
      border: 1px solid rgba(203,213,225,.7);
      border-top-left-radius: 4px;
    }

    /* ── Typing Indicator ── */
    #cw-typing {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    #cw-typing-dots {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      border-top-left-radius: 4px;
      padding: 12px 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
    }
    .cw-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: #94a3b8;
      animation: cw-bounce 1.4s ease-in-out infinite;
    }
    .cw-dot:nth-child(1) { animation-delay: -0.3s; }
    .cw-dot:nth-child(2) { animation-delay: -0.15s; }
    @keyframes cw-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* ── Input Footer ── */
    #cw-footer {
      border-top: 1px solid #e2e8f0;
      background: #fff;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      z-index: 10;
    }
    #cw-input {
      flex: 1;
      border-radius: 12px;
      background: #f1f5f9;
      border: none;
      outline: none;
      padding: 10px 16px;
      font-size: 12px;
      color: #1e293b;
      transition: background .15s, box-shadow .15s;
      font-family: inherit;
    }
    #cw-input::placeholder { color: #94a3b8; }
    #cw-input:focus { background: #fff; box-shadow: 0 0 0 1px #3b82f6; }
    #cw-send {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: #2563eb;
      border: none;
      cursor: pointer;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(37,99,235,.3);
      transition: background .15s, transform .1s;
      flex-shrink: 0;
    }
    #cw-send:hover { background: #1d4ed8; }
    #cw-send:active { transform: scale(0.95); }
    #cw-send svg { width: 16px; height: 16px; }

    @media (max-width: 480px) {
      #cw-window { width: calc(100vw - 20px); }
      #cw-chatbot-root { right: 10px; bottom: 10px; }
    }
  `;
  document.head.appendChild(style);

  // ── SVG Icons ──────────────────────────────────────────────────────────────
  const icons = {
    car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/><rect x="14" y="11" width="8" height="10" rx="1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
    msg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    x:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    wifioff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  };

  // ── Build DOM ──────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'cw-chatbot-root';

  root.innerHTML = `
    <!-- Chat Window -->
    <div id="cw-window" class="cw-hidden">
      <!-- Header -->
      <div id="cw-header">
        <div id="cw-header-left">
          <div id="cw-avatar">${icons.car}</div>
          <div>
            <div id="cw-header-title">CarWash AI Support</div>
            <div id="cw-status">
              <span class="cw-dot-wrap">
                <span class="cw-dot-ping"></span>
                <span class="cw-dot-solid"></span>
              </span>
              <span id="cw-status-text">Online Agent</span>
            </div>
          </div>
        </div>
        <div id="cw-header-actions">
          <button class="cw-icon-btn" id="cw-clear-btn" title="Clear Conversation">${icons.trash}</button>
          <button class="cw-icon-btn" id="cw-close-btn" title="Close Chat">${icons.x}</button>
        </div>
      </div>

      <!-- Messages -->
      <div id="cw-messages">
        <div id="cw-empty">
          <div id="cw-empty-icon">${icons.car}</div>
          <p id="cw-empty-title">Welcome to CarWash Express!</p>
          <p id="cw-empty-sub">Ask me anything about wash plans, pricing, or bookings.</p>
          <div id="cw-suggestions">
            <button class="cw-suggestion-btn">🏎️ Full Body Wash Price?</button>
            <button class="cw-suggestion-btn">📅 Book an Appointment</button>
            <button class="cw-suggestion-btn">✨ Ceramic Coating Details</button>
            <button class="cw-suggestion-btn">📍 Where is your workshop?</button>
          </div>
        </div>
      </div>

      <!-- Footer Input -->
      <div id="cw-footer">
        <input id="cw-input" type="text" placeholder="Type your message..." autocomplete="off" />
        <button id="cw-send">${icons.send}</button>
      </div>
    </div>

    <!-- FAB -->
    <button id="cw-fab">
      <span id="cw-fab-icon">${icons.msg}</span>
      <span id="cw-fab-badge">1</span>
    </button>
  `;

  document.body.appendChild(root);

  // ── Element Refs ───────────────────────────────────────────────────────────
  const win        = document.getElementById('cw-window');
  const fab        = document.getElementById('cw-fab');
  const fabIcon    = document.getElementById('cw-fab-icon');
  const fabBadge   = document.getElementById('cw-fab-badge');
  const msgArea    = document.getElementById('cw-messages');
  const emptyState = document.getElementById('cw-empty');
  const inputEl    = document.getElementById('cw-input');
  const sendBtn    = document.getElementById('cw-send');
  const clearBtn   = document.getElementById('cw-clear-btn');
  const closeBtn   = document.getElementById('cw-close-btn');
  const statusEl   = document.getElementById('cw-status');
  const statusText = document.getElementById('cw-status-text');

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen         = false;
  let isConnected    = false;
  let isTyping       = false;
  let messages       = [];
  let streamingId    = null;
  let ws             = null;
  let reconnectTimer = null;

  // ── Toggle Open/Close ──────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.remove('cw-hidden');
    win.classList.add('cw-visible');
    fabIcon.innerHTML = icons.x;
    fabBadge.style.display = 'none';
    inputEl.focus();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('cw-visible');
    win.classList.add('cw-hidden');
    fabIcon.innerHTML = icons.msg;
  }

  fab.addEventListener('click', function () {
    isOpen ? closeChat() : openChat();
  });
  closeBtn.addEventListener('click', closeChat);

  // ── Render Messages ────────────────────────────────────────────────────────
  function renderMessages() {
    if (messages.length === 0) {
      emptyState.style.display = 'flex';
      // remove all bubble rows
      Array.from(msgArea.querySelectorAll('.cw-bubble-row, #cw-typing')).forEach(function (el) { el.remove(); });
      return;
    }
    emptyState.style.display = 'none';

    // Sync DOM with messages array
    messages.forEach(function (msg) {
      let el = msgArea.querySelector('[data-msg-id="' + msg.id + '"]');
      if (!el) {
        el = document.createElement('div');
        el.className = 'cw-bubble-row ' + msg.role;
        el.setAttribute('data-msg-id', msg.id);
        const bubble = document.createElement('div');
        bubble.className = 'cw-bubble ' + msg.role;
        el.appendChild(bubble);
        // Insert before typing indicator if present, else append
        const typingEl = document.getElementById('cw-typing');
        if (typingEl) msgArea.insertBefore(el, typingEl);
        else msgArea.appendChild(el);
      }
      const bubble = el.querySelector('.cw-bubble');
      if (bubble) bubble.textContent = msg.content;
    });

    // Remove stale message elements
    Array.from(msgArea.querySelectorAll('.cw-bubble-row')).forEach(function (el) {
      const id = el.getAttribute('data-msg-id');
      if (!messages.find(function (m) { return m.id === id; })) {
        el.remove();
      }
    });

    scrollToBottom();
  }

  function setTyping(val) {
    isTyping = val;
    let typingEl = document.getElementById('cw-typing');
    if (val && !typingEl) {
      typingEl = document.createElement('div');
      typingEl.id = 'cw-typing';
      typingEl.innerHTML = `<div id="cw-typing-dots"><span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span></div>`;
      msgArea.appendChild(typingEl);
      scrollToBottom();
    } else if (!val && typingEl) {
      typingEl.remove();
    }
  }

  function scrollToBottom() {
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  // ── Clear ──────────────────────────────────────────────────────────────────
  clearBtn.addEventListener('click', function () {
    messages = [];
    streamingId = null;
    setTyping(false);
    renderMessages();
  });

  // ── Suggestion Chips ───────────────────────────────────────────────────────
  document.querySelectorAll('.cw-suggestion-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendMessage(btn.textContent);
    });
  });

  // ── Connection Status UI ───────────────────────────────────────────────────
  function setConnected(val) {
    isConnected = val;
    if (val) {
      statusEl.classList.remove('offline');
      statusText.textContent = 'Online Agent';
      statusEl.querySelector('.cw-dot-wrap').style.display = '';
    } else {
      statusEl.classList.add('offline');
      statusEl.querySelector('.cw-dot-wrap').style.display = 'none';
      statusText.innerHTML = `${icons.wifioff} Reconnecting...`;
    }
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────
  function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(API.WS_CHAT);

    ws.onopen = function () {
      setConnected(true);
    };

    ws.onclose = function (e) {
      setConnected(false);
      setTyping(false);
      if (e.code !== 4003) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = function () {
      setConnected(false);
    };

    ws.onmessage = function (event) {
      try {
        var frame = JSON.parse(event.data);

        if (frame.type === 'chunk') {
          messages = messages.map(function (msg) {
            if (msg.id === streamingId) {
              return { id: msg.id, role: msg.role, content: msg.content + frame.data, isStreaming: true };
            }
            return msg;
          });
          renderMessages();
        } else if (frame.type === 'done') {
          messages = messages.map(function (msg) {
            if (msg.id === streamingId) {
              return { id: msg.id, role: msg.role, content: msg.content, isStreaming: false };
            }
            return msg;
          });
          streamingId = null;
          setTyping(false);
          renderMessages();
        } else if (frame.type === 'error') {
          streamingId = null;
          setTyping(false);
          messages.push({ id: 'err-' + Date.now(), role: 'assistant', content: '⚠️ ' + frame.data });
          renderMessages();
        }
      } catch (e) {
        // ignore parse errors
      }
    };
  }

  // ── Send Message ───────────────────────────────────────────────────────────
  function sendMessage(text) {
    var trimmed = (text || '').trim();
    if (!trimmed) return;

    var userMsg = { id: 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2), role: 'user', content: trimmed };
    messages.push(userMsg);

    var aiId = 'a-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    streamingId = aiId;
    messages.push({ id: aiId, role: 'assistant', content: '', isStreaming: true });
    setTyping(true);
    renderMessages();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
      setTimeout(function () { sendMessage(text); }, 1000);
      // remove the optimistic messages we just added since we'll retry
      messages = messages.filter(function (m) { return m.id !== userMsg.id && m.id !== aiId; });
      streamingId = null;
      setTyping(false);
      renderMessages();
      return;
    }

    ws.send(JSON.stringify({
      token:        TOKEN,
      origin:       window.location.hostname,
      session_uuid: SESSION_UUID,
      message:      trimmed,
    }));
  }

  // ── Input & Send ───────────────────────────────────────────────────────────
  function handleSend() {
    var text = inputEl.value;
    if (!text.trim()) return;
    sendMessage(text);
    inputEl.value = '';
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // ── Validate & Boot ────────────────────────────────────────────────────────
  (function init() {
    fetch(API.VALIDATE, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + TOKEN,
      },
      body: JSON.stringify({ origin: window.location.hostname }),
    })
    .then(function (res) {
      if (res.ok) {
        root.style.display = '';
        connect();
      } else {
        console.warn('[CarWash Chatbot] Token/domain invalid — widget hidden');
        root.style.display = 'none';
      }
    })
    .catch(function () {
      // Dev fallback — show anyway if backend unreachable
      console.warn('[CarWash Chatbot] Backend unreachable — showing in dev mode');
      root.style.display = '';
      connect();
    });
  })();

})();