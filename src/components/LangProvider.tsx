'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { Lang, TKeys } from '@/lib/i18n'
import { tx } from '@/lib/i18n'

const LangContext = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKeys) => string
}>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('wf_lang')
    if (saved === 'en' || saved === 'es') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('wf_lang', l)
  }

  function t(key: TKeys) {
    return tx(lang, key)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
