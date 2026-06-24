import { useState, useEffect, useCallback } from 'react'
import { FileText, Trash2, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { listPdfs, deletePdf } from '@/lib/api'
import { PdfUpload } from './PdfUpload'
import type { Pdf } from '@/types/database'

interface PdfLibraryProps {
  campaignId: string
  userId: string
}

const statusConfig = {
  processing: { icon: Loader2, label: 'Processing...', className: 'text-yellow-400 animate-spin' },
  indexed: { icon: CheckCircle, label: 'Indexed', className: 'text-green-400' },
  error: { icon: AlertCircle, label: 'Error', className: 'text-red-400' },
}

export function PdfLibrary({ campaignId, userId }: PdfLibraryProps) {
  const [pdfs, setPdfs] = useState<Pdf[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPdfs = useCallback(async () => {
    try {
      const { pdfs: data } = await listPdfs(campaignId)
      setPdfs(data)
    } catch (err) {
      console.error('Failed to fetch PDFs:', err)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchPdfs()
  }, [fetchPdfs])

  // Poll for status updates while any PDF is processing
  useEffect(() => {
    const hasProcessing = pdfs.some((p) => p.status === 'processing')
    if (!hasProcessing) return

    const interval = setInterval(fetchPdfs, 3000)
    return () => clearInterval(interval)
  }, [pdfs, fetchPdfs])

  const handleDelete = async (pdfId: string) => {
    try {
      await deletePdf(pdfId)
      setPdfs((prev) => prev.filter((p) => p.id !== pdfId))
    } catch (err) {
      console.error('Failed to delete PDF:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-parchment">PDF Library</h2>
        <button
          onClick={fetchPdfs}
          className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-parchment transition-colors focus-ring"
          aria-label="Uppdatera PDF-lista"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <PdfUpload
        campaignId={campaignId}
        userId={userId}
        onUploadComplete={fetchPdfs}
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : pdfs.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          No PDFs uploaded yet. Upload a rulebook or adventure module to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {pdfs.map((pdf) => {
            const status = statusConfig[pdf.status]
            const StatusIcon = status.icon

            return (
              <div
                key={pdf.id}
                className="flex items-center justify-between rounded-lg border border-navy bg-dark-navy p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gold" />
                  <div>
                    <p className="text-sm font-medium text-parchment">{pdf.filename}</p>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3 w-3 ${status.className}`} />
                      <span className="text-xs text-gray-500">{status.label}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(pdf.id)}
                  className="rounded p-1.5 text-gray-500 hover:bg-navy hover:text-red-400 transition-colors focus-ring"
                  aria-label={`Radera ${pdf.filename}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
