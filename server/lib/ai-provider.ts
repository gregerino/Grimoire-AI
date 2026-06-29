import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AiProvider } from '../../src/types/database'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const ADMIN_USER_ID = process.env.ADMIN_USER_ID

export function resolveProvider(userId: string | undefined, campaignProvider: AiProvider = 'claude'): AiProvider {
  if (!ADMIN_USER_ID || userId === ADMIN_USER_ID) return campaignProvider
  return 'openai'
}

export async function createCompletion(opts: {
  provider: AiProvider
  model?: string
  maxTokens: number
  temperature?: number
  system?: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}): Promise<string> {
  if (opts.provider === 'claude') {
    const result = await anthropic.messages.create({
      model: opts.model || 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      ...(opts.system && { system: opts.system }),
      messages: opts.messages,
    })
    return result.content[0].type === 'text' ? result.content[0].text : ''
  }

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
    ...opts.messages,
  ]

  const isReasoning = (opts.model || 'gpt-5.5').startsWith('gpt-5')
  const result = await openai.chat.completions.create({
    model: opts.model || 'gpt-5.5',
    ...(isReasoning
      ? { max_completion_tokens: opts.maxTokens }
      : { max_tokens: opts.maxTokens, temperature: opts.temperature }),
    messages: openaiMessages,
  })

  return result.choices[0]?.message?.content || ''
}
