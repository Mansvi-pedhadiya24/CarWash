// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// config.ts
// Backend connection settings
// Production ma .env ma set karo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CONFIG = {
  // Backend URL — production ma change karo
  BACKEND_HTTP: import.meta.env.VITE_BACKEND_HTTP || 'http://127.0.0.1:8000',
  BACKEND_WS:   import.meta.env.VITE_BACKEND_WS   || 'ws://127.0.0.1:8000',

  // Domain token — admin thi generate karo
  TOKEN: import.meta.env.VITE_TOKEN || 'devtoken00000000000000000000000000000000000000000000000000000001',
}

// API endpoint URLs
export const API = {
  VALIDATE: `${CONFIG.BACKEND_HTTP}/api/v1/validate`,
  WS_CHAT:  `${CONFIG.BACKEND_WS}/api/v1/ws/chat`,
}