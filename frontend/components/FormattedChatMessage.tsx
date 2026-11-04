'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormattedChatMessageProps {
  content: string;
}

export default function FormattedChatMessage({ content }: FormattedChatMessageProps) {
  if (!content) return null;

  // Tokenize content into LaTeX blocks vs Markdown text:
  // 1. Display math: $$...$$ or \[...\]
  // 2. Inline math: $...$ or \(...\)
  const tokens: Array<{ type: 'math-display' | 'math-inline' | 'markdown'; text: string }> = [];

  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$[^\$\n]+?\$|\\\(.+?\\\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'markdown', text: content.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('$$')) {
      tokens.push({ type: 'math-display', text: raw.slice(2, -2).trim() });
    } else if (raw.startsWith('\\[')) {
      tokens.push({ type: 'math-display', text: raw.slice(2, -2).trim() });
    } else if (raw.startsWith('$')) {
      tokens.push({ type: 'math-inline', text: raw.slice(1, -1).trim() });
    } else if (raw.startsWith('\\(')) {
      tokens.push({ type: 'math-inline', text: raw.slice(2, -2).trim() });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: 'markdown', text: content.slice(lastIndex) });
  }

  return (
    <div className="chat-markdown-body" style={{ fontSize: 13, lineHeight: 1.65, wordBreak: 'break-word' }}>
      {tokens.map((token, idx) => {
        if (token.type === 'math-display') {
          try {
            const html = katex.renderToString(token.text, { displayMode: true, throwOnError: false });
            return (
              <div
                key={idx}
                dir="ltr"
                style={{ margin: '8px 0', overflowX: 'auto', textAlign: 'center' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <div key={idx} dir="ltr" style={{ margin: '8px 0', textAlign: 'center', color: '#38bdf8' }}>
                $${token.text}$$
              </div>
            );
          }
        }

        if (token.type === 'math-inline') {
          try {
            const html = katex.renderToString(token.text, { displayMode: false, throwOnError: false });
            return (
              <span
                key={idx}
                dir="ltr"
                style={{ display: 'inline-block', margin: '0 2px' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <span key={idx} dir="ltr" style={{ color: '#38bdf8' }}>
                ${token.text}$
              </span>
            );
          }
        }

        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ ...props }) => (
                <div style={{ overflowX: 'auto', margin: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} {...props} />
                </div>
              ),
              thead: ({ ...props }) => <thead style={{ background: 'rgba(99,102,241,0.22)' }} {...props} />,
              th: ({ ...props }) => (
                <th style={{ border: '1px solid rgba(255,255,255,0.18)', padding: '6px 10px', textAlign: 'start', color: '#c7d2fe', fontWeight: 700 }} {...props} />
              ),
              td: ({ ...props }) => (
                <td style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', textAlign: 'start' }} {...props} />
              ),
              h1: ({ ...props }) => <h1 style={{ fontSize: 15.5, fontWeight: 800, margin: '8px 0 4px', color: '#38bdf8' }} {...props} />,
              h2: ({ ...props }) => <h2 style={{ fontSize: 14.5, fontWeight: 800, margin: '8px 0 4px', color: '#818cf8' }} {...props} />,
              h3: ({ ...props }) => <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: '6px 0 4px', color: '#c7d2fe' }} {...props} />,
              strong: ({ ...props }) => <strong style={{ color: '#fff', fontWeight: 800 }} {...props} />,
              p: ({ ...props }) => <p style={{ margin: '4px 0' }} {...props} />,
              ul: ({ ...props }) => <ul style={{ paddingRight: 18, margin: '4px 0' }} {...props} />,
              ol: ({ ...props }) => <ol style={{ paddingRight: 18, margin: '4px 0' }} {...props} />,
              li: ({ ...props }) => <li style={{ margin: '2px 0' }} {...props} />,
              code: ({ inline, children, ...props }: any) => {
                if (inline) {
                  return (
                    <code style={{ background: 'rgba(0,0,0,0.35)', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontSize: 11.5 }} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div style={{ position: 'relative', margin: '8px 0', borderRadius: 8, overflow: 'hidden', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <pre style={{ margin: 0, padding: '10px 12px', fontSize: 11.5, overflowX: 'auto', color: '#e2e8f0' }}>
                      <code {...props}>{children}</code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {token.text}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

