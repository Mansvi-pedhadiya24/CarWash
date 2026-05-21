import { useState, useEffect } from 'react'
import { API, CONFIG } from '@/lib/config'

export function useValidate() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(API.VALIDATE, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${CONFIG.TOKEN}`,
          },
          body: JSON.stringify({
            origin: window.location.hostname,
          }),
        })

        if (res.ok) {
          setStatus('valid')
        } else {
          setStatus('invalid')
          console.warn('[Chatbot] Token/domain invalid — chatbot hidden')
        }
      } catch {
        // Network error — development ma show karo
        console.warn('[Chatbot] Backend unreachable — showing anyway in dev')
        setStatus('valid')
      }
    }

    validate()
  }, [])

  return { status, isValid: status === 'valid', isLoading: status === 'loading' }
}