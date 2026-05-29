(function () {
  'use strict';

  // ── Config from script tag attributes ────────────────────────
  const scriptTag = document.currentScript || document.querySelector('script[data-token]');
  const CONFIG = {
    TOKEN:        scriptTag?.getAttribute('data-token')   || '52a99694e4e521f8e394d0424ba7c547c1040582e331ebd7c40ce35bb3fce4ef',
    BACKEND_HTTP: scriptTag?.getAttribute('data-backend') || 'http://192.168.0.245:8000',
    BACKEND_WS:   scriptTag?.getAttribute('data-ws')     || '',
    TITLE:        scriptTag?.getAttribute('data-title')   || 'CarWash AI Support',
    ACCENT:       scriptTag?.getAttribute('data-color')   || '#eb2525',
  };

  // Live Server અને Production માટે ઓટોમેટિક પ્રોટોકોલ કન્વર્ઝન
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

  // ── Inject Styles (ઓરિજિનલ CSS સ્ક્રીનશોટ્સ મુજબ) ──────────────────
  const accent = CONFIG.ACCENT;
  const styles = `
#__cw_chatbot_root *{
  box-sizing:border-box;
  margin:0;
  padding:0;
  font-family:'Inter','Segoe UI',sans-serif;
}

#__cw_chatbot_root{
  position:fixed;
  right:24px;
  bottom:24px;
  z-index:999999;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
}

/* ─────────────────────────
   FAB BUTTON
───────────────────────── */
#__cw_fab{
  width:64px;
  height:64px;
  border-radius:50%;
  border:none;
  cursor:pointer;
  background:linear-gradient(135deg,#ff1a1a,#e30000);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:
    0 12px 30px rgba(255,0,0,.30),
    0 4px 10px rgba(0,0,0,.15);
  transition:.25s ease;
}

#__cw_fab:hover{
  transform:scale(1.06);
}

#__cw_fab svg{
  width:26px;
  height:26px;
  stroke:white;
}

#__cw_badge{
  position:absolute;
  top:-4px;
  right:-4px;
  width:20px;
  height:20px;
  border-radius:50%;
  background:#f59e0b;
  color:white;
  font-size:11px;
  font-weight:700;
  display:flex;
  align-items:center;
  justify-content:center;
  border:2px solid white;
}

/* ─────────────────────────
   WINDOW
───────────────────────── */
#__cw_window{
  width:390px;
  height:610px;
  margin-bottom:14px;
  border-radius:28px;
  overflow:hidden;
  background:#f8fafc;
  border:1px solid rgba(255,255,255,.5);
  box-shadow:
    0 25px 80px rgba(15,23,42,.18),
    0 10px 25px rgba(15,23,42,.08);
  display:flex;
  flex-direction:column;
  transition:
    transform .28s cubic-bezier(.16,1,.3,1),
    opacity .28s;
}

#__cw_window.cw-hidden{
  transform:scale(.88) translateY(20px);
  opacity:0;
  pointer-events:none;
}

/* ─────────────────────────
   HEADER
───────────────────────── */
#__cw_header{
  background:linear-gradient(135deg,#ff1d1d,#e00000);
  color:white;
  padding:18px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  box-shadow:0 4px 20px rgba(255,0,0,.25);
}

#__cw_header .cw-left{
  display:flex;
  align-items:center;
  gap:14px;
}

#__cw_header .cw-avatar{
  width:52px;
  height:52px;
  border-radius:16px;
  background:rgba(255,255,255,.14);
  backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.18);
  display:flex;
  align-items:center;
  justify-content:center;
}

#__cw_header .cw-avatar svg{
  width:24px;
  height:24px;
  stroke:white;
}

#__cw_header .cw-title{
  font-size:18px;
  font-weight:700;
}

#__cw_header .cw-status{
  margin-top:5px;
  font-size:12px;
  display:flex;
  align-items:center;
  gap:6px;
  color:rgba(255,255,255,.92);
}

#__cw_header .cw-dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#22c55e;
  box-shadow:0 0 0 4px rgba(34,197,94,.18);
}

#__cw_header .cw-dot.offline{
  background:#f87171;
}

#__cw_header .cw-actions{
  display:flex;
  gap:8px;
}

#__cw_header button{
  width:34px;
  height:34px;
  border:none;
  border-radius:10px;
  background:transparent;
  color:rgba(255,255,255,.85);
  cursor:pointer;
  transition:.2s ease;
  display:flex;
  align-items:center;
  justify-content:center;
}

#__cw_header button:hover{
  background:rgba(255,255,255,.12);
  color:white;
}

#__cw_header button svg{
  width:18px;
  height:18px;
}

/* ─────────────────────────
   MESSAGES AREA
───────────────────────── */
#__cw_messages{
  flex:1;
  overflow-y:auto;
  padding:20px 18px;
  background:linear-gradient(180deg,#f8fafc,#f1f5f9);
  display:flex;
  flex-direction:column;
  gap:12px;
}

#__cw_messages::-webkit-scrollbar{
  width:5px;
}

#__cw_messages::-webkit-scrollbar-thumb{
  background:#cbd5e1;
  border-radius:10px;
}

/* ─────────────────────────
   EMPTY SECTION
───────────────────────── */
#__cw_empty{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  flex:1;
  padding:24px;
}

#__cw_empty .cw-icon-wrap{
  width:90px;
  height:90px;
  border-radius:50%;
  background:linear-gradient(180deg,#f1f5f9,#e2e8f0);
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:20px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.8),
    0 10px 25px rgba(0,0,0,.05);
}

#__cw_empty .cw-icon-wrap svg{
  width:40px;
  height:40px;
  stroke:#ff1d1d;
}

#__cw_empty h4{
  font-size:18px;
  font-weight:700;
  color:#0f172a;
}

#__cw_empty p{
  font-size:14px;
  color:#94a3b8;
  margin-top:8px;
  line-height:1.7;
}

/* ─────────────────────────
   QUICK CHIPS BUTTONS
───────────────────────── */
#__cw_chips{
  width:100%;
  max-width:300px;
  display:flex;
  flex-direction:column;
  gap:14px;
  margin-top:24px;
}

.cw-chip{
  background:white;
  border:1px solid #e2e8f0;
  border-radius:18px;
  padding:16px 18px;
  font-size:14px;
  font-weight:600;
  color:#334155;
  text-align:left;
  cursor:pointer;
  transition:.2s ease;
  box-shadow:0 4px 10px rgba(15,23,42,.04);
}

.cw-chip:hover{
  transform:translateY(-2px);
  border-color:#ff1d1d;
  background:#fff5f5;
  color:#e00000;
  box-shadow:0 10px 20px rgba(255,0,0,.08);
}

/* ─────────────────────────
   BUBBLES 
───────────────────────── */
.cw-bubble-wrap{
  display:flex;
  gap:10px;
}

.cw-bubble-wrap.user{
  justify-content:flex-end;
}

.cw-bubble{
  max-width:82%;
  padding:14px 16px;
  border-radius:18px;
  font-size:13.5px;
  line-height:1.7;
  word-break:break-word;
  animation:cwSlide .25s ease;
}

.cw-bubble.user{
  background:linear-gradient(135deg,#ff1d1d,#e00000);
  color:white;
  border-top-right-radius:6px;
  box-shadow:0 10px 20px rgba(255,0,0,.15);
}

/* ઓરિજિનલ વ્હાઇટ બોક્સ કાર્ડ લુક ફોર બોટ */
.cw-bubble.bot{
  background:white;
  color:#0f172a;
  border:1px solid #e2e8f0;
  border-top-left-radius:6px;
  box-shadow:0 4px 10px rgba(15,23,42,.04);
  text-align: center; /* સ્ક્રીનશોટ મુજબ સેન્ટર અલાઈનમેન્ટ */
}

/* લિસ્ટ આઈટમ્સ અને બોલ્ડ ટેક્સ્ટ નું ફોર્મેટિંગ વ્યવસ્થિત રાખવા */
.cw-line {
  display: block;
  margin-bottom: 4px;
}
.cw-line:last-child {
  margin-bottom: 0;
}
.cw-bubble.bot strong {
  font-weight: 700;
}
.cw-bubble.bot em {
  font-style: italic;
}

/* ─────────────────────────
   TYPING
───────────────────────── */
.cw-typing{
  padding:12px 14px;
  border-radius:16px;
  background:white;
  border:1px solid #e2e8f0;
  display:flex;
  align-items:center;
  gap:5px;
  width:fit-content;
}

.cw-typing span{
  width:6px;
  height:6px;
  border-radius:50%;
  background:#94a3b8;
  animation:cwBounce 1.2s infinite;
}

.cw-typing span:nth-child(2){
  animation-delay:.15s;
}

.cw-typing span:nth-child(3){
  animation-delay:.3s;
}

@keyframes cwBounce{
  0%,60%,100%{ transform:translateY(0); }
  30%{ transform:translateY(-5px); }
}

/* ─────────────────────────
   FOOTER
───────────────────────── */
#__cw_footer{
  padding:14px;
  background:white;
  border-top:1px solid #e2e8f0;
  display:flex;
  align-items:center;
  gap:10px;
}

#__cw_input{
  flex:1;
  height:50px;
  border:none;
  border-radius:16px;
  background:#f1f5f9;
  padding:0 18px;
  font-size:14px;
  color:#0f172a;
  outline:none;
  transition:.2s ease;
}

#__cw_input:focus{
  background:white;
  box-shadow:0 0 0 4px rgba(255,0,0,.08);
  border:1px solid #ff1d1d;
}

#__cw_input::placeholder{
  color:#94a3b8;
}

#__cw_send{
  width:48px;
  height:48px;
  border:none;
  border-radius:16px;
  cursor:pointer;
  background:linear-gradient(135deg,#ff1d1d,#e00000);
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 10px 20px rgba(255,0,0,.20);
  transition:.2s ease;
}

#__cw_send:hover{
  transform:translateY(-2px);
}

#__cw_send svg{
  width:18px;
  height:18px;
}

/* ─────────────────────────
   ANIMATION
───────────────────────── */
@keyframes cwSlide{
  from{ opacity:0; transform:translateY(8px); }
  to{ opacity:1; transform:translateY(0); }
}

/* ─────────────────────────
   MOBILE
───────────────────────── */
@media(max-width:440px){
  #__cw_chatbot_root{
    right:12px;
    bottom:12px;
  }
  #__cw_window{
    width:calc(100vw - 24px);
    height:78vh;
  }
}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ── SVG Icons ─────────────────────────────────────────────────
  const icons = {
    car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h1l3-5h12l3 5h1a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/><path d="M5 12h14"/></svg>`,
    msg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    x:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
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
            <button class="cw-chip" data-msg="🏎️ Full car Wash Price?">🏎️ Full car Wash Price?</button>
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

  // ── AI <think> 
  function cleanContent(text) {
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .trim();
  }

  // ── Render 
  function scrollToBottom() {
    setTimeout(() => { msgBox.scrollTop = msgBox.scrollHeight; }, 50);
  }

  function renderMessages() {
    if (messages.length === 0) {
      msgBox.innerHTML = emptyState.outerHTML;
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
      
      const content = isUser ? msg.content : cleanContent(msg.content);
      if (!content && !isUser) return;

      const formattedContent = isUser ? escapeHtml(content) : parseBotMarkdown(content);

      html += `
        <div class="cw-bubble-wrap ${wrapClass} cw-slide-in">
          <div class="cw-bubble ${bubbleClass}">${formattedContent}</div>
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

  // ── ઓરિજિનલ સેન્ટર ડિઝાઇન જાળવી રાખીને ટેક્સ્ટ ફોર્મેટિંગ એન્જિન ──
  function parseBotMarkdown(text) {
    // **બોલ્ડ** ટેક્સ્ટ કન્વર્ટ કરવા
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // *ઈટાલિક* ટેક્સ્ટ કન્વર્ટ કરવા
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // દરેક નવી લાઈનને ઓરિજિનલ સ્ટાઈલમાં રેન્ડર કરવા માટે સ્પ્લિટ કરો
    let lines = html.split('\n');
    let processedLines = lines.map(line => {
      let trimmed = line.trim();
      if (!trimmed) return ''; // ખાલી લાઇન હોય તો સ્કીપ કરો
      return `<span class="cw-line">${line}</span>`;
    });

    return processedLines.filter(l => l !== '').join('');
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

  // Attach Initial Chip Listeners
  root.querySelectorAll('.cw-chip').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
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
      console.warn('[CarWashBot] Backend unreachable — showing in dev mode.');
    }
    connect();
  }

  // ── Kick off ──────────────────────────────────────────────────
  init();
})();