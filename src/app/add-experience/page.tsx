'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useToast } from '@/components/ui/Toast'
import StopCard from '@/components/create/StopCard'
import SubjectPicker from '@/components/create/SubjectPicker'
import StoryField from '@/components/create/StoryField'
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
  suggestTripCountries,
  suggestTripTitle,
  type StopDraft,
  type StoryDraft,
  type StoryMode,
  type TripDraft,
} from '@/lib/story'
import { fetchPointsSince, justNowWindow } from '@/lib/points'

type SectionState = Record<string, { photos: boolean; ratings: boolean; story: boolean }>

const SAVE_DEBOUNCE_MS = 1500

/**
 * Ecranul de creare.
 *
 * Începe cu o singură căutare. Ce alegi acolo decide drumul, fără să ți se
 * ceară vreo decizie de taxonomie:
 *
 *   un obiectiv (loc sau activitate) -> scrii despre el;
 *   o zonă întreagă (țară, regiune)  -> numele ei devine numele poveștii,
 *                                       iar locurile se adaugă pe rând.
 *
 * Ramificarea stabilește punctul de plecare, nu închide drumuri: din
 * oricare dintre ele se ajunge la mai multe locuri.
 *
 * Tot ce ține de ieșirea întreagă — nume, poveste, zile, transport, țări,
 * copertă — stă pe acest ecran, deasupra locurilor. A avut o vreme un pas
 * 2 al lui (iterația 6), dar numele și povestea apăreau pe ambele ecrane
 * și despărțirea a ajuns să dubleze exact subiectul pe care voia să-l
 * descarce.
 */
function CreateScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [stops, setStops] = useState<StopDraft[]>([])
  const [trip, setTrip] = useState<TripDraft>(emptyTrip())
  /** null cât timp nimic n-a fost ales: atunci se vede doar căutarea */
  const [mode, setMode] = useState<StoryMode | null>(null)
  /** oprirea folosită de căutarea de la intrare, până se decide ramura */
  const [entryStop, setEntryStop] = useState<StopDraft>(() => newStop())
  /** câte locuri au rămas fără zi după ce a scăzut durata */
  const [clearedDays, setClearedDays] = useState(0)
  /** propunerea de a muta povestea ieșirii din textul primului loc */
  const [offerMove, setOfferMove] = useState(false)
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
  /** țările se deduc singure până pune omul mâna pe câmp */
  const countriesTouched = useRef(false)
  /** ca „Publică" să poată duce la câmpurile care mai lipsesc */
  const nameRef = useRef<HTMLInputElement>(null)
  const storyRef = useRef<HTMLDivElement>(null)
  const [nameMissing, setNameMissing] = useState(false)
  /** propunerea de mutare se face o singură dată, nu la fiecare apăsare */
  const moveAsked = useRef(false)

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

      // venit de pe pagina unui loc: locul e ales, deci e clar un obiectiv
      if (preLocationId && preName) {
        const first = newStop({ locationId: preLocationId, locationName: preName })
        setStops([first])
        setExpandedKey(first.key)
        setMode('review')
      }
      setLoading(false)
    }
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- salvare automată, la 1,5s după ultima atingere
  useEffect(() => {
    if (!userId || loading || pendingDraft || !dirty.current) return

    const timer = setTimeout(() => {
      void saveDraft(createClient(), userId, { stops, trip, mode: mode || 'review' })
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [stops, trip, mode, userId, loading, pendingDraft])

  const patchStop = useCallback((key: string, patch: Partial<StopDraft>) => {
    dirty.current = true
    setStops(prev => prev.map(stop => (stop.key === key ? { ...stop, ...patch } : stop)))
  }, [])

  /** Numele poveștii, editabil direct din antet. */
  const setOutingName = (name: string) => {
    dirty.current = true
    setTrip(prev => ({ ...prev, title: name }))
  }

  /**
   * Un obiectiv ales la intrare: devine primul card, cu tot ce a apucat
   * căutarea să afle despre el.
   */
  const startReview = (patch: Partial<StopDraft>) => {
    dirty.current = true
    const first = newStop({ ...entryStop, ...patch, key: undefined as unknown as string })
    setStops([first])
    setExpandedKey(first.key)
    setMode('review')
  }

  /**
   * O zonă aleasă la intrare: nu devine loc și nu ajunge în locations —
   * dă numele poveștii, iar primul card așteaptă gol primul loc de acolo.
   */
  const startJourney = (name: string) => {
    dirty.current = true
    const first = newStop()
    setTrip(prev => ({ ...prev, title: name }))
    setStops([first])
    setExpandedKey(first.key)
    setMode('journey')
  }

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
    setMode(pendingDraft.mode || 'review')
    // draftul vechi putea fi salvat pe pasul 2; ecranul e acum unul singur,
    // deci nu mai există „unde erai"
    if (pendingDraft.trip.countries.length > 0) countriesTouched.current = true
    setExpandedKey(pendingDraft.stops[pendingDraft.stops.length - 1]?.key || null)
    setPendingDraft(null)
  }

  const discard = async () => {
    if (!window.confirm('Ștergi ce ai început? Nu se mai poate recupera.')) return
    if (userId) await deleteDraft(createClient(), userId)
    setStops([])
    setTrip(emptyTrip())
    setMode(null)
    countriesTouched.current = false
    setEntryStop(newStop())
    setExpandedKey(null)
    setPendingDraft(null)
  }

  const saveForLater = async () => {
    if (!userId) return
    await saveDraft(createClient(), userId, { stops, trip, mode: mode || 'review' })
    toast('Salvat. O găsești în profil când vrei să continui.')
    router.push('/profile')
  }

  /** Durata a scăzut sub o zi deja aleasă: golim ziua, cu un mesaj. */
  const changeTrip = (patch: Partial<TripDraft>) => {
    dirty.current = true
    if (patch.countries !== undefined) countriesTouched.current = true
    if (patch.title !== undefined && patch.title.trim()) setNameMissing(false)
    setTrip(prev => ({ ...prev, ...patch }))

    if (patch.durationDays !== undefined) {
      const limit = patch.durationDays
      const afectate = stops.filter(stop => stop.day !== null && stop.day > limit)
      if (afectate.length > 0) {
        setStops(prev => prev.map(stop =>
          stop.day !== null && stop.day > limit ? { ...stop, day: null } : stop
        ))
        setClearedDays(afectate.length)
      }
    }
  }

  const usableStops = stops.filter(stopHasSubject)
  const canContinue = usableStops.length > 0

  /**
   * Când e vorba de o ieșire, nu de un singur obiectiv.
   *
   * Două declanșatoare, nu unul: o poveste pornită de la o zonă are nume
   * de la început, iar una pornită de la un obiectiv devine ieșire în
   * momentul în care primește al doilea loc.
   */
  const showDetails = mode === 'journey' || usableStops.length > 1
  const days = Array.from({ length: Math.max(trip.durationDays, 1) }, (_, i) => i + 1)
  const nameSuggestion = suggestTripTitle(usableStops)

  /**
   * Țările se completează singure din locurile alese, atâta timp cât n-a
   * pus nimeni mâna pe câmp. Nu mai există un moment de tranziție în care
   * să le deducem o dată, deci le ținem la zi — dar prima editare le trece
   * definitiv în grija omului, inclusiv dacă le golește.
   */
  const suggestedCountries = suggestTripCountries(usableStops).join('|')
  useEffect(() => {
    if (countriesTouched.current) return
    const next = suggestedCountries ? suggestedCountries.split('|') : []
    setTrip(prev => (prev.countries.join('|') === suggestedCountries ? prev : { ...prev, countries: next }))
  }, [suggestedCountries])

  /**
   * Semnul că povestea întregii ieșiri a ajuns în textul primului loc:
   * text lung acolo și nicăieri altundeva. Pragul e generos — sub 2.500
   * de caractere e plauzibil să fie chiar despre locul ăla.
   */
  const LONG_TEXT = 2500
  const spilledStory = usableStops.length > 1
    && usableStops[0].content.trim().length > LONG_TEXT
    && usableStops.slice(1).every(stop => stop.content.trim().length === 0)

  /**
   * Mută textul primului loc în povestea ieșirii.
   *
   * Ținta e pe același ecran, deci după mutare ducem omul la ea: altfel
   * textul ar dispărea dintr-un câmp fără să se vadă unde a apărut.
   */
  const moveStoryToTrip = () => {
    dirty.current = true
    const first = usableStops[0]
    const text = first.content.trim()

    setTrip(prev => ({
      ...prev,
      description: prev.description.trim() ? `${prev.description.trim()}

${text}` : text,
    }))
    setStops(stops.map(stop => (stop.key === first.key ? { ...stop, content: '' } : stop)))
    setOfferMove(false)
    storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handlePublish = async () => {
    if (!userId || !canContinue) return

    // o ieșire fără nume n-are cum să fie publicată: ducem omul la câmp,
    // nu-l lăsăm în fața unui buton mut
    if (showDetails && !trip.title.trim()) {
      setNameMissing(true)
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nameRef.current?.focus({ preventScroll: true })
      return
    }

    // întrebăm o singură dată, chiar înainte de publicare
    if (spilledStory && !moveAsked.current) {
      moveAsked.current = true
      setOfferMove(true)
      return
    }

    setPublishing(true)
    setError(null)
    const since = justNowWindow()

    try {
      const supabase = createClient()
      // cardurile fără subiect n-au ce căuta în itinerar: ar fi poziții goale
      const result = await publishStory(supabase, userId, { stops: usableStops, trip })
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

  // nimic ales încă: o singură întrebare pe ecran
  if (!pendingDraft && mode === null) return (
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
          <div className="font-outfit text-[16px] font-semibold text-[#0F0F0F]">Povestește</div>
        </div>
      </div>

      <div className="max-w-[560px] mx-auto px-5 pt-12">
        <h1 className="font-outfit text-[22px] font-bold text-[#0F0F0F] mb-1.5 text-center">
          Unde ai fost?
        </h1>
        <p className="text-[13px] text-[#9B9B9B] leading-relaxed mb-6 text-center">
          Un loc anume sau o destinație întreagă — scrie numele și pornim de acolo.
        </p>

        <SubjectPicker
          stop={entryStop}
          onChange={patch => {
            setEntryStop(prev => ({ ...prev, ...patch }))
            // orice altceva decât o zonă e un obiectiv: intrăm pe review
            if (patch.locationName || patch.activityTitle) startReview(patch)
          }}
          onRegionPicked={startJourney}
          // fără placeholder propriu: întrebarea e deja în titlu, iar cel
          // implicit spune ce se poate tasta, cu exemple
          autoFocus
        />
      </div>
    </div>
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
              <button type="button"
                onClick={resume}
                className="bg-[#E8440A] text-white font-outfit text-[13px] font-semibold px-4 py-2 rounded-full"
              >
                Continuă
              </button>
              <button type="button" onClick={discard} className="text-[13px] text-[#6B6B6B] font-medium px-3">
                Începe altceva
              </button>
            </div>
          </div>
        )}

        {offerMove && (
          <div className="bg-white border border-[rgba(232,68,10,0.25)] rounded-2xl p-4 mb-4">
            <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] mb-1">
              Pare că ai povestit toată ieșirea în textul primului loc
            </p>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-3">
              O mutăm la povestea întregii ieșiri? Acolo stă ce ține de toată ieșirea,
              iar la fiecare loc rămâne ce e despre el.
            </p>
            <div className="flex gap-2">
              <button type="button"
                onClick={moveStoryToTrip}
                className="bg-[#E8440A] text-white font-outfit text-[13px] font-semibold px-4 py-2 rounded-full"
              >
                Mută
              </button>
              <button type="button"
                onClick={() => { setOfferMove(false); void handlePublish() }}
                className="text-[13px] text-[#6B6B6B] font-medium px-3"
              >
                Lasă cum e
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* ------- ce ține de ieșirea întreagă, deasupra locurilor ------- */}
        {!pendingDraft && showDetails && (
          <div className="mb-4">
            <label className="text-[11px] font-outfit font-semibold text-[#9B9B9B] uppercase tracking-wide block mb-1.5">
              Povestea ta
            </label>
            <input
              ref={nameRef}
              value={trip.title}
              onChange={e => { setOutingName(e.target.value.slice(0, 120)); setNameMissing(false) }}
              placeholder="Cum o numim?"
              className={`w-full bg-white border rounded-xl px-4 py-3 font-outfit text-[18px] font-semibold text-[#0F0F0F] outline-none transition-colors placeholder:font-normal placeholder:text-[#9B9B9B] ${
                nameMissing ? 'border-[#DC2626]' : 'border-[rgba(0,0,0,0.08)] focus:border-[#E8440A]'
              }`}
            />
            {nameMissing && (
              <p className="text-[12px] text-[#DC2626] mt-1.5">
                Dă-i un nume ca s-o putem publica.
              </p>
            )}
            {/* propunerea din locurile alese, cât timp câmpul e gol */}
            {!trip.title.trim() && nameSuggestion && (
              <button type="button"
                onClick={() => setOutingName(nameSuggestion)}
                className="text-[12px] text-[#5B4FCF] font-medium mt-1.5"
              >
                Folosește „{nameSuggestion}&rdquo;
              </button>
            )}
          </div>
        )}

        {!pendingDraft && showDetails && (
          <div className="mb-4" ref={storyRef}>
            <StoryField
              value={trip.description}
              onChange={value => { dirty.current = true; setTrip(prev => ({ ...prev, description: value })) }}
              label="Povestea ta (opțional)"
              placeholder="Cum a fost, per total? Buget, vreme, transport, ce ai face diferit — tot ce ține de întreaga ieșire."
            />
          </div>
        )}

        {!pendingDraft && showDetails && (
          <div className="mb-4">
            <OutingCard trip={trip} stops={stops} onChange={changeTrip} />
          </div>
        )}

        {!pendingDraft && showDetails && (
          <div className="mb-2">
            <p className="text-[12px] font-medium text-[#6B6B6B]">
              {mode === 'journey' ? 'Adaugă locurile prin care ai trecut' : 'Locurile'}
            </p>
            {days.length > 1 && (
              <p className="text-[11px] text-[#9B9B9B]">
                Poți spune în ce zi ai fost la fiecare. Dacă sari peste, rămân toate la un loc.
              </p>
            )}
          </div>
        )}

        {clearedDays > 0 && (
          <div className="bg-[#FFFBEB] border border-[rgba(217,119,6,0.2)] rounded-xl px-3 py-2 mb-2.5">
            <p className="text-[12px] text-[#6B6B6B]">
              {clearedDays === 1
                ? 'Un loc rămăsese pe o zi care nu mai există — l-am lăsat fără zi.'
                : `${clearedDays} locuri rămăseseră pe zile care nu mai există — le-am lăsat fără zi.`}
            </p>
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
                  placeholder={mode === 'journey' && index === 0
                    ? 'Primul loc de acolo: un vârf, un sat, o plajă...'
                    : undefined}
                  days={showDetails ? days : undefined}
                />
              ))}
            </div>

            {/* mereu sub ultimul card, vizibil de la început */}
            <button type="button"
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

          </>
        )}
      </div>

      {!pendingDraft && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-[rgba(0,0,0,0.08)] px-5 pt-3 z-40"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-[680px] mx-auto flex items-center gap-3">
            <button type="button"
              onClick={handlePublish}
              disabled={!canContinue || publishing}
              className={`flex-1 font-outfit text-[15px] font-semibold py-3 rounded-full flex items-center justify-center gap-2 transition-colors ${
                canContinue && !publishing ? 'bg-[#E8440A] text-white' : 'bg-[#F1F1F1] text-[#9B9B9B]'
              }`}
            >
              {publishing && <Loader2 size={16} className="animate-spin" />}
              Publică
            </button>
            <button type="button"
              onClick={saveForLater}
              disabled={publishing}
              className="text-[13px] text-[#6B6B6B] font-medium px-2 disabled:opacity-50"
            >
              Continuă mai târziu
            </button>
          </div>

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
