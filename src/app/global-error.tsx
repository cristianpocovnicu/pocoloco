'use client'
import { useEffect } from 'react'

/**
 * Prinde erorile aruncate din layout-ul rădăcină (sidebar, bara de jos).
 * Fără ea, o excepție de acolo lasă tot site-ul alb.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html lang="ro">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F0EDE8', margin: 0 }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: 24, textAlign: 'center', color: '#0F0F0F',
        }}>
          <div style={{ fontSize: 44 }}>🧭</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Ceva n-a mers bine</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B', maxWidth: 320 }}>
            Reîncarcă pagina. Dacă persistă, revino în câteva minute.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#E8440A', color: 'white', border: 0, borderRadius: 999,
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Încearcă din nou
          </button>
        </div>
      </body>
    </html>
  )
}
