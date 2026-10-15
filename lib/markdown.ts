function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Small safe formatter for club-authored text. It does not pass raw HTML through. */
export function renderMarkdown(source: string) {
  const blocks = escapeHtml(source).split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
      }
      if (lines[0]?.startsWith("### ")) return `<h3>${inline(lines[0].slice(4))}</h3>`;
      if (lines[0]?.startsWith("## ")) return `<h2>${inline(lines[0].slice(3))}</h2>`;
      return `<p>${lines.map(inline).join("<br />")}</p>`;
    })
    .join("");
}

function inline(value: string) {
  return value.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
