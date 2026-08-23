"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "space-y-2 text-sm leading-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground/70">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-md bg-foreground/8 px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-foreground/8 p-3 font-mono text-[0.85em]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-foreground/15 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <p className="text-sm font-semibold">{children}</p>,
          h2: ({ children }) => <p className="text-sm font-semibold">{children}</p>,
          h3: ({ children }) => <p className="text-sm font-semibold">{children}</p>,
          hr: () => <hr className="border-foreground/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
