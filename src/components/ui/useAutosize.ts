'use client'
import { useEffect, useRef, type RefObject } from 'react'

/**
 * Un câmp care crește odată cu textul, fără să zgâlțâie pagina.
 *
 * Rețeta veche — `height = 'auto'`, apoi `height = scrollHeight` — se
 * executa la fiecare tastă. Între cele două linii, câmpul chiar devine mic
 * (înălțimea din `rows`), iar citirea lui `scrollHeight` obligă browserul
 * să recalculeze aranjarea chiar atunci, cu pagina scurtată brusc cu sute
 * de pixeli. Când asta se întâmplă sub degetul cuiva care scrie, pagina
 * sare, iar rândul de sub cursor fuge.
 *
 * Aici sunt două drumuri:
 *
 * 1. **Chrome și Edge (123+) știu singure**: `field-sizing: content` (vezi
 *    globals.css) face creșterea în motorul de aranjare, fără JavaScript și
 *    fără măsurători. Când browserul o suportă, ieșim din start.
 * 2. **Restul** primesc măsurătoarea, dar resetul distructiv se face **doar
 *    când textul s-a scurtat**. La scris înainte — cazul obișnuit — nu se
 *    resetează nimic: dacă textul a depășit cutia, cutia crește; altfel nu
 *    se atinge nimic.
 */

let nativeSupport: boolean | null = null

/** Verificat o singură dată per pagină: răspunsul nu se schimbă. */
export function hasNativeAutosize(): boolean {
  if (nativeSupport !== null) return nativeSupport
  nativeSupport = typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('field-sizing', 'content')
  return nativeSupport
}

export function useAutosize(
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  /** schimbări de context care cer o remăsurare completă (ex. alt ecran) */
  reset?: unknown
) {
  const previousLength = useRef(value.length)

  useEffect(() => {
    const el = ref.current
    if (!el || hasNativeAutosize()) return

    const shrank = value.length < previousLength.current
    previousLength.current = value.length

    // singurul moment în care dăm cutia înapoi: când chiar a rămas text mai
    // puțin. Scrisul înainte nu mai trece niciodată pe aici.
    if (shrank) el.style.height = 'auto'
    if (shrank || el.scrollHeight > el.clientHeight) {
      el.style.height = `${el.scrollHeight}px`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reset])
}
