import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  HelpCircle,
  BookOpen,
  FileText,
  Code,
  Compass,
  Layers,
  ArrowRight,
  Bot,
  User,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';
import { sendAssistantChatMessage } from '../../services/api';
import { getStudentNotesContext } from './SavedResourcesView';
import { SafeMarkdown } from '../roadmap/SafeMarkdown';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  getTutorLearningContext,
  clearTutorLearningContext,
  buildQuizPrompt,
  formatContextForAssistant
} from '../../services/aiTutorContextService';

export const AiAssistantView = () => {
  const { user } = useAuth();
  const { query } = useRouter();
  const { roadmaps = [], activeRoadmap } = useData();

  const currentUserId = user?.id || 'guest';
  const storageKey = `ai_study_chat_history_${currentUserId}`;

  // Extract all topics, prioritizing the active roadmap first
  const availableTopics = useMemo(() => {
    const list = [];
    const orderedRoadmaps = activeRoadmap
      ? [activeRoadmap, ...roadmaps.filter((r) => r.id !== activeRoadmap.id)]
      : roadmaps;

    orderedRoadmaps.forEach((r) => {
      let parsed = r;
      if (r.roadmapJson) {
        try {
          parsed = typeof r.roadmapJson === 'string' ? JSON.parse(r.roadmapJson) : r.roadmapJson;
        } catch {}
      }
      if (parsed.phases) {
        parsed.phases.forEach((p) => {
          if (p.dailyTasks) {
            p.dailyTasks.forEach((t) => {
              if (t.title && !list.includes(t.title)) {
                list.push(t.title);
              }
            });
          }
        });
      }
    });
    return list;
  }, [roadmaps, activeRoadmap]);

  // Default context prioritizes active roadmap
  const defaultContext = useMemo(() => {
    if (query.topic) return decodeURIComponent(query.topic);
    if (activeRoadmap?.topic || activeRoadmap?.title) return activeRoadmap.topic || activeRoadmap.title;
    return availableTopics[0] || 'General Computer Science';
  }, [query.topic, activeRoadmap, availableTopics]);

  // Active topic filter/context
  const [selectedTopic, setSelectedTopic] = useState(defaultContext);

  // Active learning context passed from Day/Topic interactions
  const [learningContext, setLearningContext] = useState(() => getTutorLearningContext());

  // Conversations history list
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'conv-default',
        title: query.topic ? decodeURIComponent(query.topic) : 'Welcome & Orientation',
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: `Welcome${user?.name ? ', ' + user.name : ''}. Ask any computer science or curriculum question, request deep-dive explanations with code, or take an adaptive quiz to test your mastery.`,
            createdAt: new Date().toISOString()
          }
        ]
      }
    ];
  });

  const [activeConvId, setActiveConvId] = useState(() => conversations[0]?.id || 'conv-default');
  const [inputMessage, setInputMessage] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const messagesEndRef = useRef(null);

  // Handle incoming contextual navigation from Day / Topic view
  useEffect(() => {
    const ctx = getTutorLearningContext();
    if (ctx) {
      setLearningContext(ctx);
      const targetTopic = ctx.activeTopic?.title || ctx.dayTitle || ctx.roadmapTitle;
      if (targetTopic) {
        setSelectedTopic(targetTopic);
      }

      // Generate a unique session ID for this specific day/topic
      const convId = `conv-${ctx.type}-${ctx.roadmapId || 'rm'}-d${ctx.dayNumber || '0'}-${
        ctx.activeTopic?.title ? ctx.activeTopic.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) : 'day'
      }`;

      // Mode: Quiz (Button 2: Ask AI Tutor to Test Me)
      if (query.mode === 'quiz') {
        const quizPrompt = query.prompt
          ? decodeURIComponent(query.prompt)
          : buildQuizPrompt({
              topicTitle: ctx.activeTopic?.title || ctx.dayTitle,
              dayNumber: ctx.dayNumber,
              roadmapTitle: ctx.roadmapTitle,
              skillLevel: ctx.skillLevel
            });

        // Insert prompt directly into chat input for student to review or edit
        setInputMessage(quizPrompt);

        setConversations((prev) => {
          const existing = prev.find((c) => c.id === convId);
          if (existing) {
            setActiveConvId(convId);
            return prev;
          }
          const newConv = {
            id: convId,
            title: `Quiz: ${ctx.activeTopic?.title || 'Day ' + ctx.dayNumber}`,
            learningContext: ctx,
            createdAt: new Date().toISOString(),
            messages: [
              {
                id: `m-init-${Date.now()}`,
                role: 'assistant',
                content: `Ready for your quiz on **${ctx.activeTopic?.title || ctx.dayTitle}**.\n\nYour quiz prompt has been prepared below. Review or adjust it, then click **Send** to begin.`,
                createdAt: new Date().toISOString()
              }
            ]
          };
          setActiveConvId(convId);
          return [newConv, ...prev];
        });
      }

      // Mode: Day Q&A (Button 1: Ask AI Tutor about Day [N])
      else if (query.mode === 'day-qa') {
        setInputMessage('');
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === convId);
          if (existing) {
            setActiveConvId(convId);
            return prev;
          }
          const newConv = {
            id: convId,
            title: `Day ${ctx.dayNumber}: ${ctx.dayTitle}`,
            learningContext: ctx,
            createdAt: new Date().toISOString(),
            messages: [
              {
                id: `m-init-${Date.now()}`,
                role: 'assistant',
                content: `Studying Day ${ctx.dayNumber}: **${ctx.dayTitle}** (${ctx.roadmapTitle}). What concept, code logic, or problem would you like to explore?`,
                createdAt: new Date().toISOString()
              }
            ]
          };
          setActiveConvId(convId);
          return [newConv, ...prev];
        });
      }

      // Mode: Topic Q&A (Specific topic within day)
      else if (query.mode === 'topic-qa') {
        setInputMessage('');
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === convId);
          if (existing) {
            setActiveConvId(convId);
            return prev;
          }
          const newConv = {
            id: convId,
            title: `Study: ${ctx.activeTopic?.title || 'Topic'}`,
            learningContext: ctx,
            createdAt: new Date().toISOString(),
            messages: [
              {
                id: `m-init-${Date.now()}`,
                role: 'assistant',
                content: `Studying **${ctx.activeTopic?.title}** (Day ${ctx.dayNumber} · ${ctx.roadmapTitle}). Ask any question or request code explanations, edge cases, and architectural breakdowns.`,
                createdAt: new Date().toISOString()
              }
            ]
          };
          setActiveConvId(convId);
          return [newConv, ...prev];
        });
      }
    }
  }, [query.mode, query.prompt]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0];
  }, [conversations, activeConvId]);

  // Active effective learning context (from conversation or session)
  const currentLearningContext = useMemo(() => {
    return activeConversation?.learningContext || learningContext || null;
  }, [activeConversation, learningContext]);

  // Clear active context
  const handleClearContext = () => {
    clearTutorLearningContext();
    setLearningContext(null);
  };

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Could not save chat history to localStorage:', e);
    }
  }, [conversations, storageKey]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, loadingReply]);

  // Start a new chat session
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv = {
      id: newId,
      title: selectedTopic ? `Study: ${selectedTopic}` : 'New Study Session',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          content: `New study session on **${selectedTopic || 'computer science'}**. Ask any question to begin.`,
          createdAt: new Date().toISOString()
        }
      ]
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
  };

  // Delete a conversation
  const handleDeleteConversation = (e, id) => {
    e.stopPropagation();
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        return [
          {
            id: `conv-${Date.now()}`,
            title: 'New Study Session',
            createdAt: new Date().toISOString(),
            messages: [
              {
                id: 'm-init',
                role: 'assistant',
                content: 'Chat session reset. What shall we learn next?',
                createdAt: new Date().toISOString()
              }
            ]
          }
        ];
      }
      return filtered;
    });
    if (activeConvId === id) {
      setActiveConvId(conversations.find((c) => c.id !== id)?.id || 'conv-default');
    }
  };

  // Send message with automatic learning context
  const handleSendMessage = async (customText = null, actionType = 'chat') => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loadingReply) return;

    const userMessageId = `msg-user-${Date.now()}`;
    const newUserMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    // Update state with visible user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          const isFirstUserMsg = c.messages.filter((m) => m.role === 'user').length === 0;
          return {
            ...c,
            title: isFirstUserMsg && !c.title.startsWith('Quiz:') && !c.title.startsWith('Day ')
              ? textToSend.slice(0, 36)
              : c.title,
            messages: [...c.messages, newUserMessage]
          };
        }
        return c;
      })
    );

    setInputMessage('');
    setLoadingReply(true);

    try {
      // 1. Augment with active Day/Topic study context
      let formattedPrompt = formatContextForAssistant(currentLearningContext, textToSend);

      // 2. Augment with relevant uploaded student study notes if present
      const notesContext = getStudentNotesContext(`${selectedTopic} ${textToSend}`);
      if (notesContext && notesContext.trim()) {
        formattedPrompt = `[STUDENT'S UPLOADED STUDY MATERIALS / NOTES CONTEXT:\n${notesContext}\n]\n\n${formattedPrompt}`;
      }

      // 3. Extract recent conversation turns for multi-turn context
      const recentHistory = (activeConversation?.messages || [])
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content
        }));

      // 4. Send to existing Gemini assistant endpoint
      const response = await sendAssistantChatMessage({
        message: formattedPrompt,
        topic: currentLearningContext?.activeTopic?.title || currentLearningContext?.dayTitle || selectedTopic,
        action: actionType || (query.mode === 'quiz' ? 'quiz' : 'chat'),
        history: recentHistory
      });

      const assistantMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply || 'I processed your question. Let me know if you would like more details!',
        createdAt: new Date().toISOString()
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConvId) {
            return {
              ...c,
              messages: [...c.messages, assistantMessage]
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: `msg-ai-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Sorry, I could not complete that request right now. (${err.message || 'Network error'}). Please try again.`,
        createdAt: new Date().toISOString()
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, messages: [...c.messages, errorMessage] } : c))
      );
    } finally {
      setLoadingReply(false);
    }
  };

  // Quick Action Chips
  const promptChips = [
    { label: 'Quiz me', icon: HelpCircle, action: 'quiz', prompt: `Quiz me on ${selectedTopic}. Ask 3 challenging conceptual multiple-choice questions one at a time, and wait for my answer.` },
    { label: 'Explain with code', icon: Code, action: 'explain', prompt: `Explain the core conceptual foundation of ${selectedTopic} using simple analogies and clean code examples.` },
    { label: 'Summarize topic', icon: FileText, action: 'summary', prompt: `Provide a high-impact executive summary and key takeaways for ${selectedTopic}.` },
    { label: 'Practice problems', icon: BookOpen, action: 'practice', prompt: `Give me 2 practical coding and architectural problem drills on ${selectedTopic} to test my skills.` },
    { label: 'Revision notes', icon: Layers, action: 'revision', prompt: `Generate concise revision cheat-sheet notes and common pitfall warnings for ${selectedTopic}.` },
    { label: 'What should I study next?', icon: Compass, action: 'next', prompt: `Based on studying ${selectedTopic}, what logical prerequisites or next topics should I master next?` },
  ];

  return (
    <div className="h-[calc(100vh-var(--header-h,3.5rem)-2rem)] max-w-7xl mx-auto flex gap-4 select-none">
      {/* ── LEFT: CONVERSATION SIDEBAR ── */}
      <div className="w-64 sm:w-72 shrink-0 bg-surface-1 border border-border rounded-2xl flex flex-col justify-between overflow-hidden hidden md:flex shadow-xs">
        {/* New Chat Button Header */}
        <div className="p-3.5 border-b border-border bg-surface-2/60 space-y-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleNewChat}
            className="w-full gap-2 font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Button>

          {/* Topic Context Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Active Study Context
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-surface-1 border border-border text-text focus:border-accent outline-none font-medium truncate cursor-pointer"
            >
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="General Computer Science">General Computer Science</option>
            </select>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <span className="text-[10px] font-bold text-text-muted/70 px-2 py-1 uppercase tracking-wider block">
            Recent Conversations
          </span>
          {conversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-accent/15 text-white border border-accent/40 font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                  <span className="truncate">{conv.title || 'Untitled Session'}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:text-danger rounded transition shrink-0"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: MAIN CHAT INTERFACE ── */}
      <Card className="flex-1 flex flex-col justify-between overflow-hidden border border-border bg-surface-1 shadow-xs">
        {/* Chat Window Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface-2/60 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-accent-solid flex items-center justify-center text-white shrink-0 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-text truncate">
                    AI Study Tutor
                  </h3>
                  <Badge variant="accent" size="xs">
                    Gemini 3.5
                  </Badge>
                </div>
                <p className="text-xs text-text-muted truncate flex items-center gap-2">
                  <span>Subject: <span className="text-accent font-medium">{selectedTopic}</span></span>
                  {getStudentNotesContext() ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium bg-accent/15 px-2 py-0.5 rounded-full border border-accent/20">
                      <FileText className="w-3 h-3" />
                      <span>Using your notes</span>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Mobile New Chat trigger */}
            <div className="md:hidden">
              <Button variant="secondary" size="sm" onClick={handleNewChat}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Active Roadmap & Day Learning Context Banner */}
          {currentLearningContext && (
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-accent-solid text-white shrink-0">
                  Day {currentLearningContext.dayNumber || 1}
                </span>
                <span className="text-text font-medium truncate">
                  {currentLearningContext.activeTopic?.title || currentLearningContext.dayTitle}
                  <span className="text-text-muted ml-1 text-[11px]">
                    ({currentLearningContext.roadmapTitle})
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleClearContext}
                className="text-[11px] text-text-muted hover:text-danger flex items-center gap-1 transition cursor-pointer shrink-0"
                title="Clear day-specific learning context"
              >
                <X className="w-3 h-3" />
                <span>Clear Context</span>
              </button>
            </div>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeConversation?.messages?.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-accent-solid text-white shadow-xs'
                      : 'bg-surface-2 text-accent border border-border'
                  }`}
                >
                  {isUser ? (user?.name ? user.name.charAt(0).toUpperCase() : 'U') : <Sparkles className="w-4 h-4 text-accent" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-[14px] leading-relaxed space-y-2 select-text ${
                    isUser
                      ? 'bg-accent-solid text-white rounded-tr-xs max-w-xl shadow-xs'
                      : 'bg-surface-2 border border-border text-text rounded-tl-xs flex-1'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <SafeMarkdown content={msg.content} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Loading Indicator */}
          {loadingReply && (
            <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-accent shrink-0">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-xs bg-surface-2 border border-border flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span>Gemini is synthesizing explanation using your roadmap context...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── BOTTOM: QUICK CHIPS + MESSAGE INPUT ── */}
        <div className="p-3 sm:p-4 border-t border-border bg-surface-2/60 space-y-3 shrink-0">
          {/* Quick Prompt Action Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {promptChips.map((chip) => {
              const ChipIcon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendMessage(chip.prompt, chip.action)}
                  className="px-3 py-1 rounded-full bg-surface-1 border border-border hover:border-accent text-xs font-medium text-text-muted hover:text-text transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ChipIcon className="w-3 h-3 text-accent" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                currentLearningContext
                  ? `Ask anything about Day ${currentLearningContext.dayNumber} (${currentLearningContext.activeTopic?.title || currentLearningContext.dayTitle})...`
                  : `Ask anything about ${selectedTopic}... (Enter to send)`
              }
              disabled={loadingReply}
              className="flex-1 p-3 text-sm rounded-xl bg-surface-1 border border-border text-text placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium transition"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!inputMessage.trim() || loadingReply}
              className="px-4.5 font-semibold"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AiAssistantView;
