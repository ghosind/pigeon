import React, { useEffect, useRef, useState } from 'react'
import * as uuid from 'uuid'
import { Request, RequestHistory, CollectionNode } from '@shared/types'
import { RequestManagerContext, OpenHandler, OpenRequestOptions } from './useRequestManager'

const KEY_COLLECTIONS = 'pigeon:collections'
const KEY_HISTORY = 'pigeon:history'

function loadCollections(): CollectionNode[] {
  try {
    const raw = localStorage.getItem(KEY_COLLECTIONS)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error(e)
    return []
  }
}

function saveCollections(list: CollectionNode[]): void {
  try {
    localStorage.setItem(KEY_COLLECTIONS, JSON.stringify(list))
  } catch (e) {
    console.error(e)
  }
}

function loadHistory(): RequestHistory[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error(e)
    return []
  }
}

function saveHistory(list: RequestHistory[]): void {
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(list))
  } catch (e) {
    console.error(e)
  }
}

export const RequestManagerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [collections, setCollections] = useState<CollectionNode[]>(() => loadCollections())
  const [history, setHistory] = useState<RequestHistory[]>(() => loadHistory())
  const openHandler = useRef<OpenHandler | null>(null)
  const collectionChangeHandler = useRef<((ids: string[]) => void) | null>(null)

  useEffect(() => saveCollections(collections), [collections])
  useEffect(() => saveHistory(history), [history])

  const addFolder = (title: string, parentId: string | null = null): void => {
    const folder: CollectionNode = { id: uuid.v4(), type: 'folder', title, children: [] }
    if (!parentId) {
      setCollections((s) => [...s, folder])
      return
    }

    const insert = (nodes: CollectionNode[]): CollectionNode[] =>
      nodes.map((n) => {
        if (n.type === 'folder') {
          if (n.id === parentId) return { ...n, children: [...n.children, folder] }
          return { ...n, children: insert(n.children) }
        }
        return n
      })

    setCollections((s) => insert(s))
  }

  const addRequestToFolder = (parentId: string | null, c: Request): void => {
    const storedReq = { ...c, isInCollection: true }
    const item: CollectionNode = { id: c.id, type: 'request', request: storedReq }

    let found = false
    const update = (nodes: CollectionNode[]): CollectionNode[] =>
      nodes.map((n) => {
        if (n.type === 'request') {
          if (n.id === c.id) {
            found = true
            return { ...n, request: storedReq }
          }
          return n
        }

        return { ...n, children: update(n.children) }
      })

    setCollections((s) => {
      const updated = update(s)
      if (found) return updated

      if (!parentId) {
        return [...s, item]
      }

      const insert = (nodes: CollectionNode[]): CollectionNode[] =>
        nodes.map((n) => {
          if (n.type === 'folder') {
            if (n.id === parentId) return { ...n, children: [...n.children, item] }
            return { ...n, children: insert(n.children) }
          }
          return n
        })

      return insert(s)
    })
  }

  const removeNode = (id: string): void => {
    const remove = (nodes: CollectionNode[]): CollectionNode[] =>
      nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.type === 'folder' ? { ...n, children: remove(n.children) } : n))

    setCollections((s) => {
      const newNodes = remove(s)

      const collectRequestIds = (nodes: CollectionNode[], acc: string[] = []): string[] => {
        for (const n of nodes) {
          if (n.type === 'request') {
            acc.push(n.id)
          }
          if (n.type === 'folder') {
            collectRequestIds(n.children, acc)
          }
        }
        return acc
      }

      const oldIds = collectRequestIds(s, [])
      const newIds = collectRequestIds(newNodes, [])
      const removedIds = oldIds.filter((x) => !newIds.includes(x))

      if (removedIds.length && collectionChangeHandler.current) {
        setTimeout(
          () => collectionChangeHandler.current && collectionChangeHandler.current(removedIds),
          0
        )
      }

      return newNodes
    })
  }

  const renameNode = (id: string, newName: string): void => {
    const rename = (nodes: CollectionNode[]): CollectionNode[] =>
      nodes.map((n) => {
        if (n.id === id) {
          if (n.type === 'folder') {
            return { ...n, title: newName }
          }
          const req = { ...n.request, title: newName }
          openRequest(req, { newTab: false, active: false })
          return { ...n, request: req }
        }

        if (n.type === 'folder') {
          return { ...n, children: rename(n.children) }
        }
        return n
      })

    setCollections((s) => rename(s))
  }

  const findNode = (id: string, nodes: CollectionNode[]): CollectionNode | null => {
    for (const n of nodes) {
      if (n.id === id) {
        return n
      }
      if (n.type === 'folder') {
        const found = findNode(id, n.children)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  const exportNode = (id: string): void => {
    try {
      const node = findNode(id, collections)
      if (!node) {
        return
      }
      const text = JSON.stringify(node, null, 2)
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `collection-${id}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const addHistory = (req: Request): void => {
    const saveResponse = (() => {
      try {
        const v = localStorage.getItem('pigeon:history.saveResponse')
        return v === null ? true : v === 'true'
      } catch (e: unknown) {
        console.error('Failed to read history.saveResponse setting', e)
        return true
      }
    })()

    const item: RequestHistory = {
      id: uuid.v4(),
      requestId: req.id,
      type: req.type,
      request: req.request,
      response: saveResponse ? req.response : undefined,
      timestamp: Date.now()
    }
    setHistory((s) => {
      const next = [item, ...s]
      return next
    })
  }

  const openRequest = (req: Request, opts?: OpenRequestOptions): void => {
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

  const registerCollectionChangeHandler = (h: ((ids: string[]) => void) | null): void => {
    collectionChangeHandler.current = h
  }

  return (
    <RequestManagerContext.Provider
      value={{
        collections,
        history,
        addFolder,
        addRequestToFolder,
        removeNode,
        renameNode,
        exportNode,
        addHistory,
        clearHistory,
        openRequest,
        registerOpenHandler,
        registerCollectionChangeHandler
      }}
    >
      {children}
    </RequestManagerContext.Provider>
  )
}
