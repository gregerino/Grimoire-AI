import { useEffect, useRef, useCallback } from 'react'
import { Howl, Howler } from 'howler'
import { useAudioStore } from '@/stores/audioStore'
import type { AmbientType, MusicMood, SfxType } from '@/stores/audioStore'

const FADE_MS = 2000

const AMBIENT_PATHS: Record<AmbientType, string> = {
  tavern: '/sounds/ambient/tavern.mp3',
  forest: '/sounds/ambient/forest.mp3',
  dungeon: '/sounds/ambient/dungeon.mp3',
  city: '/sounds/ambient/city.mp3',
  cave: '/sounds/ambient/cave.mp3',
  field: '/sounds/ambient/field.mp3',
  sea: '/sounds/ambient/sea.mp3',
}

const MUSIC_PATHS: Record<MusicMood, string> = {
  exploration: '/sounds/music/exploration.mp3',
  combat: '/sounds/music/combat.mp3',
  tension: '/sounds/music/tension.mp3',
  mystery: '/sounds/music/mystery.mp3',
  rest: '/sounds/music/rest.mp3',
  triumph: '/sounds/music/triumph.mp3',
}

const SFX_PATHS: Record<SfxType, string> = {
  sword_hit: '/sounds/sfx/sword_hit.mp3',
  spell_cast: '/sounds/sfx/spell_cast.mp3',
  door_creak: '/sounds/sfx/door_creak.mp3',
  loot_pickup: '/sounds/sfx/loot_pickup.mp3',
  level_up: '/sounds/sfx/level_up.mp3',
  footsteps_stone: '/sounds/sfx/footsteps_stone.mp3',
  dice_roll: '/sounds/sfx/dice_roll.mp3',
  death: '/sounds/sfx/death.mp3',
}

function createLoop(src: string, volume: number): Howl {
  return new Howl({ src: [src], loop: true, volume: 0, preload: true })
}

export function useAudio() {
  const ambientRef = useRef<Howl | null>(null)
  const musicRef = useRef<Howl | null>(null)
  const ambientKeyRef = useRef<AmbientType | null>(null)
  const musicKeyRef = useRef<MusicMood | null>(null)
  const sfxCacheRef = useRef<Map<string, Howl>>(new Map())

  const resumedRef = useRef(false)

  const store = useAudioStore()
  const {
    masterVolume, ambientVolume, musicVolume, sfxVolume,
    ambientMuted, musicMuted, sfxMuted,
    currentAmbient: storedAmbient, currentMusic: storedMusic,
    unlocked, setUnlocked,
    setCurrentAmbient, setCurrentMusic,
  } = store

  const effectiveAmbient = ambientMuted ? 0 : masterVolume * ambientVolume
  const effectiveMusic = musicMuted ? 0 : masterVolume * musicVolume
  const effectiveSfx = sfxMuted ? 0 : masterVolume * sfxVolume

  useEffect(() => {
    ambientRef.current?.volume(effectiveAmbient)
  }, [effectiveAmbient])

  useEffect(() => {
    musicRef.current?.volume(effectiveMusic)
  }, [effectiveMusic])

  const tryUnlock = useCallback(() => {
    if (unlocked) return
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => setUnlocked())
    } else {
      setUnlocked()
    }
  }, [unlocked, setUnlocked])

  const crossfade = useCallback((
    ref: React.MutableRefObject<Howl | null>,
    newSrc: string | null,
    targetVolume: number,
  ) => {
    const old = ref.current
    if (old) {
      old.fade(old.volume(), 0, FADE_MS)
      const oldHowl = old
      setTimeout(() => { oldHowl.stop(); oldHowl.unload() }, FADE_MS + 100)
    }
    if (!newSrc) {
      ref.current = null
      return
    }
    const howl = createLoop(newSrc, 0)
    ref.current = howl
    howl.once('load', () => {
      howl.play()
      howl.fade(0, targetVolume, FADE_MS)
    })
  }, [])

  const playAmbient = useCallback((type: AmbientType | null) => {
    tryUnlock()
    if (type === ambientKeyRef.current) return
    ambientKeyRef.current = type
    setCurrentAmbient(type)
    crossfade(ambientRef, type ? AMBIENT_PATHS[type] : null, effectiveAmbient)
  }, [crossfade, effectiveAmbient, setCurrentAmbient, tryUnlock])

  const playMusic = useCallback((mood: MusicMood | null) => {
    tryUnlock()
    if (mood === musicKeyRef.current) return
    musicKeyRef.current = mood
    setCurrentMusic(mood)
    crossfade(musicRef, mood ? MUSIC_PATHS[mood] : null, effectiveMusic)
  }, [crossfade, effectiveMusic, setCurrentMusic, tryUnlock])

  const playSfx = useCallback((type: SfxType) => {
    tryUnlock()
    const path = SFX_PATHS[type]
    if (!path) return
    let howl = sfxCacheRef.current.get(type)
    if (!howl) {
      howl = new Howl({ src: [path], volume: effectiveSfx })
      sfxCacheRef.current.set(type, howl)
    } else {
      howl.volume(effectiveSfx)
    }
    howl.play()
  }, [effectiveSfx, tryUnlock])

  const stopAll = useCallback((clearStored = false) => {
    if (ambientRef.current) {
      ambientRef.current.stop()
      ambientRef.current.unload()
      ambientRef.current = null
    }
    if (musicRef.current) {
      musicRef.current.stop()
      musicRef.current.unload()
      musicRef.current = null
    }
    ambientKeyRef.current = null
    musicKeyRef.current = null
    if (clearStored) {
      setCurrentAmbient(null)
      setCurrentMusic(null)
    }
  }, [setCurrentAmbient, setCurrentMusic])

  useEffect(() => {
    if (!unlocked || resumedRef.current) return
    resumedRef.current = true
    if (storedAmbient && !ambientRef.current && !ambientMuted) {
      ambientKeyRef.current = storedAmbient
      crossfade(ambientRef, AMBIENT_PATHS[storedAmbient], effectiveAmbient)
    }
    if (storedMusic && !musicRef.current && !musicMuted) {
      musicKeyRef.current = storedMusic
      crossfade(musicRef, MUSIC_PATHS[storedMusic], effectiveMusic)
    }
  }, [unlocked, storedAmbient, storedMusic, ambientMuted, musicMuted, crossfade, effectiveAmbient, effectiveMusic])

  useEffect(() => {
    return () => {
      ambientRef.current?.unload()
      musicRef.current?.unload()
      sfxCacheRef.current.forEach((h) => h.unload())
    }
  }, [])

  return { playAmbient, playMusic, playSfx, stopAll, tryUnlock }
}
