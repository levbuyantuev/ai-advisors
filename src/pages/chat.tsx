import { useState, useRef, useEffect, useCallback } from 'react';
import { useRoute, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Send, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SimpleMarkdown } from '@/components/SimpleMarkdown';
import { useStore } from '@/lib/store';
import type { Message, Agent } from '@/lib/types';

const AGENT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};

const AGENT_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Скопировано' : 'Копировать'}</TooltipContent>
    </Tooltip>
  );
}

function ThinkingIndicator({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-start gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-sm ${AGENT_COLORS[agent.color] || AGENT_COLORS.blue}`}>
        {agent.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{agent.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{agent.role}</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Думает...</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, agent }: { message: Message; agent?: Agent }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 group relative">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <div className="absolute -left-8 top-1">
            <CopyButton text={message.content} />
          </div>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="flex items-start gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 group">
      <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-sm ${AGENT_COLORS[agent.color] || AGENT_COLORS.blue}`}>
        {agent.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{agent.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{agent.role}</Badge>
          <CopyButton text={message.content} />
        </div>
        <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-2.5">
          <SimpleMarkdown content={message.content} />
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [, params] = useRoute('/chat/:id');
  const roomId = params?.id;
  const { getRoom, addMessage } = useStore();
  const room = getRoom(roomId || '');

  const [input, setInput] = useState('');
  const [thinkingAgents, setThinkingAgents] = useState<Set<string>>(new Set());
  const [streamedMessages, setStreamedMessages] = useState<Message[]>([]);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [room?.messages, streamedMessages, thinkingAgents, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !roomId || !room || thinkingAgents.size > 0) return;

    const userMessage = input.trim();
    setInput('');
    setThinkingAgents(new Set(room.agents.map((a) => a.id)));
    setStreamedMessages([]);
    setErrors(new Map());

    // Add user message to store
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    addMessage(roomId, userMsg);

    try {
      // Build history from stored messages (last 10)
      const history = room.messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          agents: room.agents,
          history,
        }),
      });

      if (response.status === 429) {
        toast({ title: 'Лимит запросов', description: 'Подождите минуту.', variant: 'destructive' });
        setThinkingAgents(new Set());
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'message') {
              // Save to store and show
              addMessage(roomId, data.message);
              setStreamedMessages((prev) => [...prev, data.message]);
              setThinkingAgents((prev) => {
                const next = new Set(prev);
                next.delete(data.message.agentId);
                return next;
              });
            } else if (data.type === 'error') {
              setErrors((prev) => new Map(prev).set(data.agentId, data.error));
              setThinkingAgents((prev) => {
                const next = new Set(prev);
                next.delete(data.agentId);
                return next;
              });
            } else if (data.type === 'done') {
              setThinkingAgents(new Set());
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      toast({ title: 'Ошибка соединения', description: 'Не удалось отправить сообщение.', variant: 'destructive' });
      setThinkingAgents(new Set());
    }

    // Clear streamed messages since they are now in store
    setStreamedMessages([]);
  }, [input, roomId, room, thinkingAgents, toast, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Комната не найдена</p>
        <Link href="/">
          <Button variant="outline">На главную</Button>
        </Link>
      </div>
    );
  }

  const agentMap = new Map(room.agents.map((a) => [a.id, a]));
  // Show stored messages, deduplicate with any still-streaming ones
  const storedIds = new Set(room.messages.map((m) => m.id));
  const extraStreamed = streamedMessages.filter((m) => !storedIds.has(m.id));
  const allMessages = [...room.messages, ...extraStreamed];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{room.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {room.agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${AGENT_DOT_COLORS[agent.color]}`} />
                <span className="text-[10px] text-muted-foreground">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {allMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 className="text-base font-medium mb-1">Задайте вопрос совету</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ваши советники ({room.agents.map((a) => a.name).join(', ')}) готовы помочь.
              </p>
            </div>
          )}

          {allMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              agent={message.agentId ? agentMap.get(message.agentId) : undefined}
            />
          ))}

          {Array.from(thinkingAgents).map((agentId) => {
            const agent = agentMap.get(agentId);
            return agent ? <ThinkingIndicator key={agentId} agent={agent} /> : null;
          })}

          {Array.from(errors.entries()).map(([agentId, error]) => {
            const agent = agentMap.get(agentId);
            if (!agent) return null;
            return (
              <div key={`error-${agentId}`} className="flex items-start gap-3 animate-in fade-in-0">
                <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-sm ${AGENT_COLORS[agent.color]}`}>
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{agent.name}</span>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-2xl rounded-tl-md px-4 py-2.5 mt-1">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Опишите ситуацию или задайте вопрос..."
              className="min-h-[44px] max-h-[160px] resize-none text-sm"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || thinkingAgents.size > 0}
              size="sm"
              className="h-[44px] px-4"
            >
              {thinkingAgents.size > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
