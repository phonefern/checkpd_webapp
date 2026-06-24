'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface QaQrScannerProps {
  open: boolean
  onClose: () => void
  /**
   * Fired with the raw decoded text on each successful scan.
   * Return true to accept (scanner closes); return false to keep scanning
   * (e.g. the QR is not a patient reference).
   */
  onDecode: (text: string) => boolean
}

const REGION_ID = 'qa-qr-reader-region'

export default function QaQrScanner({ open, onClose, onDecode }: QaQrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const decodedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [rejected, setRejected] = useState(false)

  useEffect(() => {
    if (!open) return

    decodedRef.current = false
    setError(null)
    setRejected(false)

    // getUserMedia requires a secure context (https or localhost).
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('insecure')
      return
    }

    let cancelled = false
    setStarting(true)

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(REGION_ID, { verbose: false })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // rear camera on tablets
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (decodedRef.current) return
            const accepted = onDecode(decodedText)
            if (accepted) {
              decodedRef.current = true
              onClose()
            } else {
              // not a patient QR — keep scanning, show a brief hint
              setRejected(true)
            }
          },
          () => {
            // per-frame decode failure — ignore (fires constantly until a hit)
          },
        )

        if (cancelled) {
          // dialog closed while starting — tear down immediately
          await stopScanner()
        }
      } catch (err) {
        if (cancelled) return
        const name = (err as { name?: string })?.name
        if (name === 'NotAllowedError' || name === 'NotFoundError' || name === 'NotReadableError') {
          setError('camera')
        } else {
          setError('camera')
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    start()

    return () => {
      cancelled = true
      void stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const stopScanner = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    scannerRef.current = null
    try {
      // stop() releases the MediaStream tracks (camera LED off)
      if (scanner.isScanning) await scanner.stop()
      scanner.clear()
    } catch {
      // already stopped / never started — safe to ignore
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-blue-600" />
            สแกน QR ผู้ป่วย
          </DialogTitle>
          <DialogDescription>เล็งกรอบกล้องไปที่ QR บนใบรายงานเพื่อเปิดข้อมูลผู้ป่วย</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            <p className="text-sm font-medium text-amber-800">
              {error === 'insecure'
                ? 'ต้องใช้งานผ่าน https จึงจะเปิดกล้องได้'
                : 'ไม่สามารถเปิดกล้องได้ (ถูกปฏิเสธสิทธิ์ หรือไม่พบกล้อง)'}
            </p>
            <p className="text-xs text-amber-700">
              พิมพ์ <span className="font-semibold">Patient ID</span> ในช่องค้นหาแทนได้ครับ
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            {/* html5-qrcode injects the <video> here */}
            <div id={REGION_ID} className="mx-auto w-full [&_video]:rounded-lg" />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                กำลังเปิดกล้อง…
              </div>
            )}
            {rejected && (
              <div className="absolute inset-x-0 bottom-0 bg-red-600/90 py-1.5 text-center text-xs font-medium text-white">
                QR นี้ไม่ใช่รหัสผู้ป่วย — ลองสแกนใหม่
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
