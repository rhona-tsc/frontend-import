// Format Markdown emphasis in visible text, including biographies already wrapped in HTML.
export const renderBioBold = value => String(value || "").split(/(<[^>]*>)/g)
  .map(part => part.startsWith("<") ? part : part.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"))
  .join("");
