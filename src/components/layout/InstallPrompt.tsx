import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  // iOS Safari
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return mq || iosStandalone
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS has no beforeinstallprompt — show manual instructions after a short delay
    if (isIos()) {
      const t = window.setTimeout(() => setShowIosHint(true), 1500)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        window.clearTimeout(t)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    setShowIosHint(false)
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isStandalone() || dismissed) return null

  // Android / desktop Chromium install banner
  if (deferredPrompt) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 border-b bg-blue-600 px-4 py-2.5 text-white shadow-md">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="TripShare"
              className="h-8 w-8 rounded-lg shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Install TripShare</p>
              <p className="truncate text-xs text-blue-100">
                Add to your home screen for quick access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              className="gap-1.5 bg-white text-blue-600 hover:bg-blue-50"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 hover:bg-blue-500"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // iOS Safari — guide user to Share → Add to Home Screen
  if (showIosHint) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 border-b bg-blue-600 px-4 py-2.5 text-white shadow-md">
        <div className="container mx-auto flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="TripShare"
              className="h-8 w-8 rounded-lg shrink-0 mt-0.5"
            />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Install TripShare</p>
              <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
                Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share, then{' '}
                <span className="font-medium text-white">Add to Home Screen</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 hover:bg-blue-500 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
