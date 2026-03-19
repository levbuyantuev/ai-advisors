import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Model mapping: our internal IDs → OpenRouter model names (free tier)
const MODEL_MAP: Record<string, string> = {
  'gemini_flash': 'google/gemma-3-12b-it:free',
  'llama_70b': 'nvidia/nemotron-3-nano-30b-a3b:free',
  'llama_8b': 'arcee-ai/trinity-large-preview:free',
  'mistral_small': 'stepfun/step-3.5-flash:free',
  'qwen_72b': 'z-ai/glm-4.5-air:free',
};

// Fallback model if primary fails
const FALLBACK_MODEL = 'openrouter/free';

interface AgentRequest {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  modelId: string;
}

interface ChatRequestBody {
  message: string;
  agents: AgentRequest[];
  history?: { role: string; content: string }[];
}

async function generateResponse(
  client: OpenAI,
  agent: AgentRequest,
  userMessage: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const primaryModel = MODEL_MAP[agent.modelId] || FALLBACK_MODEL;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: agent.systemPrompt },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // Try primary model, fallback to openrouter/free on failure
  const modelsToTry = [primaryModel, FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content || 'Нет ответа.';
    } catch (err: any) {
      lastError = err;
      console.log(`[FALLBACK] ${model} failed (${err?.status || err?.message}), trying next...`);
      continue;
    }
  }

  throw lastError;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000',
      'X-Title': 'AI Советники',
    },
  });

  const { message, agents, history = [] } = req.body as ChatRequestBody;

  if (!message || !agents || agents.length === 0) {
    return res.status(400).json({ error: 'message and agents are required' });
  }

  // SSE streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Generate responses from all agents in parallel
  const promises = agents.map(async (agent) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'thinking', agentId: agent.id })}\n\n`);

      const content = await generateResponse(client, agent, message, history);

      const agentMsg = {
        id: `${agent.id}-${Date.now()}`,
        role: 'assistant',
        content,
        agentId: agent.id,
        timestamp: Date.now(),
      };

      res.write(`data: ${JSON.stringify({ type: 'message', message: agentMsg })}\n\n`);
    } catch (err: any) {
      console.error(`[LLM ERROR] agent=${agent.id} model=${agent.modelId}:`, err?.message);
      const errorMsg =
        err?.status === 429
          ? 'Лимит API исчерпан. Попробуйте через минуту.'
          : `Ошибка: ${err?.message || 'неизвестная ошибка'}`;

      res.write(`data: ${JSON.stringify({ type: 'error', agentId: agent.id, error: errorMsg })}\n\n`);
    }
  });

  await Promise.all(promises);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}
