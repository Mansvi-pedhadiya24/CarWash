// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// config.js
// Kaam: Backend API endpoints ane tokens manage કરવા માટે
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE_URL = "http://127.0.0.1:8000" 

export const API = {
  VALIDATE: `${BASE_URL}/api/v1/validate`,
  WS_CHAT: `${BASE_URL}/api/v1/ws/chat`,
   
}

export const CONFIG = {
  TOKEN: "5d17c26d89afca2fb7c5e6a10465654d2c6fe0e300b3e198d516196307724643", 
}