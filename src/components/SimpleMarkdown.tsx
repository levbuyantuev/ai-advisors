/**
 * Simple markdown renderer — handles bold, italic, headers, lists, and tables.
 * No external dependencies.
 */

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  // Bold + italic
  let result = escapeHtml(text);
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');
  return result;
}

export function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const htmlParts: string[] = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      if (inTable) { htmlParts.push("</tbody></table></div>"); inTable = false; }
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<h4 class="font-semibold mt-3 mb-1 text-sm">${renderInline(trimmed.slice(4))}</h4>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<h3 class="font-semibold mt-3 mb-1 text-sm">${renderInline(trimmed.slice(3))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push(`<h2 class="font-semibold mt-2 mb-1">${renderInline(trimmed.slice(2))}</h2>`);
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      htmlParts.push('<hr class="my-2 border-border" />');
      continue;
    }

    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Skip separator row
      if (/^\|[\s\-:]+\|/.test(trimmed) && trimmed.includes("---")) continue;

      if (!inTable) {
        inTable = true;
        htmlParts.push('<div class="overflow-x-auto my-2"><table class="w-full text-xs border-collapse">');
        // First row is header
        const cells = trimmed.split("|").filter(c => c.trim());
        htmlParts.push("<thead><tr>");
        cells.forEach(cell => {
          htmlParts.push(`<th class="text-left px-2 py-1 border-b border-border font-medium">${renderInline(cell.trim())}</th>`);
        });
        htmlParts.push("</tr></thead><tbody>");
        continue;
      }
      const cells = trimmed.split("|").filter(c => c.trim());
      htmlParts.push("<tr>");
      cells.forEach(cell => {
        htmlParts.push(`<td class="px-2 py-1 border-b border-border/50">${renderInline(cell.trim())}</td>`);
      });
      htmlParts.push("</tr>");
      continue;
    }

    // Close table if we're not in a table row
    if (inTable && !trimmed.startsWith("|")) {
      htmlParts.push("</tbody></table></div>");
      inTable = false;
    }

    // List items
    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        inList = true;
        htmlParts.push('<ul class="space-y-0.5 my-1">');
      }
      const text = trimmed.replace(/^[-*+]\s/, "").replace(/^\d+\.\s/, "");
      htmlParts.push(`<li class="flex gap-1.5 items-start"><span class="text-muted-foreground mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0"></span><span>${renderInline(text)}</span></li>`);
      continue;
    }

    // Checkmark items (✓ or ✗)
    if (trimmed.startsWith("✓") || trimmed.startsWith("✗")) {
      if (!inList) {
        inList = true;
        htmlParts.push('<ul class="space-y-0.5 my-1">');
      }
      htmlParts.push(`<li class="flex gap-1.5 items-start"><span>${trimmed[0]}</span><span>${renderInline(trimmed.slice(1).trim())}</span></li>`);
      continue;
    }

    // Regular paragraph
    if (inList) { htmlParts.push("</ul>"); inList = false; }
    htmlParts.push(`<p class="my-1">${renderInline(trimmed)}</p>`);
  }

  if (inList) htmlParts.push("</ul>");
  if (inTable) htmlParts.push("</tbody></table></div>");

  return (
    <div
      className="text-sm leading-relaxed prose-sm"
      dangerouslySetInnerHTML={{ __html: htmlParts.join("") }}
    />
  );
}
