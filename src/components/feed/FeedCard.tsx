'use client'
import Link from 'next/link'
import CoverImage from '@/components/ui/CoverImage'
import { Bookmark, Eye, MessageCircle } from 'lucide-react'
import { colorFor, initialsOf } from '@/lib/profiles'
import { formatCount, timeAgo } from '@/lib/utils'
import { activityLabel } from '@/lib/activities'
import TripKindBadge from '@/components/trip/TripKindBadge'
import VoteButtons from '@/components/experience/VoteButtons'
import type { VoteType } from '@/lib/votes'
import type { FeedItem } from '@/lib/follows'

export type FeedCardItem = {
  id: string
  kind: 'experience' | 'trip'
  href: string
  createdAt: string
  author: {
    id?: string | null
    full_name?: string | null
    username?: string | null
    is_guide?: boolean | null
  } | null
  /** locul sau zona — rândul de sub numele autorului */
  place?: string | null
  /** completate doar la experiențele de tip activitate */
  isActivity?: boolean
  activityCategory?: string | null
  /** doar la călătorii */
  isGuide?: boolean | null
  title?: string | null
  text: string
  images: string[]
  upvotes?: number
  downvotes?: number
  commentCount?: number
  saveCount?: number
}

/**
 * Postarea din feedul „Urmăresc" în forma cardului.
 *
 * Stă aici, lângă tip, pentru că o folosesc și homepage-ul, și pagina
 * /following — două copii ale aceleiași conversii ar fi început să difere
 * la prima schimbare.
 */
export function toFeedCardItem(item: FeedItem): FeedCardItem {
  return {
    id: item.id,
    kind: item.kind,
    href: item.href,
    createdAt: item.created_at,
    author: item.author,
    isActivity: !!item.activityTitle,
    activityCategory: item.activityCategory,
    place: item.kind === 'trip'
      ? (item.countries?.join(', ') || null)
      : item.activityTitle
        ? (item.activityArea || activityLabel(item.activityCategory) || null)
        : item.location
          ? `${item.location.name}${item.location.city ? `, ${item.location.city}` : ''}`
          : null,
    isGuide: item.isGuide,
    title: item.kind === 'trip' ? item.title : item.activityTitle,
    text: item.text,
    images: item.images,
    upvotes: item.upvotes,
    downvotes: item.downvotes,
    commentCount: item.commentCount,
    saveCount: item.saveCount,
  }
}

/**
 * Pozele unei postări, în felul în care le-ar aranja orice rețea care
 * trăiește din imagini: prima mare, restul dedesubt.
 *
 * Înainte erau trei timbre de 80px sub text — un card despre o grădină de
 * 70.000 m² arăta ca un anunț mic. Poza oprește scroll-ul, textul e
 * recompensa; deci poza urcă deasupra textului și primește toată lățimea.
 *
 * Aspectul e mai scund pe telefon (3:2) decât pe desktop (16:10): pe 375px
 * o poză 16:10 ar fi împins tot textul sub fold.
 *
 * Toate trec prin `CoverImage`, adică `next/image`: lazy implicit, srcset
 * generat, iar `sizes` spune browserului cât de mare e de fapt locul —
 * fără el ar descărca fișierul original.
 */
function FeedPhotos({ images }: { images: string[] }) {
  const [hero, ...rest] = images
  if (!hero) return null

  // peste 3 rămase, ultimul pătrat devine „încă N" — două se văd întregi
  const tiles = rest.length > 3 ? rest.slice(0, 3) : rest
  const hidden = rest.length > 3 ? rest.length - 2 : 0

  return (
    <div className="mt-1">
      <div className="relative w-full aspect-[3/2] md:aspect-[16/10] bg-[#F8F7F5]">
        <CoverImage src={hero} sizes="(max-width: 768px) 100vw, 680px" />
      </div>

      {/* exact două poze: a doua ia toată lățimea, la jumătate de înălțime */}
      {rest.length === 1 && (
        <div className="relative w-full aspect-[3/1] md:aspect-[16/5] bg-[#F8F7F5] mt-1">
          <CoverImage src={rest[0]} sizes="(max-width: 768px) 100vw, 680px" />
        </div>
      )}

      {rest.length > 1 && (
        <div className="grid grid-cols-3 gap-1 mt-1">
          {tiles.map((image, index) => (
            <div key={image} className="relative aspect-square bg-[#F8F7F5]">
              <CoverImage src={image} sizes="(max-width: 768px) 33vw, 226px" />
              {hidden > 0 && index === tiles.length - 1 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="font-outfit text-[18px] font-bold text-white">+{hidden}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type Props = {
  item: FeedCardItem
  /** votul meu, dacă îl știe apelantul; fără el butoanele pornesc neutre */
  myVote?: VoteType | null
  /**
   * `following` marchează postările oamenilor pe care îi urmărești. Doar
   * avatarul și un micro-badge se schimbă — forma cardului rămâne una
   * singură, ca ochiul să nu învețe două tipare pentru același lucru.
   */
  variant?: 'default' | 'following'
}

/**
 * Cardul feedului — cel din „Din comunitate".
 *
 * Aceeași formă pentru orice postare: autor, tip, titlu, fragment, poze,
 * apoi acțiunile. Votul și comentariile există doar la experiențe
 * (`votes` și `comments` n-au `trip_id`); o călătorie arată în locul lor
 * câte salvări are.
 *
 * Cardul e link, dar footerul stă în afara lui: butoanele de vot n-au voie
 * să fie imbricate într-un <a>.
 */
export default function FeedCard({ item, myVote = null, variant = 'default' }: Props) {
  const name = item.author?.full_name || item.author?.username || 'Călător'
  const avatar = item.author?.id ? colorFor(item.author.id) : '#E8440A'
  const followed = variant === 'following'

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:border-[rgba(0,0,0,0.15)] transition-colors">
      <Link href={item.href} className="block">
        <div className="p-3.5 pb-2.5">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 ${
                followed ? 'ring-2 ring-[#5B4FCF] ring-offset-1 ring-offset-white' : ''
              }`}
              style={{ background: avatar }}
            >
              {initialsOf(name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-[#0F0F0F] truncate">{name}</span>
                {followed && (
                  <span className="text-[9px] text-[#5B4FCF] font-outfit font-semibold uppercase tracking-wide flex-shrink-0">
                    Urmărești
                  </span>
                )}
                {item.author?.is_guide && (
                  <span className="text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Ghid</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#9B9B9B] flex-wrap">
                {item.kind === 'trip' ? (
                  <TripKindBadge isGuide={item.isGuide} />
                ) : item.isActivity ? (
                  <span className="bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-outfit font-semibold text-[10px]">
                    {activityLabel(item.activityCategory) || '🪂 Activitate'}
                  </span>
                ) : (
                  <span className="bg-[#FFF0EB] text-[#E8440A] px-1.5 py-0.5 rounded-full font-outfit font-semibold text-[10px]">Experiența</span>
                )}
                {item.place && <span className="truncate">📍 {item.place}</span>}
              </div>
            </div>
            <span className="text-[11px] text-[#9B9B9B] flex-shrink-0">{timeAgo(item.createdAt)}</span>
          </div>

        </div>

        {/* poza înaintea textului: ea oprește scroll-ul */}
        <FeedPhotos images={item.images} />

        {(item.title || item.text) && (
          <div className="px-3.5 pt-3 pb-2.5">
            {item.title && (
              <h3 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] leading-tight mb-1">{item.title}</h3>
            )}
            {item.text && (
              <p className="text-[14px] text-[#0F0F0F] leading-relaxed line-clamp-3 whitespace-pre-line">{item.text}</p>
            )}
          </div>
        )}
      </Link>

      <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          {item.kind === 'experience' ? (
            <>
              <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                <MessageCircle size={12} /> {formatCount(item.commentCount || 0)}
              </div>
              <VoteButtons
                target={{ kind: 'experience', id: item.id }}
                upvotes={item.upvotes || 0}
                downvotes={item.downvotes || 0}
                myVote={myVote}
              />
            </>
          ) : (
            <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
              <Bookmark size={12} /> {formatCount(item.saveCount || 0)} salvări
            </div>
          )}
        </div>
        <Link
          href={item.href}
          className="flex items-center gap-1 text-[12px] text-[#6B6B6B] hover:text-[#E8440A] transition-colors"
        >
          <Eye size={13} /> Deschide
        </Link>
      </div>
    </div>
  )
}
