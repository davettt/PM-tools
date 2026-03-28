import type { SavedDocument } from '../types'

const DB_NAME = 'pm-tools'
const DB_VERSION = 1
const STORE_REVIEWS = 'reviews'
const STORE_PRDS = 'prds'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        db.createObjectStore(STORE_REVIEWS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_PRDS)) {
        db.createObjectStore(STORE_PRDS, { keyPath: 'id' })
      }
    }

    request.onsuccess = event => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = event => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

function getAll(storeName: string): Promise<SavedDocument[]> {
  return openDB().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result as SavedDocument[])
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
      })
  )
}

function putAll(storeName: string, docs: SavedDocument[]): Promise<void> {
  return openDB().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        docs.forEach(doc => store.put(doc))
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      })
  )
}

function putOne(storeName: string, doc: SavedDocument): Promise<void> {
  return openDB().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.put(doc)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      })
  )
}

function deleteOne(storeName: string, id: string): Promise<void> {
  return openDB().then(
    db =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.delete(id)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      })
  )
}

export const reviewsDB = {
  getAll: () => getAll(STORE_REVIEWS),
  putAll: (docs: SavedDocument[]) => putAll(STORE_REVIEWS, docs),
  put: (doc: SavedDocument) => putOne(STORE_REVIEWS, doc),
  delete: (id: string) => deleteOne(STORE_REVIEWS, id),
}

export const prdsDB = {
  getAll: () => getAll(STORE_PRDS),
  putAll: (docs: SavedDocument[]) => putAll(STORE_PRDS, docs),
  put: (doc: SavedDocument) => putOne(STORE_PRDS, doc),
  delete: (id: string) => deleteOne(STORE_PRDS, id),
}
