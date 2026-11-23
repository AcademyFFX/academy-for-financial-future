"use client";

import { useMemo } from "react";

const previewPolicy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'">`;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function previewDocument(source: string) {
  const html = source.trim();
  if (!/<[a-z][\s\S]*?>/i.test(html)) {
    return `<!doctype html><html><head>${previewPolicy}<style>body{font:16px/1.7 Georgia,serif;color:#14283e;padding:24px;white-space:pre-wrap}</style></head><body>${escapeHtml(html)}</body></html>`;
  }
  // Keep the academic manuscript unmodified in the database. Restrict active content
  // in an isolated, script-disabled iframe, including external asset requests.
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (head) => `${head}${previewPolicy}`);
  }
  return `<!doctype html><html><head>${previewPolicy}<style>body{font:16px/1.7 Georgia,serif;color:#14283e;padding:24px}</style></head><body>${html}</body></html>`;
}

export function LessonHtmlPreview({ content, title }: { content: string; title: string }) {
  const srcDoc = useMemo(() => previewDocument(content), [content]);
  if (!content.trim()) return <p className="text-sm text-ink/70">No lesson content saved yet.</p>;
  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox=""
      referrerPolicy="no-referrer"
      loading="lazy"
      className="h-[800px] w-full border border-gold-500/25 bg-white"
    />
  );
}
