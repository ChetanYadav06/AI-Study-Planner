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
  Loader2
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

  useEffect(() => {
    if (!query.topic && (activeRoadmap?.topic || activeRoadmap?.title)) {
      setSelectedTopic(activeRoadmap.topic || activeRoadmap.title);
    }
  }, [activeRoadmap, query.topic]);

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
            content: `Hello ${user?.name || 'there'}! I am your AI Study Tutor. Ask me any question, request concept explanations, take a rapid quiz, or click any prompt chip below to accelerate your learning.`,
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

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0];
  }, [conversations, activeConvId]);

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
          content: `Ready for a new session on **${selectedTopic || 'your learning goals'}**! What concept or problem shall we tackle?`,
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

  // Send message
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

    // Update state with user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          const isFirstUserMsg = c.messages.filter((m) => m.role === 'user').length === 0;
          return {
            ...c,
            title: isFirstUserMsg ? textToSend.slice(0, 36) : c.title,
            messages: [...c.messages, newUserMessage]
          };
        }
        return c;
      })
    );

    setInputMessage('');
    setLoadingReply(true);

    try {
      // Augment message with uploaded study notes context if available
      const notesContext = getStudentNotesContext();
      let queryMessage = textToSend;
      if (notesContext && notesContext.trim()) {
        const trimmedNotes = notesContext.length > 2500 ? notesContext.slice(0, 2500) + '\n...[additional notes truncated]' : notesContext;
        queryMessage = `[STUDENT'S UPLOADED STUDY NOTES CONTEXT:\n${trimmedNotes}\n]\n\nSTUDENT QUESTION / PROMPT:\n${textToSend}`;
      }

      const response = await sendAssistantChatMessage({
        message: queryMessage,
        topic: selectedTopic,
        action: actionType
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

  // Quick Action Chips from Section 6
  const promptChips = [
    { label: 'Quiz me', icon: HelpCircle, action: 'quiz', prompt: `Quiz me on ${selectedTopic}. Ask 3 challenging conceptual multiple-choice questions with answers revealed at the end.` },
    { label: 'Explain a concept', icon: BookOpen, action: 'explain', prompt: `Explain the core conceptual foundation of ${selectedTopic} using simple analogies and clean code examples.` },
    { label: 'Summarize topic', icon: FileText, action: 'summary', prompt: `Provide a high-impact executive summary and key takeaways for ${selectedTopic}.` },
    { label: 'Practice problems', icon: Code, action: 'practice', prompt: `Give me 2 practical coding and architectural problem drills on ${selectedTopic} to test my skills.` },
    { label: 'Revision notes', icon: Layers, action: 'revision', prompt: `Generate concise revision cheat-sheet notes and common pitfall warnings for ${selectedTopic}.` },
    { label: 'What should I study next?', icon: Compass, action: 'next', prompt: `Based on studying ${selectedTopic}, what logical prerequisites or next topics should I master next?` },
  ];

  return (
    <div className="h-[calc(100vh-var(--header-h,3.5rem)-2rem)] max-w-7xl mx-auto flex gap-4 select-none">
      {/* ── LEFT: CONVERSATION SIDEBAR ── */}
      <div className="w-64 sm:w-72 shrink-0 bg-surface border border-line rounded-xl flex flex-col justify-between overflow-hidden hidden md:flex">
        {/* New Chat Button Header */}
        <div className="p-3.5 border-b border-line space-y-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleNewChat}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Button>

          {/* Topic Context Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Active Study Context
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full p-2 text-xs rounded-lg bg-surface-secondary border border-line text-ink focus:border-accent outline-none font-medium truncate cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y-0">
          <span className="text-[10px] font-bold text-muted/70 px-2 py-1 uppercase tracking-wider block">
            Recent Conversations
          </span>
          {conversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-accent/15 text-white border border-accent/40 font-semibold'
                    : 'text-muted hover:text-ink hover:bg-surface-secondary border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} />
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
      <Card className="flex-1 flex flex-col justify-between overflow-hidden border border-border bg-surface-1">
        {/* Chat Window Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface-2/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[10px] bg-accent-solid flex items-center justify-center text-white shrink-0">
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
                <span>Context: <span className="text-accent font-medium">{selectedTopic}</span></span>
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
                      ? 'bg-accent-solid text-white'
                      : 'bg-surface-2 text-accent border border-border'
                  }`}
                >
                  {isUser ? (user?.name ? user.name.charAt(0).toUpperCase() : 'U') : <Sparkles className="w-4 h-4 text-accent" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-[14px] text-sm leading-relaxed space-y-2 select-text ${
                    isUser
                      ? 'bg-accent-solid text-white rounded-tr-xs max-w-lg'
                      : 'bg-surface-secondary/80 border border-line text-ink rounded-tl-xs flex-1'
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
              <div className="w-8 h-8 rounded-full bg-surface-secondary border border-line flex items-center justify-center text-accent shrink-0">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-xs bg-surface-secondary/80 border border-line flex items-center gap-2 text-xs text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span>Gemini is synthesizing explanation...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── BOTTOM: QUICK CHIPS + MESSAGE INPUT ── */}
        <div className="p-3 sm:p-4 border-t border-line bg-surface-secondary/60 space-y-3 shrink-0">
          {/* Quick Prompt Action Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {promptChips.map((chip) => {
              const ChipIcon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendMessage(chip.prompt, chip.action)}
                  className="px-3 py-1 rounded-full bg-surface-2 border border-border hover:border-accent text-xs font-medium text-text-muted hover:text-text transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
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
              placeholder={`Ask anything about ${selectedTopic}... (Enter to send)`}
              disabled={loadingReply}
              className="flex-1 p-3 text-sm rounded-[10px] bg-surface-2 border border-border text-text placeholder:text-text-muted/70 focus:border-accent outline-none font-medium transition-colors"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!inputMessage.trim() || loadingReply}
              className="px-4"
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
