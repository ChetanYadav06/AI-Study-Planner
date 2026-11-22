import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Hand-written safe Markdown renderer.
 * Strictly escapes raw HTML (no dangerouslySetInnerHTML) to prevent XSS.
 * Supports:
 * - Fenced code blocks ```lang ... ``` with copy button
 * - Headings: #, ##, ###, ####
 * - Blockquotes: >
 * - Lists: - or * or 1.
 * - Inline tokens: **bold**, *italic*, `code`, [label](url)
 */
export const SafeMarkdown = ({ content = '' }) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLanguage = '';

  const renderInline = (text, keyPrefix) => {
    // Escape or sanitize text by tokenizing:
    // Tokens: `code`, **bold**, *italic*, [text](url)
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, pIdx) => {
      const key = `${keyPrefix}-${pIdx}`;
      if (!part) return null;

      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 rounded bg-page border border-line font-mono text-[13px] text-accent"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={key} className="font-bold text-text">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={key} className="italic text-text">
            {part.slice(1, -1)}
          </em>
        );
      }

      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const url = linkMatch[2];
        const isSafeUrl = /^https?:\/\//i.test(url) || url.startsWith('/');
        if (isSafeUrl) {
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline hover:text-accent-hover font-medium"
            >
              {label}
            </a>
          );
        }
        return <span key={key}>{label}</span>;
      }

      return <span key={key}>{part}</span>;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code block fence
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = trimmed.replace(/^```/, '').trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n');
        const blockKey = `code-${i}`;
        elements.push(
          <CodeBlock
            key={blockKey}
            code={codeText}
            language={codeLanguage}
          />
        );
        codeBuffer = [];
        codeLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${i}`} className="text-[15px] sm:text-[16px] font-semibold text-text mt-3.5 mb-1.5 tracking-normal">
          {renderInline(trimmed.replace(/^####\s+/, ''), `h4-in-${i}`)}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-[16px] font-bold text-text mt-4 mb-2">
          {renderInline(trimmed.replace(/^###\s+/, ''), `h3-in-${i}`)}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-lg font-bold text-text mt-5 mb-2 pb-1 border-b border-border">
          {renderInline(trimmed.replace(/^##\s+/, ''), `h2-in-${i}`)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-xl font-bold text-text mt-6 mb-2 pb-1 border-b border-border">
          {renderInline(trimmed.replace(/^#\s+/, ''), `h1-in-${i}`)}
        </h2>
      );
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="pl-3.5 border-l-2 border-accent text-[14px] text-text-muted italic my-2 bg-surface-1 py-1.5 rounded-r"
        >
          {renderInline(trimmed.replace(/^>\s*/, ''), `quote-in-${i}`)}
        </blockquote>
      );
      continue;
    }

    // Unordered lists (bullet point text: 14-15px, comfortable leading and spacing)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-text ml-1 my-1.5 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
          <span className="leading-relaxed flex-1">
            {renderInline(trimmed.replace(/^[-*]\s+/, ''), `li-in-${i}`)}
          </span>
        </div>
      );
      continue;
    }

    // Ordered lists
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      elements.push(
        <div key={`oli-${i}`} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-text ml-1 my-1.5 leading-relaxed">
          <span className="font-semibold text-accent shrink-0 mt-0.5">{olMatch[1]}.</span>
          <span className="leading-relaxed flex-1">
            {renderInline(olMatch[2], `oli-in-${i}`)}
          </span>
        </div>
      );
      continue;
    }

    // Standard paragraph (14-15px, comfortable leading)
    elements.push(
      <p key={`p-${i}`} className="text-[14px] sm:text-[15px] text-text leading-relaxed my-2">
        {renderInline(rawLine, `p-in-${i}`)}
      </p>
    );
  }

  // Handle unclosed code block if any
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <CodeBlock
        key="code-unclosed"
        code={codeBuffer.join('\n')}
        language={codeLanguage}
      />
    );
  }

  return <div className="space-y-1">{elements}</div>;
};

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-[10px] border border-border bg-surface-2 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-1 border-b border-border text-xs text-text-muted">
        <span className="font-mono uppercase font-semibold">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-text-muted hover:text-accent font-medium cursor-pointer"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-done" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-text overflow-x-auto leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};
