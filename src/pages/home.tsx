import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, MessageSquare, Trash2, Sun, Moon, Users, ChevronRight } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { DEFAULT_AGENTS } from '@/lib/types';

const AGENT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

const AGENT_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { rooms, createRoom, deleteRoom } = useStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([
    'analyst',
    'optimist',
    'critic',
  ]);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      if (prev.includes(agentId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== agentId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, agentId];
    });
  };

  const handleCreate = () => {
    const agents = selectedAgentIds
      .map((id) => DEFAULT_AGENTS.find((a) => a.id === id))
      .filter(Boolean) as typeof DEFAULT_AGENTS;

    if (agents.length === 0) return;
    const room = createRoom(roomName || 'Новый совет', agents);
    setShowCreateDialog(false);
    setRoomName('');
    navigate(`/chat/${room.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col" data-testid="home-page">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="AI Advisors">
              <rect x="2" y="2" width="28" height="28" rx="8" stroke="currentColor" strokeWidth="2" className="text-primary" />
              <circle cx="11" cy="13" r="2.5" fill="currentColor" className="text-primary" />
              <circle cx="21" cy="13" r="2.5" fill="currentColor" className="text-primary" />
              <path d="M10 20c0 0 2 3 6 3s6-3 6-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
            </svg>
            <div>
              <h1 className="text-base font-semibold">AI Советники</h1>
              <p className="text-[11px] text-muted-foreground">Совет мудрых ИИ-персон</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</TooltipContent>
            </Tooltip>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Новый совет
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {rooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-medium mb-2">Соберите Совет</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Создайте комнату совета с ИИ-персонами, которые помогут вам принимать взвешенные решения. Каждый советник имеет свою роль и стиль мышления.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Создать первый совет
              </Button>
            </div>
          )}

          {rooms.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Ваши советы</h2>
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="p-0 cursor-pointer hover:bg-accent/50 transition-colors border group"
                  onClick={() => navigate(`/chat/${room.id}`)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{room.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          {room.messages.length} сообщ.
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {room.agents.map((agent) => (
                          <div key={agent.id} className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${AGENT_DOT_COLORS[agent.color]}`} />
                            <span className="text-[10px] text-muted-foreground">{agent.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <p className="text-center text-xs text-muted-foreground">
            Powered by <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline">OpenRouter</a>
          </p>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая комната совета</DialogTitle>
            <DialogDescription>Выберите советников и дайте название совету</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="room-name" className="text-sm">Название</Label>
              <Input
                id="room-name"
                placeholder="например: Стоит ли менять работу?"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">Советники ({selectedAgentIds.length}/5)</Label>
              <div className="space-y-2 mt-2">
                {DEFAULT_AGENTS.map((agent) => {
                  const isSelected = selectedAgentIds.includes(agent.id);
                  return (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-accent/50'
                      }`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleAgent(agent.id)} />
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm ${AGENT_COLORS[agent.color]}`}>
                        {agent.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{agent.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{agent.role}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {agent.systemPrompt.slice(0, 80)}...
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={selectedAgentIds.length === 0}>
              Создать совет
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
