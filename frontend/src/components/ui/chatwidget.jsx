import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { useValidate } from '@/hooks/useValidate'
import { ChatWindow } from '@/components/ChatWindow'

export function ChatWidget() {
  const { isValid, isLoading } = useValidate()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading || !isValid) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window Animation toggled by isOpen */}
      <div
        className={`mb-4 transition-all duration-300 transform origin-bottom-right ${
          isOpen 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <ChatWindow onClose={() => setIsOpen(false)} />
      </div>

      {/* Floating Action Button (Tawk.io style) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all duration-200 hover:bg-red-700 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-200 rotate-0 hover:rotate-90" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6" />
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black ring-2 ring-red-600">
              1
            </span>
          </div>
        )}
      </button>
    </div>
  )
}