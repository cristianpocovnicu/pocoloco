/**
 * Inserarea unui text acolo unde stă cursorul.
 *
 * Funcție pură: primește textul, selecția și ce se inserează, întoarce
 * textul nou și unde trebuie pus cursorul după. Cine o cheamă se ocupă de
 * DOM — aici nu intră nici React, nici `document`.
 */

export type Selection = { start: number; end: number }

export type Insertion = {
  value: string
  /** unde ajunge cursorul: imediat după ce s-a inserat */
  caret: number
}

/**
 * @param max limita câmpului. Dacă inserarea n-ar încăpea, textul rămâne
 *   neatins — mai bine nu se întâmplă nimic decât să tăiem din ce a scris
 *   omul ca să facem loc unui emoji.
 */
export function insertAtCursor(
  value: string,
  selection: Selection | null,
  insert: string,
  max: number
): Insertion {
  // fără selecție cunoscută (câmp neatins încă), textul se lipește la coadă
  const clamp = (at: number) => Math.max(0, Math.min(at, value.length))
  const from = selection ? clamp(selection.start) : value.length
  const to = selection ? clamp(selection.end) : value.length

  // o selecție „de la dreapta la stânga" tot o zonă de text descrie
  const start = Math.min(from, to)
  const end = Math.max(from, to)

  const next = value.slice(0, start) + insert + value.slice(end)
  if (next.length > max) return { value, caret: end }

  return { value: next, caret: start + insert.length }
}
