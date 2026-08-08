import type { MetadataRoute } from 'next'
import { PRIVATE_EXACT, PRIVATE_PREFIXES, SITE_URL } from '@/lib/seo'

/**
 * Crawlerele AI sunt permise explicit, nu doar prin lipsa unei interdicții.
 *
 * Motivul e același cu cel pentru care vizitatorul nelogat vede tot:
 * conținutul e marketingul. Pentru o nișă în română, citările din
 * răspunsurile AI sunt un canal care crește mai repede decât rezultatele
 * clasice — decis august 2026.
 *
 * Google-Extended nu e un crawler: e steagul prin care Google separă
 * antrenarea Gemini de indexarea Search. Îl trecem tot pe „allow", ca
 * decizia să fie scrisă, nu dedusă din tăcere.
 */
const AI_AGENTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

export default function robots(): MetadataRoute.Robots {
  // aceleași căi ca meta-tagurile noindex: o singură listă, în lib/seo
  const disallow = [...PRIVATE_PREFIXES, ...PRIVATE_EXACT]

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_AGENTS.map(userAgent => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
