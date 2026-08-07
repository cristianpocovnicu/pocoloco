'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import { fetchSuggestedUsers, type SuggestedUser } from '@/lib/follows'
import FollowButton from '@/components/profile/FollowButton'
import { REGIONS, TRAVEL_STYLES } from '@/lib/utils'

const TOTAL_STEPS = 3

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [styles, setStyles] = useState<string[]>(['adventure'])
  const [regions, setRegions] = useState<string[]>(['romania'])
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [followed, setFollowed] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
    })
  }, [router])

  // sugestiile se încarcă doar când ajungi la pasul 3
  useEffect(() => {
    if (step !== 2 || suggestions.length > 0) return

    const load = async () => {
      setLoadingSuggestions(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setSuggestions(await fetchSuggestedUsers(supabase, [user?.id || ''], 5))
      setLoadingSuggestions(false)
    }
    load()
  }, [step, suggestions.length])

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  const savePreferences = async (completed: boolean) => {
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        travel_styles: styles,
        favorite_regions: regions,
        onboarding_completed: completed,
      })
      .eq('id', user.id)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1)
    else savePreferences(true)
  }

  const canProceed = () => {
    if (step === 0) return styles.length > 0
    if (step === 1) return regions.length > 0
    return true
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex flex-col">
      <div className="bg-white px-5 pt-4 pb-3 flex items-center justify-between border-b border-[rgba(0,0,0,0.08)]">
        <span className="text-[12px] text-[#9B9B9B] font-outfit">Pasul {step + 1} din {TOTAL_STEPS}</span>
        <button
          onClick={() => savePreferences(true)}
          disabled={saving}
          className="text-[13px] text-[#E8440A] font-medium disabled:opacity-60"
        >
          Sari peste
        </button>
      </div>
      <div className="h-1 bg-[rgba(0,0,0,0.08)]">
        <div className="h-full bg-[#E8440A] transition-all" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div className="flex-1 px-6 pt-7 pb-10 max-w-[680px] w-full mx-auto">
        {error && (
          <div className="bg-[#FEF2F2] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* Pas 1 — stil de călătorie */}
        {step === 0 && (
          <div>
            <div className="text-5xl mb-4">🗺️</div>
            <h1 className="font-outfit text-[24px] font-bold text-[#0F0F0F] mb-2">Ce fel de călător ești?</h1>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">Alege una sau mai multe. Le poți schimba oricând din setări.</p>

            <div className="flex flex-col gap-2.5">
              {TRAVEL_STYLES.map(style => {
                const on = styles.includes(style.id)
                return (
                  <button
                    key={style.id}
                    onClick={() => toggle(styles, setStyles, style.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${on ? 'bg-[#FFF0EB] border-[rgba(232,68,10,0.25)]' : 'bg-white border-[rgba(0,0,0,0.08)]'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${on ? 'bg-[#FFF0EB]' : 'bg-[#F8F7F5]'}`}>{style.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">{style.label}</div>
                      <div className="text-[12px] text-[#9B9B9B]">{style.sub}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-[#E8440A]' : 'bg-white border border-[rgba(0,0,0,0.15)]'}`}>
                      {on && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Pas 2 — regiuni */}
        {step === 1 && (
          <div>
            <div className="text-5xl mb-4">📍</div>
            <h1 className="font-outfit text-[24px] font-bold text-[#0F0F0F] mb-2">Unde vrei să călătorești?</h1>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">Ne ajută să-ți arătăm locurile potrivite.</p>

            <div className="flex flex-col gap-2.5">
              {REGIONS.map(region => {
                const on = regions.includes(region.id)
                return (
                  <button
                    key={region.id}
                    onClick={() => toggle(regions, setRegions, region.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${on ? 'bg-[#EEEDFB] border-[rgba(91,79,207,0.25)]' : 'bg-white border-[rgba(0,0,0,0.08)]'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${on ? 'bg-white' : 'bg-[#F8F7F5]'}`}>{region.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-outfit text-[14px] font-semibold text-[#0F0F0F]">{region.label}</div>
                      <div className="text-[12px] text-[#9B9B9B]">{region.sub}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-[#5B4FCF]' : 'bg-white border border-[rgba(0,0,0,0.15)]'}`}>
                      {on && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Pas 3 — pe cine urmărești */}
        {step === 2 && (
          <div>
            <div className="text-5xl mb-4">👋</div>
            <h1 className="font-outfit text-[24px] font-bold text-[#0F0F0F] mb-2">Urmărește câțiva călători</h1>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-2">
              Cei mai activi din comunitate. Feedul „Urmăresc&rdquo; se umple cu ce postează ei.
            </p>
            <p className="text-[12px] text-[#9B9B9B] mb-6">
              {followed.length === 0
                ? 'Recomandat: urmărește 3 ca să ai ce citi de la început.'
                : `${followed.length} ${followed.length === 1 ? 'urmărit' : 'urmăriți'} — poți continua oricând.`}
            </p>

            {loadingSuggestions ? (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="animate-spin text-[#E8440A]" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl py-10 text-center">
                <p className="text-[13px] text-[#9B9B9B]">Încă nu avem pe cine să-ți sugerăm. Ești printre primii!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {suggestions.map(u => (
                  <div key={u.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-outfit text-[14px] font-bold text-white"
                        style={{ background: colorFor(u.id) }}
                      >
                        {initialsOf(u.full_name || u.username)}
                      </div>
                      {u.is_guide && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#5B4FCF] rounded-full border-2 border-white flex items-center justify-center">
                          <Star size={9} className="text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-outfit text-[14px] font-semibold text-[#0F0F0F] truncate">
                        {u.full_name || u.username}
                      </p>
                      <p className="text-[11px] text-[#9B9B9B] truncate">
                        @{u.username} · {u.experienceCount} {u.experienceCount === 1 ? 'experiență' : 'experiențe'}
                      </p>
                    </div>
                    <FollowButton
                      targetUserId={u.id}
                      initialFollowing={false}
                      size="sm"
                      className="flex-shrink-0"
                      onChange={following =>
                        setFollowed(prev => (following ? [...prev, u.id] : prev.filter(x => x !== u.id)))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-7">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="bg-white border border-[rgba(0,0,0,0.08)] text-[#6B6B6B] font-outfit text-[15px] font-medium py-4 px-6 rounded-full"
            >
              Înapoi
            </button>
          )}
          <button
            onClick={next}
            disabled={!canProceed() || saving}
            className="flex-1 bg-[#E8440A] text-white font-outfit text-[15px] font-bold py-4 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {step === TOTAL_STEPS - 1 ? 'Gata, intră în Pocoloco' : 'Continuă'}
          </button>
        </div>
      </div>
    </div>
  )
}
