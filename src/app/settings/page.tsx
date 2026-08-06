'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, Check, Eye, EyeOff, Loader2, LogOut, Settings as SettingsIcon, ShieldCheck } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'

type Profile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [provider, setProvider] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEmail(user.email || '')
      setProvider((user.app_metadata?.provider as string) || null)

      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        const p = data as Profile
        setProfile(p)
        setFullName(p.full_name || '')
        setBio(p.bio || '')
        setAvatarUrl(p.avatar_url)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    setProfileMessage(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('images').upload(path, file)
    if (uploadError) {
      setProfileMessage({ ok: false, text: `Poza nu a putut fi încărcată: ${uploadError.message}` })
      setAvatarPreview(null)
      setUploadingAvatar(false)
      return
    }

    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setUploadingAvatar(false)
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    setProfileMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq('id', profile.id)

    setProfileMessage(error
      ? { ok: false, text: error.message }
      : { ok: true, text: 'Profil salvat.' })
    setSavingProfile(false)
  }

  const handleChangePassword = async () => {
    if (password.length < 8) {
      setPasswordMessage({ ok: false, text: 'Parola trebuie să aibă minim 8 caractere.' })
      return
    }
    if (password !== passwordConfirm) {
      setPasswordMessage({ ok: false, text: 'Cele două parole nu sunt identice.' })
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setPasswordMessage({ ok: false, text: error.message })
    } else {
      setPasswordMessage({ ok: true, text: 'Parola a fost schimbată.' })
      setPassword('')
      setPasswordConfirm('')
    }
    setSavingPassword(false)
  }

  const handleLogout = async () => {
    if (!window.confirm('Te deconectezi de la Pocoloco?')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={28} className="animate-spin text-[#E8440A]" />
    </div>
  )

  const shownAvatar = avatarPreview || avatarUrl

  return (
    <main className="pb-nav bg-[#F0EDE8] min-h-screen">
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-5 py-3.5 sticky top-0 z-30">
        <div className="max-w-[680px] mx-auto flex items-center gap-2">
          <SettingsIcon size={18} className="text-[#E8440A]" />
          <span className="font-outfit text-[17px] font-semibold text-[#0F0F0F]">Setări</span>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-5 pt-4 flex flex-col gap-4">
        {/* Profil */}
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-4">Profilul tău</h2>

          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              {shownAvatar ? (
                <img src={shownAvatar} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-outfit text-2xl font-bold text-white"
                  style={{ background: colorFor(profile?.id || 'x') }}
                >
                  {initialsOf(fullName || profile?.username)}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#E8440A] border-2 border-white flex items-center justify-center disabled:opacity-70"
                aria-label="Schimbă poza de profil"
              >
                {uploadingAvatar
                  ? <Loader2 size={14} className="animate-spin text-white" />
                  : <Camera size={14} className="text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </div>
            <div className="min-w-0">
              <p className="font-outfit text-[15px] font-semibold text-[#0F0F0F] truncate">@{profile?.username}</p>
              <p className="text-[12px] text-[#9B9B9B] truncate">{email}</p>
              <Link href="/profile" className="text-[12px] text-[#5B4FCF] font-medium">Vezi profilul public →</Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Nume complet</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ex: Maria Popescu"
                className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6B6B6B] block mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="Câteva cuvinte despre tine și călătoriile tale"
                className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B] resize-none leading-relaxed"
              />
              <p className="text-[11px] text-[#9B9B9B] text-right mt-1">{bio.length} / 300</p>
            </div>
          </div>

          {profileMessage && (
            <p className={`text-[13px] rounded-xl px-4 py-3 mt-3 ${profileMessage.ok ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
              {profileMessage.text}
            </p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || uploadingAvatar}
            className="w-full bg-[#E8440A] text-white font-outfit text-[14px] font-bold py-3 rounded-full mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {savingProfile ? <><Loader2 size={16} className="animate-spin" /> Se salvează...</> : <><Check size={16} /> Salvează modificările</>}
          </button>
        </section>

        {/* Parolă */}
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-1">Schimbă parola</h2>
          <p className="text-[12px] text-[#9B9B9B] mb-4">
            {provider && provider !== 'email'
              ? `Contul tău e conectat prin ${provider}. Poți seta o parolă ca să intri și cu email.`
              : 'Alege o parolă de minim 8 caractere.'}
          </p>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Parolă nouă"
                className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]"
              />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2" aria-label="Arată parola">
                {showPass ? <EyeOff size={16} className="text-[#9B9B9B]" /> : <Eye size={16} className="text-[#9B9B9B]" />}
              </button>
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Confirmă parola nouă"
              className="w-full bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]"
            />
          </div>

          {passwordMessage && (
            <p className={`text-[13px] rounded-xl px-4 py-3 mt-3 ${passwordMessage.ok ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
              {passwordMessage.text}
            </p>
          )}

          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !password}
            className="w-full bg-[#EEEDFB] text-[#5B4FCF] font-outfit text-[14px] font-semibold py-3 rounded-full mt-4 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {savingPassword ? <><Loader2 size={16} className="animate-spin" /> Se salvează...</> : <><ShieldCheck size={16} /> Schimbă parola</>}
          </button>
        </section>

        {/* Cont */}
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <h2 className="font-outfit text-[15px] font-semibold text-[#0F0F0F] mb-4">Cont</h2>
          <button
            onClick={handleLogout}
            className="w-full bg-[#FEF2F2] text-[#DC2626] font-outfit text-[14px] font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Deconectează-te
          </button>
        </section>
      </div>
      <BottomNav />
    </main>
  )
}
