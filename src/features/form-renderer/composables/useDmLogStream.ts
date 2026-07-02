export interface DmLogEntry {
  timestamp:    string
  type:         string
  level?:       string
  message:      string
  syncType?:    string
  countChanged?: number
  countRemoved?: number
}

type LogCallback = (entry: DmLogEntry) => void

function buildEntry(data: Record<string, any>): DmLogEntry {
  const type: string = data.type ?? 'Unknown'
  let message: string = data.message ?? ''

  if (!message) {
    if (type === 'SyncStarted')   message = `Sync started (${data.syncType ?? ''})`
    if (type === 'SyncCompleted') message = `Sync completed (${data.syncType ?? ''})`
    if (type === 'SyncFailed')    message = `Sync failed (${data.syncType ?? ''})`
    if (type === 'SyncFinished') {
      const parts = [`Sync finished (${data.syncType ?? ''})`]
      if (data.countChanged != null) parts.push(`${data.countChanged} changed`)
      if (data.countRemoved != null) parts.push(`${data.countRemoved} removed`)
      message = parts.join(' — ')
    }
  }

  return {
    timestamp:    new Date().toLocaleTimeString(),
    type,
    level:        data.level,
    message,
    syncType:     data.syncType,
    countChanged: data.countChanged,
    countRemoved: data.countRemoved,
  }
}

export function useDmLogStream(serviceBase: string, guid: string | undefined, onEntry: LogCallback): () => void {
  if (!guid) return () => {}

  const url    = `${serviceBase}/api/data-managers/${guid}/logs/stream`
  const source = new EventSource(url)

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      onEntry(buildEntry(data))
    } catch {
      // ignore malformed frames
    }
  }

  source.onerror = () => {
    // EventSource reconnects automatically — no action needed
  }

  return () => source.close()
}
