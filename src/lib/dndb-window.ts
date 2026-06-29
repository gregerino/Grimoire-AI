const STORAGE_KEY = 'grimoire-dndb-window'

interface WindowState {
  w: number
  h: number
  x: number
  y: number
}

function loadWindowState(): WindowState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.w >= 400 && parsed.h >= 300) return parsed
  } catch { /* ignore */ }
  return null
}

function saveWindowState(x: number, y: number, w: number, h: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y, w, h }))
}

export function openDndbSheet(characterId: string) {
  const saved = loadWindowState()
  const w = saved?.w ?? 800
  const h = saved?.h ?? 700
  const x = saved?.x ?? Math.floor((window.screenX + window.innerWidth / 2) - w / 2)
  const y = saved?.y ?? Math.floor((window.screenY + window.innerHeight / 2) - h / 2)
  const popup = window.open(
    `https://www.dndbeyond.com/characters/${characterId}`,
    'dndbeyond-sheet',
    `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes`,
  )
  if (popup) {
    const interval = setInterval(() => {
      if (popup.closed) { clearInterval(interval); return }
      try {
        saveWindowState(popup.screenX, popup.screenY, popup.outerWidth, popup.outerHeight)
      } catch { /* cross-origin */ }
    }, 2000)
  }
}
