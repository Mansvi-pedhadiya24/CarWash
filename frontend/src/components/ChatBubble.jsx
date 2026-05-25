import ReactMarkdown from 'react-markdown'

function cleanContent(text) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*/gi, '')
    .trim()
}

export function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const content = isUser ? message.content : cleanContent(message.content)

  if (!content && !isUser) return null

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
          isUser
            ? 'bg-red-600 text-white rounded-tr-none'
            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:font-semibold">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0 whitespace-pre-wrap">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-xs">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-slate-100 rounded px-1 text-[11px] font-mono">{children}</code>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}