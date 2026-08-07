'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/Toast'
import StopCard from '@/components/create/StopCard'
import OutingCard from '@/components/create/OutingCard'
import AddToTripDialog from '@/components/trip/AddToTripDialog'
import {
  deleteDraft,
  emptyTrip,
  loadDraft,
  newStop,
  publishStory,
  saveDraft,
  stopHasSubject,
  stopLabel,
  type StopDraft,
  type StoryDraft,
  type TripDraft,
} from '@/lib/story'
import { fetchPointsSince, justNowWindow } from '@/lib/points'

type SectionState = Record<string, { photos: boolean; ratings: boolean; story: boolean }>

const SAVE_DEBOUNCE_MS = 1500

/**
 * Ecranul de creare: unul singur, care crește pe măsură ce ai ce spune.
 *
 * Nu există pași și nu există „înapoi": tot terenul e vizibil de la
 * început — prima oprire, invitația de a mai adăuga una, detaliile ieșirii
 * (blocate până există a doua oprire). Nimic nu cere o decizie despre ce
 * fel de conținut faci; asta se decide singură, la publicare.
 */
function CreateScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [stops, setStops] = useState<StopDraft[]>([])
  const [trip, setTrip] = useState<TripDraft>(emptyTrip())
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [sections, setSections] = useState<SectionState>({})
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** draftul găsit la intrare, cât timp userul nu s-a hotărât */
  const [pendingDraft, setPendingDraft] = useState<StoryDraft | null>(null)
  /** publicat singur — atunci întrebăm dacă face parte dintr-o ieșire veche */
  const [published, setPublished] = useState<{ id: string; locationId: string | null; title: string } | null>(null)

  const dirty = useRef(false)

  // ---- pornire: draftul salvat, sau o oprire goală (poate pre-completată)
  useEffect(() => {
    const start = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const preLocationId = searchParams.get('location')
      const preName = searchParams.get('name')

      const saved = await loadDraft(supabase, user.id)
      // venit de pe pagina unui loc: pornim direct cu locul ăla
      if (saved && !preLocationId) {
        setPendingDraft(saved)
        setLoading(false)
        return
      }

      const first = newStop(preLocationId && preName
        ? { locationId: preLocationId, locationName: preName }
        : {})
      setStops([first])
      setExpandedKey(first.key)
      setLoading(false)
    }
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- salvare automată, la 1,5s după ultima atingere
  useEffect(() => {
    if (!userId || loading || pendingDraft || !dirty.current) return

    const timer = setTimeout(() => {
      void saveDraft(createClient(), userId, { stops, trip })
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [stops, trip, userId, loading, pendingDraft])

  const patchStop = useCallback((key: string, patch: Partial<StopDraft>) => {
    dirty.current = true
    setStops(prev => prev.map(stop => (stop.key === key ? { ...stop, ...patch } : stop)))
  }, [])

  const addStop = () => {
    dirty.current = true
    // perioada se moștenește: de obicei toate locurile sunt din aceeași
    // ieșire, iar valoarea rămâne modificabilă pe fiecare card
    const reference = stops.find(s => s.visitedYear)
    const stop = newStop(reference
      ? { visitedYear: reference.visitedYear, visitedMonth: reference.visitedMonth }
      : {})
    setStops(prev => [...prev, stop])
    setExpandedKey(stop.key)
  }

  const removeStop = (key: string) => {
    dirty.current = true
    setStops(prev => {
      const next = prev.filter(s => s.key !== key)
      if (next.length === 0) {
        const fresh = newStop()
        setExpandedKey(fresh.key)
        return [fresh]
      }
      if (expandedKey === key) setExpandedKey(next[next.length - 1].key)
      return next
    })
  }

  const moveStop = (index: number, direction: -1 | 1) => {
    dirty.current = true
    setStops(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const toggleSection = (key: string, section: 'photos' | 'ratings' | 'story') => {
    setSections(prev => {
      const current = prev[key] || { photos: false, ratings: false, story: false }
      return { ...prev, [key]: { ...current, [section]: !current[section] } }
    })
  }

  const resume = () => {
    if (!pendingDraft) return
    setStops(pendingDraft.stops)
    setTrip(pendingDraft.trip)
    setExpandedKey(pendingDraft.stops[pendingDraft.stops.length - 1]?.key || null)
    setPendingDraft(null)
  }

  const discard = async () => {
    if (!window.confirm('Ștergi ce ai început? Nu se mai poate recupera.')) return
    if (userId) await deleteDraft(createClient(), userId)
    const first = newStop()
    setStops([first])
    setTrip(emptyTrip())
    setExpandedKey(first.key)
    setPendingDraft(null)
  }

  const saveForLater = async () => {
    if (!userId) return
    await saveDraft(createClient(), userId, { stops, trip })
    toast('Salvat. O găsești în profil când vrei să continui.')
    router.push('/profile')
  }

  const usableStops = stops.filter(stopHasSubject)
  const canPublish = usableStops.length > 0
    && (usableStops.length === 1 || trip.title.trim().length > 0)

  const handlePublish = async () => {
    if (!userId || !canPublish) return
    setPublishing(true)
    setError(null)
    const since = justNowWindow()

    try {
      const supabase = createClient()
      const result = await publishStory(supabase, userId, { stops, trip })
      await deleteDraft(supabase, userId)

      const gained = await fetchPointsSince(supabase, userId, since)
      toast(gained > 0 ? `Publicat! +${gained} puncte 🎉` : 'Publicat! 🎉')

      if (result.tripId) {
        toast('Poți aranja zilele și ordinea oricând din editare.')
        router.push(result.href)
        return
      }

      // o singură oprire: poate face parte dintr-o ieșire de demult
      const first = usableStops[0]
      setPublished({
        id: result.experienceId as string,
        locationId: first.kind === 'activity' ? null : first.locationId,
        title: stopLabel(first),
      })
      setPublishing(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nu am putut publica.')
      setPublishing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (published) return (
    <AddToTripDialog
      experienceId={published.id}
      locationId={published.locationId}
      title={published.title}
      onDone={() => router.push(`/experience/${published.id}`)}
    />
  )

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto flex items-center gap-3">
          <Link
            href="/"
            aria-label="Înapoi"
            className="w-8 h-8 rounded-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={16} className="text-[#6B6B6B]" />
          </Link>
          <div className="min-w-0">
            <div className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Povestește</div>
            <div className="text-[11px] text-[#9B9B9B]">Începe cu un loc. Restul e opțional.</div>
          </div>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 pt-4 pb-40">
        {pendingDraft && (
          <div className="bg-white border border-[rgba(232,68,10,0.25)] rounded-2xl p-4 mb-4">
            <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-0.5">
              Ai o poveste neterminată
            </p>
            <p className="text-[13px] text-[#6B6B6B] mb-3">
              „{stopLabel(pendingDraft.stops[0])}&rdquo;
              {pendingDraft.stops.length > 1 && ` + încă ${pendingDraft.stops.length - 1}`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={resume}
                className="bg-[#E8440A] text-white font-outfit text-[13px] font-semibold px-4 py-2 rounded-full"
              >
                Continuă
              </button>
              <button onClick={discard} className="text-[13px] text-[#6B6B6B] font-medium px-3">
                Începe altceva
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {!pendingDraft && (
          <>
            <div className="flex flex-col gap-2.5">
              {stops.map((stop, index) => (
                <StopCard
                  key={stop.key}
                  stop={stop}
                  index={index}
                  total={stops.length}
                  expanded={expandedKey === stop.key}
                  onExpand={() => setExpandedKey(stop.key)}
                  onChange={patch => patchStop(stop.key, patch)}
                  onRemove={() => removeStop(stop.key)}
                  onMove={direction => moveStop(index, direction)}
                  open={sections[stop.key] || { photos: false, ratings: false, story: false }}
                  onToggleSection={section => toggleSection(stop.key, section)}
                />
              ))}
            </div>

            {/* mereu sub ultimul card, vizibil de la început */}
            <button
              onClick={addStop}
              className="w-full mt-2.5 bg-white border border-dashed border-[rgba(232,68,10,0.35)] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center flex-shrink-0">
                <Plus size={17} className="text-[#E8440A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">
                  Ai mai făcut ceva în aceeași ieșire?
                </p>
                <p className="text-[12px] text-[#9B9B9B]">
                  Un alt loc sau o activitate — ajunge și doar numele cu o notă.
                </p>
              </div>
              <span className="text-[13px] font-outfit font-semibold text-[#E8440A] flex-shrink-0">
                + Mai adaugă
              </span>
            </button>

            <div className="mt-4">
              <OutingCard
                trip={trip}
                stops={usableStops}
                active={usableStops.length > 1}
                onChange={patch => { dirty.current = true; setTrip(prev => ({ ...prev, ...patch })) }}
              />
            </div>
          </>
        )}
      </div>

      {!pendingDraft && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(0,0,0,0.08)] px-5 pt-3 z-40"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-[680px] mx-auto flex items-center gap-3">
            <button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className={`flex-1 font-outfit text-[15px] font-semibold py-3 rounded-full flex items-center justify-center gap-2 transition-colors ${
                canPublish && !publishing ? 'bg-[#E8440A] text-white' : 'bg-[#F1F1F1] text-[#9B9B9B]'
              }`}
            >
              {publishing && <Loader2 size={16} className="animate-spin" />}
              Publică
            </button>
            <button
              onClick={saveForLater}
              disabled={publishing}
              className="text-[13px] text-[#6B6B6B] font-medium px-2 disabled:opacity-50"
            >
              Continuă mai târziu
            </button>
          </div>

          {usableStops.length > 1 && !trip.title.trim() && (
            <p className="max-w-[680px] mx-auto text-[11px] text-[#9B9B9B] mt-1.5">
              Mai lipsește numele călătoriei.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="animate-spin text-[#E8440A]" />
      </div>
    }>
      <CreateScreen />
    </Suspense>
  )
}
