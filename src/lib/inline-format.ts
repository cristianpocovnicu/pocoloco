/**
 * Asteriscurile pe care le scriu oamenii, citite ca formatare.
 *
 * Nimeni n-a promis markdown nicăieri în interfață, dar lumea îl scrie din
 * reflex: „**ce am mâncat acolo**" a ajuns în producție cu asteriscurile
 * la vedere. Până la decizia mare despre formatare (backlog), atât
 * recunoaștem: **îngroșat**, *înclinat* și titlurile cu diez, care își
 * pierd diezul și rămân îngroșate.
 *
 * Funcția e **pură și fără HTML**: întoarce bucăți de text cu două
 * steaguri, iar React le desenează ca `<strong>` și `<em>`. Nu există
 * `dangerouslySetInnerHTML` nicăieri pe drum, deci nu există nici
 * suprafață de injecție — motivul pentru care n-am adus o bibliotecă de
 * markdown pentru trei semne.
 */

export type Inline = {
  text: string
  bold?: boolean
  italic?: boolean
}

/** Perechile recunoscute, cele lungi înaintea celor scurte. */
const BOLD = ['**', '__']
const ITALIC = ['*', '_']

/** `_` nu formatează în interiorul unui cuvânt: snake_case rămâne întreg. */
const WORD = /[0-9A-Za-zÀ-ž]/

function isWord(char: string | undefined): boolean {
  return char !== undefined && WORD.test(char)
}

/**
 * Un titlu devine un rând îngroșat.
 *
 * Diezul cere spațiu după el, ca în markdown — așa „#Grecia" scris ca
 * etichetă rămâne neatins.
 */
function headingsToBold(text: string): string {
  return text.replace(/^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*$/gm, '**$1**')
}

/**
 * Marcajul se închide doar dacă delimitează text adevărat.
 *
 * Fără regula asta, „am plătit 3 * 4 euro" ar deveni înclinat de la primul
 * asterisc până la al doilea. Conținutul nu poate fi gol și nu poate
 * începe sau se termina cu spațiu — aceleași condiții ca în markdown.
 */
function findClose(text: string, marker: string, from: number): number {
  let at = from
  while (at < text.length) {
    const found = text.indexOf(marker, at)
    if (found === -1 || found === from) {
      if (found === from) { at = found + 1; continue }
      return -1
    }

    const content = text.slice(from, found)
    const wellFormed = content.length > 0
      && !/^\s/.test(content)
      && !/\s$/.test(content)
      // trebuie să rămână ceva de formatat: „** **" e o pereche de semne,
      // nu un cuvânt îngroșat
      && /[^*_\s]/.test(content)

    // pentru `_`, marcajul nu are voie să stea lipit de o literă
    const looseEnough = marker !== '_' || !isWord(text[found + marker.length])

    if (wellFormed && looseEnough) return found
    at = found + marker.length
  }
  return -1
}

/** Un singur nivel: caută `markers`, iar restul textului rămâne cum e. */
function split(text: string, markers: string[], flag: 'bold' | 'italic'): Inline[] {
  const out: Inline[] = []
  let plain = ''
  let at = 0

  const flush = () => {
    if (plain) { out.push({ text: plain }); plain = '' }
  }

  while (at < text.length) {
    const marker = markers.find(candidate => text.startsWith(candidate, at))

    // `_` la mijloc de cuvânt (snake_case) nu deschide nimic
    const opens = marker
      && !(marker === '_' && isWord(text[at - 1]))
      && !/\s/.test(text[at + marker.length] ?? '')

    if (!opens) {
      plain += text[at]
      at += 1
      continue
    }

    const close = findClose(text, marker as string, at + (marker as string).length)
    if (close === -1) {
      plain += text[at]
      at += 1
      continue
    }

    flush()
    out.push({ text: text.slice(at + (marker as string).length, close), [flag]: true })
    at = close + (marker as string).length
  }

  flush()
  return out
}

/**
 * Textul, tăiat în bucăți cu formatare.
 *
 * Două treceri: întâi îngroșatul, apoi înclinatul în fiecare bucată — așa
 * „**un loc *chiar* bun**" iese cu ambele, fără recursie.
 */
export function parseInline(text: string): Inline[] {
  if (!text) return []

  const prepared = headingsToBold(text)
  const out: Inline[] = []

  for (const chunk of split(prepared, BOLD, 'bold')) {
    for (const piece of split(chunk.text, ITALIC, 'italic')) {
      if (!piece.text) continue
      out.push({
        text: piece.text,
        bold: chunk.bold || undefined,
        italic: piece.italic || undefined,
      })
    }
  }

  return out
}

/** Textul fără niciun semn de formatare — pentru rezumate și meta. */
export function stripInline(text: string): string {
  return parseInline(text).map(piece => piece.text).join('')
}
