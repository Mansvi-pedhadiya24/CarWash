import { useEffect, useRef } from 'react'
import { WifiOff, Trash2, Send, Car, X } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChatBubble } from '@/components/ChatBubble'

export function ChatWindow({ onClose }) {
  const { messages, isConnected, isTyping, sendMessage, clearMessages } = useWebSocket()
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isTyping])

  const handleSend = (e) => {
    e.preventDefault()
    const text = inputRef.current?.value || ''
    if (!text.trim()) return
    sendMessage(text)
    if (inputRef.current) inputRef.current.value = ''
  }

  const suggestions = [
    "🏎️ Full Car Wash Price?",
    "📅 Book an Appointment",
    "📍 Where is your workshop?"
  ]

  const suggestionClick = (text) => {
    if (text.includes("Full Car Wash Price")) {
      window.open('/CarWash_Pricing.pdf', '_blank')
      return
    }
    sendMessage(text)
  }


return (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      width: '380px',
      overflow: 'hidden',
      borderRadius: '1rem',
      border: '1px solid rgba(226,232,240,0.8)',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      backgroundColor: '#f8fafc',
    }}
  >
    {/* Header — fixed height, never shrinks */}
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#d81d1d',
        padding: '14px 16px',
        color: 'white',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Car style={{ width: '20px', height: '20px', color: '#bfdbfe' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.03em' }}>
            CarWash AI Support
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            {isConnected ? (
              <>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: '#10b924', display: 'inline-block',
                }} />
                <span style={{ fontSize: '11px', color: '#bfdbfe' }}>Online Agent</span>
              </>
            ) : (
              <>
                <WifiOff style={{ width: '12px', height: '12px', color: '#fca5a5' }} />
                <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 500 }}>Reconnecting...</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={clearMessages} title="Clear" type="button" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '8px', color: '#bfdbfe',
          }}>
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>
        {onClose && (
          <button onClick={onClose} title="Close" type="button" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '8px', color: '#bfdbfe',
          }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        )}
      </div>
    </div>

    {/* Messages — THIS is the scrollable area, flex: 1 + minHeight: 0 is the key */}
    <div
      style={{
        flex: 1,
        minHeight: 0,          /* CRITICAL — without this flex-1 won't scroll */
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {messages.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '16px',
        }}>
          <div style={{
            marginBottom: '12px', padding: '12px',
            borderRadius: '50%', backgroundColor: '#eff6ff',
            color: '#d81d1d',
          }}>
            <Car style={{ width: '32px', height: '32px' }} />
          </div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#334155' }}>
            Welcome to CarWash Express!
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
            Ask me anything about wash plans, pricing, or bookings.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
            {suggestions.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(text)}
                style={{
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: '12px', padding: '10px 12px',
                  textAlign: 'left', fontSize: '12px', fontWeight: 500,
                  color: '#475569', cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                background: 'white', border: '1px solid #f1f5f9',
                borderRadius: '16px', borderTopLeftRadius: '4px',
                padding: '10px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {['-0.3s', '-0.15s', '0s'].map((delay, i) => (
                  <span key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: '#94a3b8',
                    display: 'inline-block',
                    animation: `bounce 1.2s ease-in-out ${delay} infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Scroll anchor — always rendered, always at bottom */}
          <div ref={bottomRef} style={{ height: '1px', flexShrink: 0 }} />
        </>
      )}
    </div>

    {/* Footer — fixed height, never shrinks */}
    <form
      onSubmit={handleSend}
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: 'white',
        zIndex: 10,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Type your message..."
        style={{
          flex: 1,
          borderRadius: '12px',
          backgroundColor: '#f1f5f9',
          border: 'none',
          outline: 'none',
          padding: '10px 16px',
          fontSize: '12px',
          color: '#1e293b',
        }}
      />
      <button
        type="submit"
        style={{
          width: '36px', height: '36px', flexShrink: 0,
          borderRadius: '12px', backgroundColor: '#d81d1d',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
      >
        <Send style={{ width: '16px', height: '16px', color: 'white' }} />
      </button>
    </form>

    <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
  </div>
)
}
