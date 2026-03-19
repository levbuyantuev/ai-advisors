import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Model mapping: our internal IDs → OpenRouter model names
const MODEL_MAP: Record<string, string> = {
  'gemini_flash': 'google/gemini-2.5-flash-preview',
  'llama_70b': 'meta-llama/llama-3.3-70b-instruct',
  'llama_8b': 'meta-llama/llama-3.1-8b-instruct:free',
  'mistral_small': 'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen_72b': 'qwen/qwen-2.5-72b-instruct:free',
};

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
  const model = MODEL_MAP[agent.modelId] || MODEL_MAP['llama_8b'];

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: agent.systemPrompt },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'Нет ответа.';
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
