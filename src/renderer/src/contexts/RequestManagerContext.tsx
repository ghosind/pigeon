import React, { useEffect, useRef, useState } from 'react'
import { Request } from '@shared/types'
import { RequestManagerContext, HistoryItem, OpenHandler } from './useRequestManager'

const KEY_COLLECTIONS = 'pigeon:collections'
const KEY_HISTORY = 'pigeon:history'

function loadCollections(): Request[] {
  try {
    const raw = localStorage.getItem(KEY_COLLECTIONS)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error(e)
    return []
  }
}

function saveCollections(list: Request[]): void {
  try {
    localStorage.setItem(KEY_COLLECTIONS, JSON.stringify(list))
  } catch (e) {
    console.error(e)
  }
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error(e)
    return []
  }
}

function saveHistory(list: HistoryItem[]): void {
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(list))
  } catch (e) {
    console.error(e)
  }
}

export const RequestManagerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [collections, setCollections] = useState<Request[]>(() => loadCollections())
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory())
  const openHandler = useRef<OpenHandler | null>(null)

  useEffect(() => saveCollections(collections), [collections])
  useEffect(() => saveHistory(history), [history])

  const addCollection = (c: Request): void => setCollections((s) => [...s, c])
  const removeCollection = (id: string): void => setCollections((s) => s.filter((x) => x.id !== id))

  const addHistory = (req: Request): void => {
    const item: HistoryItem = {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      request: req,
      timestamp: Date.now()
    }
    setHistory((s) => {
      const next = [item, ...s].slice(0, 200)
      return next
    })
  }

  const openRequest = (req: Request, opts?: { newTab?: boolean }): void => {
    if (openHandler.current) {
      openHandler.current(req, opts)
    }
  }

  const clearHistory = (): void => {
    setHistory([])
    saveHistory([])
  }

  const registerOpenHandler = (h: OpenHandler | null): void => {
    openHandler.current = h
  }

  return (
    <RequestManagerContext.Provider
      value={{
        collections,
        history,
        addCollection,
        removeCollection,
        addHistory,
        clearHistory,
        openRequest,
        registerOpenHandler
      }}
    >
      {children}
    </RequestManagerContext.Provider>
  )
}
