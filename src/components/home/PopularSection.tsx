'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ArrowUp, ArrowDown, Eye, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { formatCount, timeAgo } from '@/lib/utils'

type Post = {
  id: string
  content: string
  images: string[]
  rating_experience: number
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  author: {
    full_name: string
    is_guide: boolean
  }
  location: {
    id: string
    name: string
    city: string
    status: string
  }
}

export default function PopularSection() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      const supabase = createClient()
      // !inner + filtrul pe location.status => experiențele din locații
      // neaprobate (pending/rejected) nu apar deloc în feed
      const { data, error } = await supabase
        .from('experiences')
        .select(`
          id, content, images, rating_experience,
          upvotes, downvotes, comment_count, created_at,
          author:profiles!author_id(full_name, is_guide),
          location:locations!location_id!inner(id, name, city, status)
        `)
        .eq('status', 'active')
        .eq('location.status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setPosts(data as unknown as Post[])
      }
      setLoading(false)
    }
    fetchPosts()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-[#E8440A]" />
    </div>
  )

  if (posts.length === 0) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🌍</div>
      <p className="font-outfit text-[16px] font-semibold text-[#0F0F0F] mb-1">Nicio experiență încă</p>
      <p className="text-[13px] text-[#9B9B9B] mb-4">Fii primul care adaugă o experiență!</p>
      <Link href="/add-experience" className="inline-flex bg-[#E8440A] text-white font-outfit text-sm font-semibold px-5 py-2.5 rounded-full">
        + Adaugă experiență
      </Link>
    </div>
  )

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit text-lg font-semibold text-[#0F0F0F]">Recent adăugate</h2>
      </div>
      <div className="flex flex-col gap-3">
        {posts.map(post => {
          const initials = post.author?.full_name
            ?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'
          return (
            <Link
              key={post.id}
              href={`/location/${post.location?.id}`}
              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden block hover:border-[rgba(0,0,0,0.15)] transition-colors"
            >
              <div className="p-3.5 pb-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#E8440A] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-[#0F0F0F]">{post.author?.full_name}</span>
                      {post.author?.is_guide && (
                        <span className="text-[10px] bg-[#EEEDFB] text-[#5B4FCF] px-1.5 py-0.5 rounded-full font-medium">Ghid</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#9B9B9B]">
                      <span className="bg-[#FFF0EB] text-[#E8440A] px-1.5 py-0.5 rounded-full font-outfit font-semibold text-[10px]">Experienta</span>
                      <span>📍 {post.location?.name}{post.location?.city ? `, ${post.location.city}` : ''}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9B9B9B]">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-[14px] text-[#0F0F0F] leading-relaxed line-clamp-3">{post.content}</p>
              </div>

              {post.images && post.images.length > 0 && (
                <div className="flex gap-1.5 px-3.5 pb-3">
                  {post.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ))}
                </div>
              )}

              <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                    <MessageCircle size={12} /> {formatCount(post.comment_count)}
                  </div>
                  <div className="flex items-center gap-1 bg-[#EEEDFB] text-[#5B4FCF] rounded-full px-2.5 py-1 text-[12px]">
                    <ArrowUp size={12} /> {formatCount(post.upvotes)}
                  </div>
                  <div className="flex items-center gap-1 bg-[#F8F7F5] border border-[rgba(0,0,0,0.08)] rounded-full px-2.5 py-1 text-[12px] text-[#6B6B6B]">
                    <ArrowDown size={12} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#6B6B6B]">
                  <Eye size={13} /> Deschide
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
