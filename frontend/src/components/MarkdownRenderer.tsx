import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Stabilizes streaming markdown by automatically closing unclosed code fences
 * so that incomplete markdown does not flicker or break the layout.
 */
function stabilizeStreamingMarkdown(text: string): string {
  if (!text) return '';

  const codeBlockMatches = text.match(/```/g);
  const count = codeBlockMatches ? codeBlockMatches.length : 0;

  if (count % 2 !== 0) {
    return text + '\n```';
  }

  return text;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
}) => {
  const processedContent = useMemo(() => {
    return isStreaming ? stabilizeStreamingMarkdown(content) : content;
  }, [content, isStreaming]);

  return (
    <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed break-words space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock
                  language={match ? match[1] : undefined}
                  value={codeString}
                />
              );
            }

            return (
              <code
                className="bg-surface-elevated text-zinc-200 px-1.5 py-0.5 rounded text-[12px] font-mono border border-border"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-md border border-border">
                <table className="min-w-full divide-y divide-border text-xs">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-surface-elevated text-zinc-300 font-semibold">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3 py-2 text-left tracking-wider">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 border-t border-border text-zinc-300">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-200 hover:text-white underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 my-2 text-zinc-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1 my-2 text-zinc-300">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-zinc-600 pl-3 my-2 text-zinc-400 italic">
                {children}
              </blockquote>
            );
          },
          p({ children }) {
            return <p className="leading-relaxed mb-2 last:mb-0">{children}</p>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
