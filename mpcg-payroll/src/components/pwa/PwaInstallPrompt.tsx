'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallPrompt({ variant = 'header' }: { variant?: 'header' | 'banner' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration failed:', err);
        });
    }

    // 2. Check if already installed / running in standalone mode
    if (typeof window !== 'undefined') {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standaloneQuery || isIosStandalone) {
        setIsStandalone(true);
        setIsInstalled(true);
      }

      // Check iOS user agent
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
      setIsIos(isIosDevice);

      // Check if user previously dismissed
      const dismissed = localStorage.getItem('mpcg_pwa_banner_dismissed');
      if (dismissed) {
        setDismissedBanner(true);
      }
    }

    // 3. Capture beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Capture appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('MPCG Portal PWA was installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    } else {
      // For browsers that don't fire prompt or when already captured
      setShowIosModal(true);
    }
  };

  const handleDismissBanner = () => {
    setDismissedBanner(true);
    try {
      localStorage.setItem('mpcg_pwa_banner_dismissed', 'true');
    } catch {}
  };

  // If already installed and running standalone, don't display prompt
  if (isStandalone || isInstalled) {
    return null;
  }

  // Header Button Variant (Sits next to user profile / logout in portal header)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className="portal-install-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            border: '1px solid #38bdf8',
            borderRadius: '999px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
            whiteSpace: 'nowrap',
          }}
          title="Install MPCG Employee Portal as an app on your device"
        >
          <Smartphone size={14} style={{ color: '#bae6fd' }} />
          <span>Install App</span>
        </button>

        {/* iOS / Manual Install Instructions Modal */}
        {showIosModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(3, 7, 18, 0.75)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              boxSizing: 'border-box',
            }}
            onClick={() => setShowIosModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '20px',
                padding: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(2, 132, 199, 0.2)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    Install MPCG Portal
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Add 1-tap shortcut to your phone
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    Tap the <strong>Share</strong> button <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', color: '#38bdf8' }} /> in your browser menu (Safari / Chrome).
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    Scroll down and select <strong>&ldquo;Add to Home Screen&rdquo;</strong> <PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle', color: '#38bdf8' }} /> or <strong>&ldquo;Install App&rdquo;</strong>.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="portal-btn-primary"
                style={{ width: '100%', padding: '0.65rem 1rem' }}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Banner Variant (Featured at the top of the portal)
  if (variant === 'banner' && !dismissedBanner) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '14px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          padding: '0.75rem 1rem',
          marginBottom: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '0 4px 15px rgba(2, 132, 199, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
              Install MPCG App
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Add 1-tap shortcut to your phone screen
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Download size={13} />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismissBanner}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
