import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, X, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface UploadedFile {
  name: string
  size: number
}

export function RulebookStep({ onNext, onBack, onSkip }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (fileList: FileList) => {
    const pdfs = Array.from(fileList)
      .filter((f) => f.type === 'application/pdf')
      .map((f) => ({ name: f.name, size: f.size }))
    setFiles((prev) => [...prev, ...pdfs])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6 py-8"
    >
      <h2 className="font-display text-2xl font-bold text-parchment mb-2">
        Ladda upp dina regelböcker
      </h2>
      <p className="font-body text-stone mb-2">
        Grimoire läser dina PDF:er och använder dem som referens under spelet.
      </p>

      <div className="rounded-lg border border-navy bg-midnight/50 p-4 mb-8">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-gold mt-0.5 shrink-0" />
          <div>
            <p className="font-ui text-sm text-parchment-dark font-medium mb-1">
              Hur fungerar det?
            </p>
            <p className="font-body text-xs text-stone leading-relaxed">
              När du laddar upp en regelbok (t.ex. Player's Handbook) delar Grimoire upp den i
              sökbara delar. Under spelets gång kan AI:n slå upp regler, besvärjelser och monster
              direkt från dina böcker — som en spelledare med perfekt minne.
            </p>
          </div>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
          py-12 cursor-pointer transition-all duration-200
          ${dragging
            ? 'border-gold bg-gold/5'
            : 'border-navy hover:border-mist bg-dark-navy/50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Upload className={`h-8 w-8 mb-3 ${dragging ? 'text-gold' : 'text-mist'}`} />
        <p className="font-ui text-sm text-parchment-dark mb-1">
          Dra och släpp PDF:er här
        </p>
        <p className="font-body text-xs text-stone">
          Eller klicka för att välja filer
        </p>
      </div>

      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 space-y-2"
        >
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-navy bg-dark-navy p-3"
            >
              <FileText className="h-4 w-4 text-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm text-parchment truncate">{file.name}</p>
                <p className="font-ui text-xs text-stone">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="rounded-md p-1 text-stone hover:text-parchment hover:bg-navy transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Tillbaka
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onSkip} className="text-stone">
            Hoppa över
          </Button>
          <Button onClick={onNext}>
            {files.length > 0 ? 'Fortsätt' : 'Fortsätt utan böcker'}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
