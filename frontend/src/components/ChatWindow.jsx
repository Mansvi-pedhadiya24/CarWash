import { useEffect, useRef } from 'react'
import { Wifi, WifiOff, Trash2, Send, Car } from 'lucide-react'
import { useWebSocket } from '@/hooks/usewebsocket'
import { ScrollArea } from '@/components/ui/scroll-area' 
// import MessageBubble from '@/components/messagebubble'
import { ChatBubble } from '@/components/ChatBubble'

export function ChatWindow({ onClose }) {
  const { messages, isConnected, isTyping, sendMessage, clearMessages } = useWebSocket()
  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  // ઓટોમેટિક સ્ક્રોલ ડાઉન કરવા માટે
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const handleSend = (e) => {
    e.preventDefault()
    const text = inputRef.current?.value || ''
    if (!text.trim()) return
    sendMessage(text)
    if (inputRef.current) inputRef.current.value = ''
  }

  const suggestions = [
    "🏎️ Full Body Wash Price?",
    "📅 Book an Appointment",
    "✨ Ceramic Coating Details",
    "📍 Where is your workshop?"
  ]

  return (
    <div className="flex h-[560px] w-[380px] flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl border border-slate-200/80 sm:w-[400px]">
      {/* Header Profile Section */}
      <div className="flex items-center justify-between bg-gradient-to-r bg-blue-600 px-4 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <Car className="h-5 w-5 text-blue-100" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide">CarWash AI Support</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-100">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span>Online Agent</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-rose-300" />
                  <span className="text-rose-200 font-medium">Reconnecting...</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={clearMessages}
          title="Clear Conversation"
          className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Main Chat Area */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-[320px] flex-col items-center justify-center text-center px-4">
            <div className="mb-3 rounded-full bg-blue-50 p-3 text-blue-500">
              <Car className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-slate-700">Welcome to CarWash Express!</p>
            <p className="mt-1 text-xs text-slate-400">Ask me anything about wash plans, pricing, or bookings.</p>
            
            {/* Suggestion Chips */}
            <div className="mt-5 grid grid-cols-1 gap-2 w-full">
              {suggestions.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(text)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {/* Live Typing Effect Loader */}
            {isTyping && (
              <div className="flex items-start gap-2.5">
                <div className="flex max-w-[75%] items-center justify-center rounded-2xl bg-white px-4 py-3 text-slate-500 shadow-sm border border-slate-100">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Footer Chat Input Form */}
      <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type your message..."
          className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}