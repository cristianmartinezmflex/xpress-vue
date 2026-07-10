import { Centrifuge } from 'centrifuge'

const CENTRIFUGO_WS_URL = 'ws://localhost:8000/connection/websocket'
const CENTRIFUGO_CHANNEL = 'xpedm.sync-records'

export interface DmLogEntry {
  timestamp: string
  type: string
  level?: string
  message: string
  syncType?: string
  countChanged?: number
  countRemoved?: number
}

type LogCallback = (entry: DmLogEntry) => void

let client: Centrifuge | null = null
const subscribers = new Map<string, Set<LogCallback>>()

function getClient(): Centrifuge {
  if (client) return client

  client = new Centrifuge(CENTRIFUGO_WS_URL, {
    token: '',
    minReconnectDelay: 5000,
    maxReconnectDelay: 60000,
  })

  client.on('error', () => { /* suppress console noise when Centrifugo is not running */ })

  const sub = client.newSubscription(CENTRIFUGO_CHANNEL)

  sub.on('publication', ({ data }) => {
    if (!data) return
    const dmGuid: string | undefined = data.dmGuid?.toLowerCase()
    const entry = buildEntry(data)

    if (dmGuid) {
      subscribers.get(dmGuid)?.forEach(cb => cb(entry))
    }
    subscribers.get('*')?.forEach(cb => cb(entry))
  })

  sub.subscribe()
  client.connect()

  return client
}

function buildEntry(data: Record<string, any>): DmLogEntry {
  const now = new Date()
  const timestamp = now.toLocaleTimeString()
  const type: string = data.type ?? 'Unknown'

  let message = data.message ?? ''

  if (!message) {
    if (type === 'SyncStarted')   message = `Sync started (${data.syncType ?? ''})`
    if (type === 'SyncCompleted') message = `Sync completed (${data.syncType ?? ''})`
    if (type === 'SyncFailed')    message = `Sync failed (${data.syncType ?? ''})`
    if (type === 'SyncFinished')  {
      const parts = [`Sync finished (${data.syncType ?? ''})`]
      if (data.countChanged != null) parts.push(`${data.countChanged} changed`)
      if (data.countRemoved != null) parts.push(`${data.countRemoved} removed`)
      message = parts.join(' — ')
    }
  }

  return {
    timestamp,
    type,
    level:        data.level,
    message,
    syncType:     data.syncType,
    countChanged: data.countChanged,
    countRemoved: data.countRemoved,
  }
}

export function useCentrifugo() {
  function subscribe(dmGuid: string | undefined, cb: LogCallback): () => void {
    getClient()
    const key = dmGuid?.toLowerCase() ?? '*'
    if (!subscribers.has(key)) subscribers.set(key, new Set())
    subscribers.get(key)!.add(cb)

    return () => {
      subscribers.get(key)?.delete(cb)
    }
  }

  return { subscribe }
}
