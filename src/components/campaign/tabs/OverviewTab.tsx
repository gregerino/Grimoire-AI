import { useState, useEffect, useCallback } from 'react'
import { Shield, Swords, MapPin, ScrollText, RefreshCw, Loader2, Link, Unlink, ExternalLink } from 'lucide-react'
import { getCharacterSheet, syncCharacterFromDndb, deleteCharacterSheet } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
}

export function OverviewTab({ campaign }: Props) {
  const [dndbId, setDndbId] = useState<string | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const [dndbUrl, setDndbUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchDndbStatus = useCallback(async () => {
    setLoadingSheet(true)
    try {
      const { character } = await getCharacterSheet(campaign.id)
      setDndbId(character?.dndbeyondId ?? null)
    } catch {
      setDndbId(null)
    }
    setLoadingSheet(false)
  }, [campaign.id])

  useEffect(() => {
    fetchDndbStatus()
  }, [fetchDndbStatus])

  const handleSync = async (url?: string) => {
    const syncUrl = url || dndbUrl.trim()
    if (!syncUrl && !dndbId) return
    setSyncing(true)
    setError(null)
    try {
      const { character } = await syncCharacterFromDndb(campaign.id, syncUrl || dndbId!)
      setDndbId(character?.dndbeyondId ?? null)
      setShowLinkInput(false)
      setDndbUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synkning misslyckades')
    }
    setSyncing(false)
  }

  const handleUnlink = async () => {
    try {
      await deleteCharacterSheet(campaign.id)
      setDndbId(null)
      setShowUnlinkConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort synkning')
    }
  }

  return (
    <div className="space-y-6">
      {/* Character card */}
      <div className="rounded-xl border border-navy bg-dark-navy p-5">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-gold">Character</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            icon={<Shield className="h-4 w-4 text-gold" />}
            label="Name"
            value={campaign.character_name || '—'}
          />
          <Stat
            icon={<Swords className="h-4 w-4 text-gold" />}
            label="Class"
            value={campaign.character_class || '—'}
          />
          <Stat
            icon={<ScrollText className="h-4 w-4 text-gold" />}
            label="Level"
            value={String(campaign.character_level)}
          />
          <Stat
            icon={<MapPin className="h-4 w-4 text-gold" />}
            label="Setting"
            value={campaign.setting || '—'}
          />
        </div>
      </div>

      {/* D&D Beyond sync */}
      {!loadingSheet && (
        <div className="rounded-xl border border-navy bg-dark-navy p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gold">
              D&D Beyond
            </h3>
            {dndbId && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Synkad
              </span>
            )}
          </div>

          {dndbId ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Karaktären är kopplad till D&D Beyond (ID: {dndbId}).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSync(dndbId)}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gold/20 border border-gold/30 px-3 py-2 text-xs text-gold transition-colors hover:bg-gold/30 disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {syncing ? 'Synkar...' : 'Synka igen'}
                </button>
                <a
                  href={`https://www.dndbeyond.com/characters/${dndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-navy px-3 py-2 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Öppna på D&D Beyond
                </a>
                <button
                  onClick={() => setShowUnlinkConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-navy px-3 py-2 text-xs text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Ta bort synkning
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!showLinkInput ? (
                <div className="text-center py-2">
                  <Link className="mx-auto mb-2 h-6 w-6 text-gray-600" />
                  <p className="mb-3 text-xs text-gray-500">
                    Ingen karaktär kopplad. Synka din karaktär från D&D Beyond för att importera stats, spells och utrustning.
                  </p>
                  <button
                    onClick={() => setShowLinkInput(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold/20 border border-gold/30 px-4 py-2 text-xs text-gold transition-colors hover:bg-gold/30"
                  >
                    <Link className="h-3.5 w-3.5" />
                    Koppla D&D Beyond-karaktär
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="dndbeyond.com/characters/12345"
                      value={dndbUrl}
                      onChange={(e) => setDndbUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSync()}
                      className="flex-1 rounded-lg border border-navy bg-navy/50 px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/50 focus-ring"
                    />
                    <button
                      onClick={() => handleSync()}
                      disabled={syncing || !dndbUrl.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gold/20 border border-gold/30 px-3 py-2 text-sm text-gold transition-colors hover:bg-gold/30 disabled:opacity-50"
                    >
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {syncing ? 'Synkar...' : 'Synka'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] text-gray-600">
                      Karaktären måste vara &quot;Public&quot; på D&D Beyond
                    </p>
                    <button
                      onClick={() => { setShowLinkInput(false); setDndbUrl(''); setError(null) }}
                      className="text-[10px] text-gray-500 hover:text-gray-400"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* Description */}
      {campaign.description && (
        <div className="rounded-xl border border-navy bg-dark-navy p-5">
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-gold">
            Description
          </h3>
          <p className="text-sm leading-relaxed text-gray-400">{campaign.description}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-navy bg-dark-navy p-4 text-center">
          <div className="text-2xl font-bold text-parchment">{campaign.character_level}</div>
          <div className="text-xs text-gray-500">Level</div>
        </div>
        <div className="rounded-xl border border-navy bg-dark-navy p-4 text-center">
          <div className="text-2xl font-bold text-parchment capitalize">{campaign.status}</div>
          <div className="text-xs text-gray-500">Status</div>
        </div>
        <div className="rounded-xl border border-navy bg-dark-navy p-4 text-center">
          <div className="text-2xl font-bold text-parchment">
            {new Date(campaign.created_at).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500">Started</div>
        </div>
      </div>

      <ConfirmDialog
        open={showUnlinkConfirm}
        title="Ta bort synkning"
        message="Karaktärsbladet tas bort permanent och kopplingen till D&D Beyond försvinner. Du kan koppla en ny karaktär efteråt."
        confirmLabel="Ta bort"
        danger
        onConfirm={handleUnlink}
        onCancel={() => setShowUnlinkConfirm(false)}
      />
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-parchment">{value}</div>
      </div>
    </div>
  )
}
