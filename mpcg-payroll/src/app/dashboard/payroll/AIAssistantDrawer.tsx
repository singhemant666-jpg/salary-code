'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { askPayrollAIAction } from '@/actions/ai';
import { getMonthName } from '@/lib/currency-utils';
import { MessageSquare, Send, X, Bot, Loader2, Sparkles, User, CornerDownLeft } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AIAssistantDrawer({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I am your **MPCG AI Payroll Assistant** for **${getMonthName(month)} ${year}**.\n\nYou can ask me anything about employee salaries, under-time shortfall deductions, overtime calculations, missing punches, or joining salary holds.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || loading) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMessages);
    setLoading(true);

    const res = await askPayrollAIAction(userText, month, year);
    if (res.success && res.answer) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ Error: ${res.message || 'Unable to process query.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    setLoading(false);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputQuery(prompt);
  };

  const drawerContent = isOpen ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '100vw',
        height: '100vh',
        backgroundColor: '#0B1120',
        borderLeft: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.6)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.25)',
              color: '#818cf8',
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>AI Payroll Assistant</h3>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              {getMonthName(month)} {year} Context Active
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '88%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                backgroundColor: m.role === 'user' ? '#4F46E5' : 'rgba(30, 41, 59, 0.8)',
                border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#F8FAFC',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem', padding: '0 0.25rem' }}>
              {m.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontSize: '0.85rem' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Thinking & analyzing payroll data...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div
        style={{
          padding: '0.5rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          backgroundColor: '#070B14',
        }}
      >
        {[
          'Who has short hours deductions?',
          "Explain Hardi's salary",
          'Who had joining hold applied?',
          'Check missing punches',
        ].map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleQuickPrompt(prompt)}
            style={{
              fontSize: '0.725rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#A5B4FC',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: '#090D16',
        }}
      >
        <input
          type="text"
          placeholder="Ask a question about this month's payroll..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            backgroundColor: '#1E293B',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="btn btn-primary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 0.85rem',
            background: '#4F46E5',
            border: 'none',
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontWeight: 600,
          padding: '0.45rem 0.85rem',
        }}
      >
        <MessageSquare size={15} />
        Ask AI
      </button>

      {typeof document !== 'undefined' && createPortal(drawerContent, document.body)}
    </>
  );
}
