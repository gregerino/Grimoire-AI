import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Trash2, Loader2, CheckCircle, AlertCircle, RefreshCw, Upload, FileText, X } from 'lucide-react'
import { listRulebooks, deleteRulebook, uploadRulebook } from '@/lib/api'
import { fantasyErrors, toFantasyError } from '@/lib/errors'
import type { Rulebook } from '@/types/database'

interface RulebookLibraryProps {
  userId: string
}

const statusConfig = {
  processing: { icon: Loader2, label: 'Processing...', className: 'text-yellow-400 animate-spin' },
  indexed: { icon: CheckCircle, label: 'Indexed', className: 'text-green-400' },
  error: { icon: AlertCircle, label: 'Error', className: 'text-red-400' },
}

export function RulebookLibrary({ userId }: RulebookLibraryProps) {
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRulebooks = useCallback(async () => {
    try {
      const { rulebooks: data } = await listRulebooks(userId)
      setRulebooks(data)
    } catch (err) {
      console.error('Failed to fetch rulebooks:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchRulebooks()
  }, [fetchRulebooks])

  useEffect(() => {
    const hasProcessing = rulebooks.some((r) => r.status === 'processing')
    if (!hasProcessing) return
    const interval = setInterval(fetchRulebooks, 3000)
    return () => clearInterval(interval)
  }, [rulebooks, fetchRulebooks])

  const handleDelete = async (rulebookId: string) => {
    try {
      await deleteRulebook(rulebookId)
      setRulebooks((prev) => prev.filter((r) => r.id !== rulebookId))
    } catch (err) {
      console.error('Failed to delete rulebook:', err)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    try {
      await uploadRulebook(selectedFile, userId)
      setSelectedFile(null)
      fetchRulebooks()
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      setError(`${toFantasyError(err)} [${raw}]`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-parchment">Rulebooks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload D&D rulebooks here once — they'll be available across all your campaigns.
        </p>
      </div>

      <div className="rounded-xl border border-navy bg-dark-navy p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-parchment">Uploaded Rulebooks</h2>
          <button
            onClick={fetchRulebooks}
            className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-parchment transition-colors focus-ring"
            aria-label="Uppdatera regelbokslista"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Upload area */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              setError(null)
              const file = e.dataTransfer.files[0]
              if (file?.type === 'application/pdf') {
                setSelectedFile(file)
              } else {
                setError(fantasyErrors.pdfCorrupt)
              }
            }}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
              isDragging ? 'border-gold bg-gold/5' : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <Upload className={`mb-3 h-8 w-8 ${isDragging ? 'text-gold' : 'text-gray-500'}`} />
            <p className="mb-1 text-sm font-medium text-parchment">
              Drag & drop a rulebook PDF here
            </p>
            <p className="mb-3 text-xs text-gray-500">Player's Handbook, DMG, Monster Manual, etc.</p>
            <input
              type="file"
              accept=".pdf"
              aria-label="Välj regelbok att ladda upp"
              onChange={(e) => {
                setError(null)
                const file = e.target.files?.[0]
                if (file) setSelectedFile(file)
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border border-navy bg-dark-navy p-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gold" />
                <div>
                  <p className="text-sm font-medium text-parchment">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="rounded p-1 text-gray-500 hover:bg-navy hover:text-parchment transition-colors focus-ring"
                  aria-label="Ta bort vald fil"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload & Index'}
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-blood-light">{error}</p>}
        </div>

        {/* Rulebook list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : rulebooks.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No rulebooks uploaded yet. Upload your D&D rulebooks to use them across all campaigns.
          </p>
        ) : (
          <div className="space-y-2">
            {rulebooks.map((rulebook) => {
              const status = statusConfig[rulebook.status]
              const StatusIcon = status.icon

              return (
                <div
                  key={rulebook.id}
                  className="flex items-center justify-between rounded-lg border border-navy bg-gray-900/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-gold" />
                    <div>
                      <p className="text-sm font-medium text-parchment">{rulebook.filename}</p>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-3 w-3 ${status.className}`} />
                        <span className="text-xs text-gray-500">{status.label}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(rulebook.id)}
                    className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-red-400 transition-colors focus-ring"
                    aria-label={`Radera ${rulebook.filename}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
