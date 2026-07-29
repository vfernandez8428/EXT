'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, ImageIcon, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

interface InvoiceUploadProps {
  onUploadStart: () => void
  onUploadComplete: () => void
}

export function InvoiceUpload({ onUploadStart, onUploadComplete }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'application/pdf',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no soportado. Use imágenes (JPG, PNG, GIF, WebP) o PDF.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 20MB')
      return
    }

    setIsUploading(true)
    onUploadStart()

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/invoices/extract', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la factura')
      }

      toast.success('Factura procesada exitosamente')
      setSelectedFile(null)
      onUploadComplete()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [onUploadStart, onUploadComplete])

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
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleConfirmUpload = useCallback(() => {
    if (selectedFile) processFile(selectedFile)
  }, [selectedFile, processFile])

  return (
    <Card className="border-2 border-dashed transition-all duration-300 hover:shadow-md">
      <CardContent className="p-6">
        <div
          className={`relative flex flex-col items-center justify-center gap-4 rounded-lg p-8 transition-all duration-200 cursor-pointer ${
            isDragging
              ? 'bg-primary/5 border-2 border-primary/30 scale-[1.02]'
              : 'bg-muted/30 hover:bg-muted/50'
          } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && !selectedFile && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary/50" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Procesando factura con IA...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Extrayendo información del documento
                </p>
              </div>
            </>
          ) : selectedFile ? (
            <>
              <div className="flex items-center gap-3 bg-background rounded-lg border p-4 w-full max-w-sm">
                <div className="flex-shrink-0">
                  {selectedFile.type === 'application/pdf' ? (
                    <FileText className="h-10 w-10 text-red-500" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleConfirmUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  Procesar Factura
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Arrastra tu factura aquí
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  o haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Soporta imágenes (JPG, PNG, GIF, WebP) y PDF
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  )
}
