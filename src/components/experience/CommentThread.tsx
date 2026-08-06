'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CornerDownRight, Loader2, Pencil, Send, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { colorFor, initialsOf } from '@/lib/profiles'
import {
  addComment,
  buildThread,
  deleteComment,
  fetchCommentsFor,
  updateComment,
  type CommentWithAuthor,
} from '@/lib/comments'
import { cn, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

export type CommentViewer = { id: string; isAdmin: boolean } | null

type Props = {
  experienceId: string
  /** dacă părintele a adus deja comentariile, nu mai facem un query */
  initialComments?: CommentWithAuthor[]
  /** userul curent; dacă lipsește, componenta îl află singură */
  viewer?: CommentViewer
  onCountChange?: (delta: number) => void
}

export default function CommentThread({
  experienceId,
  initialComments,
  viewer: viewerProp,
  onCountChange,
}: Props) {
  const router = useRouter()
  const toast = useToast()
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments || [])
  const [viewer, setViewer] = useState<CommentViewer>(viewerProp ?? null)
  const [loading, setLoading] = useState(initialComments === undefined)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (viewerProp !== undefined) setViewer(viewerProp)
  }, [viewerProp])

  useEffect(() => {
    let active = true
    const load = async () => {
      const supabase = createClient()

      if (viewerProp === undefined) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prof } = await supabase
            .from('profiles').select('role').eq('id', user.id).maybeSingle()
          if (active) setViewer({ id: user.id, isAdmin: prof?.role === 'admin' })
        } else if (active) {
          setViewer(null)
        }
      }

      if (initialComments === undefined) {
        const grouped = await fetchCommentsFor(supabase, [experienceId])
        if (active) {
          setComments(grouped[experienceId] || [])
          setLoading(false)
        }
      }
    }
    load()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceId])

  const thread = useMemo(() => buildThread(comments), [comments])

  const submit = async (content: string, parentId: string | null) => {
    if (!content.trim() || sending) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setSending(true)
    setError(null)

    const { comment, error: insertError } = await addComment(supabase, {
      experienceId,
      authorId: user.id,
      parentId,
      content,
    })

    if (insertError || !comment) {
      setError(insertError)
    } else {
      setComments(prev => [...prev, comment])
      onCountChange?.(1)
      toast(parentId ? 'Răspuns trimis' : 'Comentariu adăugat')
      if (parentId) { setReplyTo(null); setReplyDraft('') } else { setDraft('') }
    }
    setSending(false)
  }

  const remove = async (comment: CommentWithAuthor) => {
    if (!window.confirm('Ștergi comentariul? Răspunsurile la el dispar și ele.')) return

    const supabase = createClient()
    const deleteError = await deleteComment(supabase, comment.id)
    if (deleteError) { setError(deleteError); return }

    // ștergerea în cascadă din DB elimină și răspunsurile
    const removedIds = new Set([comment.id, ...comments.filter(c => c.parent_id === comment.id).map(c => c.id)])
    setComments(prev => prev.filter(c => !removedIds.has(c.id)))
    onCountChange?.(-removedIds.size)
  }

  const saveEdit = async (comment: CommentWithAuthor) => {
    if (!editDraft.trim() || sending) return

    setSending(true)
    setError(null)

    const supabase = createClient()
    const { updatedAt, error: updateError } = await updateComment(supabase, comment.id, editDraft)

    if (updateError) {
      setError(updateError)
    } else {
      setComments(prev => prev.map(c =>
        c.id === comment.id
          ? { ...c, content: editDraft.trim(), updated_at: updatedAt ?? c.updated_at }
          : c
      ))
      setEditingId(null)
      setEditDraft('')
    }
    setSending(false)
  }

  const canDelete = (comment: CommentWithAuthor) =>
    !!viewer && (viewer.id === comment.author_id || viewer.isAdmin)

  // editarea rămâne strict a autorului: adminul poate șterge, nu rescrie
  const canEdit = (comment: CommentWithAuthor) => !!viewer && viewer.id === comment.author_id

  /** Comentariul a fost modificat după publicare? */
  const wasEdited = (comment: CommentWithAuthor) =>
    !!comment.updated_at && new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 2000

  const renderComment = (comment: CommentWithAuthor, isReply: boolean) => (
    <div key={comment.id} className={cn('flex gap-2', isReply && 'pl-4 border-l-2 border-[rgba(0,0,0,0.06)]')}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
          isReply ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]'
        )}
        style={{ background: colorFor(comment.author_id) }}
      >
        {initialsOf(comment.author?.full_name || comment.author?.username)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-[#F8F7F5] border border-[rgba(0,0,0,0.06)] rounded-2xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            {comment.author?.username ? (
              <Link href={`/profile/${comment.author.username}`} className="text-[12px] font-semibold text-[#0F0F0F] hover:text-[#E8440A] truncate">
                {comment.author.full_name || comment.author.username}
              </Link>
            ) : (
              <span className="text-[12px] font-semibold text-[#0F0F0F]">User șters</span>
            )}
            <span className="text-[10px] text-[#9B9B9B]">
              {timeAgo(comment.created_at)}{wasEdited(comment) ? ' · editat' : ''}
            </span>
          </div>

          {editingId === comment.id ? (
            <div className="flex flex-col gap-2 mt-1">
              <textarea
                value={editDraft}
                onChange={e => setEditDraft(e.target.value.slice(0, 2000))}
                rows={3}
                autoFocus
                className="w-full bg-white border border-[rgba(0,0,0,0.08)] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#E8440A] transition-colors resize-none leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(comment)}
                  disabled={sending || !editDraft.trim()}
                  className="text-[11px] bg-[#E8440A] text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={11} className="animate-spin" /> : null} Salvează
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditDraft('') }}
                  className="text-[11px] text-[#9B9B9B] px-2 py-1.5 font-medium"
                >
                  Anulează
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed whitespace-pre-line break-words">{comment.content}</p>
          )}
        </div>

        {editingId !== comment.id && (
          <div className="flex items-center gap-3 mt-1 px-1">
            <button
              onClick={() => {
                // răspunsul la un răspuns rămâne pe nivelul 2, sub același părinte
                setReplyTo(comment.parent_id || comment.id)
                setReplyDraft(isReply && comment.author?.username ? `@${comment.author.username} ` : '')
              }}
              className="text-[11px] text-[#9B9B9B] font-medium hover:text-[#5B4FCF] transition-colors"
            >
              Răspunde
            </button>
            {canEdit(comment) && (
              <button
                onClick={() => { setEditingId(comment.id); setEditDraft(comment.content); setReplyTo(null) }}
                className="text-[11px] text-[#9B9B9B] font-medium hover:text-[#5B4FCF] transition-colors flex items-center gap-0.5"
              >
                <Pencil size={10} /> Editează
              </button>
            )}
            {canDelete(comment) && (
              <button
                onClick={() => remove(comment)}
                className="text-[11px] text-[#9B9B9B] font-medium hover:text-[#DC2626] transition-colors flex items-center gap-0.5"
              >
                <Trash2 size={10} /> Șterge
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const replyBox = (parentId: string) => (
    <div className="flex gap-2 pl-4 mt-2">
      <CornerDownRight size={14} className="text-[#9B9B9B] mt-2 flex-shrink-0" />
      <div className="flex-1 flex items-center gap-2">
        <input
          value={replyDraft}
          onChange={e => setReplyDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(replyDraft, parentId) }}
          autoFocus
          placeholder="Scrie un răspuns..."
          className="flex-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-full px-3 py-2 text-[13px] outline-none focus:border-[#E8440A] transition-colors placeholder:text-[#9B9B9B]"
        />
        <button
          onClick={() => submit(replyDraft, parentId)}
          disabled={sending || !replyDraft.trim()}
          className="w-8 h-8 rounded-full bg-[#5B4FCF] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
        <button
          onClick={() => { setReplyTo(null); setReplyDraft('') }}
          className="text-[11px] text-[#9B9B9B] flex-shrink-0"
        >
          Anulează
        </button>
      </div>
    </div>
  )

  return (
    <div className="px-3.5 py-3 border-t border-[rgba(0,0,0,0.06)]">
      {error && (
        <p className="text-[12px] text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2 mb-2">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={16} className="animate-spin text-[#9B9B9B]" />
        </div>
      ) : (
        thread.length > 0 && (
          <div className="flex flex-col gap-3 mb-3">
            {thread.map(node => (
              <div key={node.id} className="flex flex-col gap-2">
                {renderComment(node, false)}
                {node.replies.length > 0 && (
                  <div className="flex flex-col gap-2 pl-9">
                    {node.replies.map(reply => renderComment(reply, true))}
                  </div>
                )}
                {replyTo === node.id && replyBox(node.id)}
              </div>
            ))}
          </div>
        )
      )}

      {/* Comentariu nou */}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(draft, null) }}
          placeholder={viewer ? 'Scrie un comentariu...' : 'Intră în cont ca să comentezi'}
          className="flex-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-3.5 py-2 text-[13px] outline-none focus:border-[#E8440A] focus:bg-white transition-colors placeholder:text-[#9B9B9B]"
        />
        <button
          onClick={() => submit(draft, null)}
          disabled={sending || !draft.trim()}
          className="w-9 h-9 rounded-full bg-[#E8440A] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          aria-label="Trimite comentariul"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
