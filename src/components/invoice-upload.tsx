'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, ImageIcon, Loader2, X, Check, AlertCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'

type FileStatus = 'pending' | 'uploading' | 'success' | 'error'

interface FileEntry {
  file: File
  status: FileStatus
  error?: string
}

interface InvoiceUploadProps {
  onUploadComplete: () => void
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function InvoiceUpload({ onUploadComplete }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileQueue, setFileQueue] = useState<FileEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalFiles = fileQueue.length
  const completedFiles = fileQueue.filter(f => f.status === 'success').length
  const hasPending = fileQueue.some(f => f.status === 'pending' || f.status === 'uploading')

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid: FileEntry[] = []
    const invalid: string[] = []
    const oversized: string[] = []

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        invalid.push(file.name)
      } else if (file.size > 20 * 1024 * 1024) {
        oversized.push(file.name)
      } else {
        valid.push({ file, status: 'pending' })
      }
    }

    if (invalid.length > 0) {
      toast.error(`${invalid.length} archivo(s) con formato no soportado`, {
        description: invalid.join(', '),
      })
    }
    if (oversized.length > 0) {
      toast.error(`${oversized.length} archivo(s) superan los 20MB`, {
        description: oversized.join(', '),
      })
    }

    if (valid.length > 0) {
      setFileQueue(prev => [...prev, ...valid])
    }
  }, [])

  const processQueue = useCallback(async () => {
    setIsProcessing(true)

    const pendingEntries = fileQueue
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.status === 'pending')

    let successCount = 0
    let errorCount = 0

    for (const { entry, index } of pendingEntries) {
      setFileQueue(prev => {
        const next = [...prev]
        next[index] = { ...next[index], status: 'uploading' }
        return next
      })

      try {
        const formData = new FormData()
        formData.append('file', entry.file)

        const res = await fetch('/api/invoices/extract', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Error al procesar')
        }

        setFileQueue(prev => {
          const next = [...prev]
          next[index] = { ...next[index], status: 'success' }
          return next
        })
        successCount++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setFileQueue(prev => {
          const next = [...prev]
          next[index] = { ...next[index], status: 'error', error: message }
          return next
        })
        errorCount++
      }
    }

    setIsProcessing(false)

    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount} factura(s) procesada(s) exitosamente`)
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} exitosa(s), ${errorCount} con error`)
    } else if (errorCount > 0) {
      toast.error(`${errorCount} factura(s) no pudieron procesarse`)
    }

    onUploadComplete()
  }, [fileQueue, onUploadComplete])

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
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
  }, [addFiles])

  const removeFile = useCallback((index: number) => {
    setFileQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearQueue = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFileQueue([])
  }, [])

  const progressPercent = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0

  return (
    <Card className="border-2 border-dashed transition-all duration-300 hover:shadow-md">
      <CardContent className="p-6">
        {/* Drop zone — visible when no files or still adding */}
        {(!isProcessing && fileQueue.length === 0) && (
          <div
            className={`flex flex-col items-center justify-center gap-4 rounded-lg p-8 transition-all duration-200 cursor-pointer ${
              isDragging
                ? 'bg-primary/5 border-2 border-primary/30 scale-[1.02]'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Arrastra tus facturas aquí
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                o haz clic para seleccionar archivos
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Soporta imágenes (JPG, PNG, GIF, WebP) y PDF — Puedes seleccionar varios a la vez
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar Archivos
            </Button>
          </div>
        )}

        {/* File queue */}
        {fileQueue.length > 0 && (
          <div className="space-y-4">
            {/* Header with add more button */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {totalFiles} archivo{totalFiles !== 1 ? 's' : ''} seleccionado{totalFiles !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                {!isProcessing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Agregar más
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQueue}
                      className="text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Limpiar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Procesando...</span>
                  <span>{completedFiles} de {totalFiles}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* File list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fileQueue.map((entry, index) => (
                <FileRow
                  key={`${entry.file.name}-${entry.file.size}-${index}`}
                  entry={entry}
                  index={index}
                  onRemove={removeFile}
                  disabled={isProcessing}
                />
              ))}
            </div>

            {/* Also allow drop on the queue area */}
            {!isProcessing && (
              <div
                className={`rounded-lg border-2 border-dashed p-4 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-xs text-muted-foreground">
                  Arrastra más archivos aquí o haz clic para agregar
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={clearQueue}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={processQueue}
                disabled={isProcessing || !hasPending}
                className="flex-1 sm:flex-none"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando {completedFiles}/{totalFiles}...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Procesar {hasPending ? `${fileQueue.filter(f => f.status === 'pending').length} Factura${fileQueue.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}` : 'Facturas'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}

function FileRow({
  entry,
  index,
  onRemove,
  disabled,
}: {
  entry: FileEntry
  index: number
  onRemove: (index: number) => void
  disabled: boolean
}) {
  const { file, status, error } = entry
  const isPdf = file.type === 'application/pdf'

  return (
    <div className={
      `flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        status === 'success' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50' :
        status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' :
        status === 'uploading' ? 'bg-primary/5 border-primary/20' :
        'bg-background'
      }`
    }>
      <div className="flex-shrink-0">
        {status === 'success' ? (
          <div className="h-9 w-9 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : status === 'error' ? (
          <div className="h-9 w-9 rounded-md bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        ) : status === 'uploading' ? (
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        ) : (
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
            {isPdf ? (
              <FileText className="h-4 w-4 text-red-500" />
            ) : (
              <ImageIcon className="h-4 w-4 text-emerald-500" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          {status === 'success' && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Procesada</span>
          )}
          {status === 'error' && error && (
            <span className="text-xs text-red-600 dark:text-red-400 truncate max-w-[200px]" title={error}>{error}</span>
          )}
          {status === 'uploading' && (
            <span className="text-xs text-primary font-medium">Procesando...</span>
          )}
        </div>
      </div>

      {status !== 'success' && status !== 'error' && !disabled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
