export function renderMarkdown(markdown, markdownParser, sanitizer) {
  const html = markdownParser.parse(markdown, {
    gfm: true,
    breaks: false,
  });
  return sanitizer.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
