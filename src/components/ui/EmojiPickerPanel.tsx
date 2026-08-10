'use client'
import { EmojiPicker } from 'frimousse'

/**
 * Lista de emoji, încărcată la cerere.
 *
 * Fișierul ăsta e importat dinamic (vezi EmojiButton), deci nici
 * biblioteca, nici datele nu ajung în bundle-ul paginii: se aduc la prima
 * apăsare pe buton și rămân în cache-ul browserului.
 *
 * **Datele stau la noi**, în `public/emoji/en/`, nu pe CDN-ul implicit al
 * bibliotecii (jsDelivr): un picker de emoji n-are de ce să spună unui
 * terț cine îl deschide, iar așa merge și dacă CDN-ul cade. Fișierele sunt
 * copiate din pachetul `emojibase-data@17` (`en/data.json` și
 * `en/messages.json`); ca să le împrospătezi, `npm pack emojibase-data` și
 * copiezi din nou.
 *
 * Căutarea e în engleză, pentru că emojibase n-are română. Nu e ideal, dar
 * categoriile se răsfoiesc oricum mai des decât se caută.
 */
export default function EmojiPickerPanel({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <EmojiPicker.Root
      locale="en"
      emojibaseUrl="/emoji"
      columns={9}
      onEmojiSelect={emoji => onPick(emoji.emoji)}
      className="isolate flex flex-col bg-white"
    >
      <EmojiPicker.Search
        placeholder="Caută un emoji..."
        className="mx-2 mt-2 mb-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
      />
      <EmojiPicker.Viewport className="relative flex-1 h-[248px] outline-none">
        <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-[12px] text-[#9B9B9B]">
          Se încarcă...
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-[12px] text-[#9B9B9B]">
          Niciun emoji găsit.
        </EmojiPicker.Empty>
        <EmojiPicker.List
          className="select-none pb-1"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                className="bg-white px-2.5 pt-2 pb-1 text-[10px] font-outfit font-semibold uppercase tracking-wide text-[#9B9B9B]"
                {...props}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className="px-1.5" {...props}>{children}</div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[20px] leading-none data-[active]:bg-[#F0EDE8]"
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  )
}
