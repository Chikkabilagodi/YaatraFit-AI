import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  MapPin,
  Compass,
  AlertCircle,
  Loader2,
  MessageSquareText,
} from 'lucide-react';
import type { BudgetSummary, ChatMessage, Trip } from '../types/travel.ts';

interface YtrikaChatViewProps {
  trip: Trip;
  budgetSummary: BudgetSummary;
}

const QUICK_PROMPTS = [
  'What are the best local food spots in Mysuru?',
  'Driving tips for Charmadi and Shiradi Ghats?',
  'Must-see UNESCO heritage stops in Hampi?',
  'How do I budget for KSRTC bus travel?',
  'What are top scenic spots in Western Ghats?',
  'Can I add another stop with my remaining budget?',
];

function renderBoldInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-amber-200 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

const FormattedMessageText: React.FC<{ text: string; isUser: boolean }> = ({
  text,
  isUser,
}) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-sans">{text}</div>;
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-slate-200 font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        if (
          trimmed.startsWith('•') ||
          trimmed.startsWith('- ') ||
          trimmed.startsWith('* ')
        ) {
          const content = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-amber-400 mt-1 select-none text-xs">●</span>
              <div className="flex-1 leading-relaxed">
                {renderBoldInline(content)}
              </div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-amber-400 font-mono text-xs mt-0.5 font-semibold">
                {numMatch[1]}.
              </span>
              <div className="flex-1 leading-relaxed">
                {renderBoldInline(numMatch[2])}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderBoldInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const YtrikaChatView: React.FC<YtrikaChatViewProps> = ({
  trip,
  budgetSummary,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      role: 'model',
      text: `Namaskara! 🙏 I am **Ytrika** (ಯಾತ್ರಿಕಾ), your dedicated AI Karnataka travel companion.

I know all 31 districts of Karnataka—from royal Mysuru and the ancient boulder temples of Hampi, to misty Coorg coffee plantations, Gokarna beaches, and North Karnataka heritage.

Ask me about:
• Realistic route timings & scenic ghat drives (Charmadi, Agumbe, Shiradi)
• Authentic local delicacies (Mylari Dosa, Jolada Rotti, Mangalore Buns, Filter Coffee)
• Budget guardrails & KSRTC bus maximum charges
• Temple etiquette, darshan schedules, and safari advice

How can I help plan or refine your Karnataka journey today?`,
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const activeStops = trip.stops.filter((s) => !s.skipped);
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          text: m.text,
        })),
        context: {
          district: trip.preferences.targetDistrict,
          tripTitle: trip.title,
          plannedBudgetInr: budgetSummary.plannedTripBudgetInr,
          walletBalanceInr: budgetSummary.walletBalanceInr,
          emergencyReserveInr: budgetSummary.emergencyReserveInr,
          remainingBudgetInr: budgetSummary.remainingPlannedBudgetInr,
          transportMode: trip.preferences.transportMode,
          travellerCount: trip.preferences.travellerCount,
          stops: activeStops.map((s) => ({
            name: s.name,
            completed: s.completed,
          })),
        },
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Namaskara! How else can I assist your Karnataka yaatra?',
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Ytrika chat failed:', err);
      setErrorMessage(
        err?.message || 'Unable to connect with Ytrika. Please try again.'
      );
      const fallbackMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'model',
        text: `Namaskara! I am running in local mode right now. For authentic Karnataka travel, remember that ${trip.preferences.targetDistrict} has rich local heritage. Feel free to ask about local food, KSRTC transit, or ghat routes!`,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-welcome-fresh',
        role: 'model',
        text: 'Chat history cleared. Namaskara! What would you like to explore about Karnataka today?',
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[550px] max-w-5xl mx-auto rounded-2xl border border-white/[0.08] bg-[#090e17] overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-white/[0.08] bg-[#101726]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#090e17] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-display font-semibold text-white tracking-tight">
                Ytrika AI (ಯಾತ್ರಿಕಾ)
              </h1>
              <span className="text-xs text-amber-400/90 font-mono">
                Karnataka Travel Engine · Online
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Context-aware Karnataka specialist · Real-time route, budget & cultural advisory
            </p>
          </div>
        </div>

        {/* Current Trip Context Strip & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono tabular-nums px-3.5 py-1.5 rounded-lg bg-[#090e17] border border-white/[0.08] text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{trip.preferences.targetDistrict}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="capitalize">{trip.preferences.transportMode.replace('_', ' ')}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-300">₹{budgetSummary.plannedTripBudgetInr} Plan</span>
          </div>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-[#090e17] rounded-lg transition-all active:scale-95 cursor-pointer border border-transparent hover:border-white/[0.08]"
            title="Clear Chat History"
            aria-label="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompt Bar */}
      <div className="px-6 py-2.5 bg-[#101726]/40 border-b border-white/[0.06] overflow-x-auto flex items-center gap-2 scrollbar-none shrink-0">
        <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 whitespace-nowrap shrink-0 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          Prompt Suggestions:
        </span>
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-[#090e17] hover:bg-[#101726] border border-white/[0.08] hover:border-amber-500/40 rounded-lg transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Scrollable Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-[#101726] border border-amber-500/30 text-amber-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-1">
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-[#101726] border border-white/[0.08] text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <FormattedMessageText text={msg.text} isUser={isUser} />
                </div>
                <div
                  className={`text-[10px] text-slate-400 font-mono ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-[#101726] border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-[#101726] border border-white/[0.08] text-xs text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Ytrika is finding authentic Karnataka insights...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Sender Bar */}
      <div className="p-4 border-t border-white/[0.08] bg-[#101726]/80 backdrop-blur-md shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3 max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ytrika about places, food, routes, or budget..."
            disabled={isLoading}
            className="flex-1 bg-[#090e17] border border-white/[0.1] focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 transition-colors focus:outline-none"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 rounded-xl transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer shrink-0 font-display shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
