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

export type InferenceFailure = {
  provider: string
  status?: number
  message: string
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

/** Prefer OpenRouter when configured, then NVIDIA, HuggingFace, and Moonshot. */
export function inferenceEndpoints(): InferenceEndpoint[] {
  const directMoonshotKey = readEnv('KIMI_API_KEY') || readEnv('MOONSHOT_API_KEY')
  const nvidia: InferenceEndpoint = {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: readEnv('NVIDIA_API_KEY'),
    model: readEnv('NVIDIA_MODEL') || 'moonshotai/kimi-k3',
    name: 'NVIDIA (Kimi K3)',
  }
  const openRouter: InferenceEndpoint = {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: readEnv('OPENROUTER_API_KEY'),
    model: readEnv('OPENROUTER_MODEL') || 'openai/gpt-4o',
    name: 'OpenRouter (GPT-4o)',
  }
  const huggingFace: InferenceEndpoint = {
    url: 'https://router.huggingface.co/v1/chat/completions',
    key: readEnv('HF_TOKEN'),
    model: readEnv('HF_MODEL') || 'moonshotai/Kimi-K3',
    name: 'HuggingFace (Kimi K3)',
  }

  return [
    openRouter,
    nvidia,
    huggingFace,
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
  failures?: InferenceFailure[]
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
  const failures: InferenceFailure[] = []

  for (const endpoint of inferenceEndpoints()) {
    if (!endpoint.key) {
      failures.push({ provider: endpoint.name, message: 'API key is not configured.' })
      continue
    }

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${endpoint.key}`,
          Accept: 'application/json',
          ...(endpoint.url.includes('openrouter.ai')
            ? {
                'HTTP-Referer': readEnv('OPENROUTER_SITE_URL') || 'http://localhost:3000',
                'X-Title': readEnv('OPENROUTER_SITE_NAME') || 'AgentFlow',
              }
            : {}),
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

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        let message = body.slice(0, 300).replace(/\s+/g, ' ').trim()
        try {
          const parsed = JSON.parse(body) as { error?: string; message?: string; detail?: string }
          message = parsed.error || parsed.message || parsed.detail || message
        } catch {
          // Keep the bounded response text for non-JSON provider errors.
        }
        failures.push({
          provider: endpoint.name,
          status: response.status,
          message: message || response.statusText || 'Provider rejected the request.',
        })
        continue
      }

      const data = await response.json().catch(() => null)
      const text = data?.choices?.[0]?.message?.content

      if (typeof text === 'string' && text.trim().length > 0) {
        return { text, model: endpoint.model, provider: endpoint.name, ok: true, failures }
      }
      failures.push({ provider: endpoint.name, status: 502, message: 'Provider returned no text.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Timeout or transport failure — try the next provider.
      failures.push({ provider: endpoint.name, message: message.slice(0, 300) })
      continue
    }
  }

  return { text: '', model: null, provider: null, ok: false, failures }
}

/** True when at least one provider is actually configured in this environment. */
export function hasInferenceProvider(): boolean {
  return inferenceEndpoints().some((endpoint) => Boolean(endpoint.key))
}
