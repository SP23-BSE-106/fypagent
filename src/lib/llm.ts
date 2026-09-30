/**
 * One place that knows how to reach the configured inference providers.
 *
 * The provider list used to live inline in the RAG chat handler and again in
 * the workflow generator, so changing a model meant editing two files — and
 * the public `/api/execute` endpoint had no model access at all, which is why
 * it could only answer with a canned "Workflow executed".
 */

export type InferenceEndpoint = {
  url: string
  key: string | undefined
  model: string
  name: string
}

/** Ordered by preference: HuggingFace router first, NVIDIA, then Moonshot. */
export function inferenceEndpoints(): InferenceEndpoint[] {
  const directMoonshotKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

  return [
    {
      url: 'https://router.huggingface.co/v1/chat/completions',
      key: process.env.HF_TOKEN,
      model: 'moonshotai/Kimi-K3:together',
      name: 'HuggingFace (Kimi K3)',
    },
    {
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      key: process.env.NVIDIA_API_KEY,
      model: 'moonshotai/kimi-k3',
      name: 'NVIDIA (Kimi K3)',
    },
    ...(directMoonshotKey
      ? [
          {
            url: 'https://api.moonshot.cn/v1/chat/completions',
            key: directMoonshotKey,
            model: 'moonshot-v1-8k',
            name: 'Moonshot Direct',
          },
        ]
      : []),
  ]
}

export type CompletionResult = {
  text: string
  model: string | null
  provider: string | null
  ok: boolean
}

/**
 * Runs one completion, walking the provider list until one accepts the request.
 *
 * Never throws and never returns a partial success: callers get `ok: false`
 * and decide how to phrase the failure, so a dead provider can't be mistaken
 * for a real answer.
 */
export async function chatCompletion(options: {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}): Promise<CompletionResult> {
  const { system, prompt, maxTokens = 1024, temperature = 0.4, timeoutMs = 30_000 } = options

  for (const endpoint of inferenceEndpoints()) {
    if (!endpoint.key) continue

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${endpoint.key}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: endpoint.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
          top_p: 0.95,
          stream: false,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) continue

      const data = await response.json().catch(() => null)
      const text = data?.choices?.[0]?.message?.content

      if (typeof text === 'string' && text.trim().length > 0) {
        return { text, model: endpoint.model, provider: endpoint.name, ok: true }
      }
    } catch {
      // Timeout or transport failure — try the next provider.
      continue
    }
  }

  return { text: '', model: null, provider: null, ok: false }
}

/** True when at least one provider is actually configured in this environment. */
export function hasInferenceProvider(): boolean {
  return inferenceEndpoints().some((endpoint) => Boolean(endpoint.key))
}
