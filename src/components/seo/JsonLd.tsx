/**
 * Datele structurate, în singurul loc unde le pot citi crawlerele: HTML-ul
 * servit. Componenta e server — nu are stare, nu are interactivitate.
 *
 * `JSON.stringify` scapă `<` din conținutul userilor ca `<`, ca un text
 * de recenzie să nu poată închide tagul de script.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
