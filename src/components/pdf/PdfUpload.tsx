import { useState, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { uploadPdf } from '@/lib/api'

interface PdfUploadProps {
  campaignId: string
  userId: string
  onUploadComplete: () => void
}

export function PdfUpload({ campaignId, userId, onUploadComplete }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      setError('Only PDF files are accepted')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      await uploadPdf(selectedFile, campaignId, userId)
      setSelectedFile(null)
      onUploadComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? 'border-gold bg-gold/5'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <Upload className={`mb-3 h-8 w-8 ${isDragging ? 'text-gold' : 'text-gray-500'}`} />
        <p className="mb-1 text-sm font-medium text-parchment">
          Drag & drop a PDF here
        </p>
        <p className="mb-3 text-xs text-gray-500">or click to browse</p>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
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
              className="rounded p-1 text-gray-500 hover:bg-navy hover:text-parchment transition-colors"
            >
              <X className="h-4 w-4" />
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

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
