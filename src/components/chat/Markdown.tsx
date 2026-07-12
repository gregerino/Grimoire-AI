interface Props {
  text: string
}

export function Markdown({ text }: Props) {
  const html = renderMarkdown(text)
  return (
    <div
      className="prose-dm whitespace-pre-wrap text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(text: string): string {
  let result = escapeHtml(text)

  // Headers (### only within DM narrative context)
  result = result.replace(/^### (.+)$/gm, '<strong class="text-gold text-base block mt-3 mb-1">$1</strong>')
  result = result.replace(/^## (.+)$/gm, '<strong class="text-gold text-base block mt-3 mb-1">$1</strong>')

  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="italic text-parchment">$1</strong>')
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="text-parchment">$1</strong>')
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em class="text-gray-200">$1</em>')

  // Inline code (dice rolls, stats)
  result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-navy px-1.5 py-0.5 text-xs font-mono text-gold">$1</code>')

  // Blockquotes (NPC speech, flavor text)
  result = result.replace(
    /^&gt; (.+)$/gm,
    '<div class="border-l-2 border-gold/30 pl-3 italic text-gray-300">$1</div>',
  )

  // Horizontal rules (scene breaks)
  result = result.replace(/^---$/gm, '<div class="my-4 border-t border-navy/60"></div>')

  // Unordered lists
  result = result.replace(/^- (.+)$/gm, '<div class="flex gap-2 ml-2"><span class="text-gold/50">•</span><span>$1</span></div>')

  // Semantic highlights (danger, clue) — DM marks the single most important
  // phrase in a beat. Closed pairs render as colored spans.
  result = result.replace(/\[danger\]([\s\S]*?)\[\/danger\]/g, '<span class="hl-danger">$1</span>')
  result = result.replace(/\[clue\]([\s\S]*?)\[\/clue\]/g, '<span class="hl-clue">$1</span>')
  // Any tag left over has no matching pair yet (mid-stream) — drop the
  // marker but keep the text plain until the closing tag arrives.
  result = result.replace(/\[\/?(?:danger|clue)\]/g, '')

  return result
}
