import { useRef, useState, useCallback, useEffect } from 'react'
import { API, CONFIG } from '@/lib/config'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const SESSION_UUID = generateUUID()

export function useWebSocket() {
  const wsRef          = useRef(null)
  const reconnectTimer   = useRef()
  const streamingIdRef   = useRef(null) 

  const [messages,    setMessages]    = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping,    setIsTyping]    = useState(false)

  // ── WebSocket Connect ─────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(API.WS_CHAT)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('[WS] Connected to CarWash AI Backend')
    }

    ws.onclose = (e) => {
      setIsConnected(false)
      setIsTyping(false)
      console.log('[WS] Disconnected from Backend', e.code)

      if (e.code !== 4003) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data)

        if (frame.type === 'chunk') {
          setMessages((prev) => {
            const streamingId = streamingIdRef.current
            if (!streamingId) return prev

            return prev.map((msg) =>
              msg.id === streamingId
                ? { ...msg, content: msg.content + frame.data, isStreaming: true }
                : msg
            )
          })
        }

        else if (frame.type === 'done') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingIdRef.current
                ? { ...msg, isStreaming: false }
                : msg
            )
          )
          streamingIdRef.current = null
          setIsTyping(false)
        }

        else if (frame.type === 'error') {
          setIsTyping(false)
          streamingIdRef.current = null
          setMessages((prev) => [
            ...prev,
            {
              id:      crypto.randomUUID(),
              role:    'assistant',
              content: `⚠️ ${frame.data}`,
            },
          ])
        }
      } catch {
        
      }
    }
  }, [])

    useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed || !wsRef.current) return

    const userMsg = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMsg])

    const aiMsgId = crypto.randomUUID()
    streamingIdRef.current = aiMsgId
    setMessages((prev) => [
      ...prev,
      { id: aiMsgId, role: 'assistant', content: '', isStreaming: true },
    ])
    setIsTyping(true)

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      connect()
      setTimeout(() => sendMessage(text), 1000)
      return
    }

    wsRef.current.send(
      JSON.stringify({
        token:        CONFIG.TOKEN,
        origin:       window.location.hostname,
        session_uuid: SESSION_UUID,
        message:      trimmed,
      })
    )
  }, [connect])

  const clearMessages = useCallback(() => {
    setMessages([])
    streamingIdRef.current = null
    setIsTyping(false)
  }, [])

  return { messages, isConnected, isTyping, sendMessage, clearMessages }
}