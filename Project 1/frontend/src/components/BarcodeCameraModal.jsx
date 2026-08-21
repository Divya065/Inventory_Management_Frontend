import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import './BarcodeCameraModal.css'

const READER_ID = 'barcode-camera-reader'

// Product barcodes (1D) — better for shop packets on weak webcams than QR-first defaults
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
]

const pickDefaultCamera = (cameras) => {
  if (!cameras?.length) return null
  const back = cameras.find((c) => /back|rear|environment/i.test(c.label || ''))
  return (back || cameras[cameras.length - 1]).id
}

const scanConfig = {
  fps: 15,
  // Wide region helps blurry laptop webcams catch 1D barcodes
  qrbox: (viewW, viewH) => ({
    width: Math.max(220, Math.floor(viewW * 0.92)),
    height: Math.max(90, Math.floor(viewH * 0.4)),
  }),
  aspectRatio: 1.333,
  disableFlip: false,
}

/**
 * Camera / webcam barcode scanner (Option A).
 * USB keyboard-wedge scanners still work on the text field without this modal.
 */
export default function BarcodeCameraModal({ open, onClose, onDetected }) {
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [cameras, setCameras] = useState([])
  const [cameraId, setCameraId] = useState('')
  const scannerRef = useRef(null)
  const handledRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  // Discover cameras when modal opens
  useEffect(() => {
    if (!open) {
      setCameras([])
      setCameraId('')
      setError('')
      setStarting(false)
      return undefined
    }

    let cancelled = false
    setStarting(true)
    setError('')

    Html5Qrcode.getCameras()
      .then((list) => {
        if (cancelled) return
        if (!list?.length) {
          setError('No camera found. Use a USB barcode scanner or type the code.')
          setStarting(false)
          return
        }
        setCameras(list)
        setCameraId(pickDefaultCamera(list))
      })
      .catch(() => {
        if (cancelled) return
        setError(
          'Could not access camera. Allow permission, or use a USB scanner / type the code.'
        )
        setStarting(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  // Start / restart scanner when camera is chosen
  useEffect(() => {
    if (!open || !cameraId) return undefined

    let cancelled = false
    handledRef.current = false
    setError('')
    setStarting(true)

    const stopScanner = async () => {
      const scanner = scannerRef.current
      scannerRef.current = null
      if (!scanner) return
      try {
        await scanner.stop()
      } catch {
        /* ignore */
      }
      try {
        scanner.clear()
      } catch {
        /* ignore */
      }
    }

    const onSuccess = (decodedText) => {
      if (cancelled || handledRef.current) return
      const code = String(decodedText || '').trim()
      if (!code) return
      handledRef.current = true
      onDetectedRef.current?.(code)
    }

    const start = async () => {
      await stopScanner()
      if (cancelled) return

      const scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: BARCODE_FORMATS,
        verbose: false,
      })
      scannerRef.current = scanner

      try {
        // Prefer higher resolution when the webcam supports it
        await scanner.start(
          { deviceId: { exact: cameraId } },
          {
            ...scanConfig,
            videoConstraints: {
              deviceId: { exact: cameraId },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
            },
          },
          onSuccess,
          () => {}
        )
      } catch {
        if (cancelled) return
        // Fallback: simpler constraints for cheap / locked-down laptop cameras
        try {
          await stopScanner()
          const fallback = new Html5Qrcode(READER_ID, {
            formatsToSupport: BARCODE_FORMATS,
            verbose: false,
          })
          scannerRef.current = fallback
          await fallback.start(cameraId, scanConfig, onSuccess, () => {})
        } catch (err2) {
          if (cancelled) return
          setError(
            err2?.message ||
              'Camera could not start. Hold the barcode closer with good light, or use USB / type the code.'
          )
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    const t = setTimeout(start, 80)

    return () => {
      cancelled = true
      clearTimeout(t)
      stopScanner()
    }
  }, [open, cameraId])

  if (!open) return null

  return (
    <div className="modal-overlay barcode-camera-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-box barcode-camera-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-camera-title"
      >
        <div className="barcode-camera-head">
          <div>
            <h3 id="barcode-camera-title">Scan barcode</h3>
            <p>
              Laptop webcams are often soft/blurry. Hold the barcode closer and steady with good
              light. USB scanner or typing is more reliable on PC.
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {cameras.length > 1 ? (
          <div className="barcode-camera-pick">
            <label htmlFor="barcode-camera-select">Camera</label>
            <select
              id="barcode-camera-select"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              disabled={starting}
            >
              {cameras.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {error ? (
          <div className="barcode-camera-error" role="alert">
            {error}
          </div>
        ) : null}

        {starting && !error ? <p className="barcode-camera-status">Starting camera…</p> : null}

        <div id={READER_ID} className="barcode-camera-reader" />

        <ul className="barcode-camera-tips">
          <li>Fill most of the green box with the barcode</li>
          <li>Move slowly; pause when it looks sharpest</li>
          <li>On this laptop, USB scan or type the code if camera keeps missing</li>
        </ul>
      </div>
    </div>
  )
}
