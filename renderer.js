import { collectExplicitHtmlIds, uniqueHeadingId } from "./markdown-headings.js";

export function renderMarkdown(markdown, markdownParser, sanitizer) {
  const usedHeadingIds = collectExplicitHtmlIds(markdown);
  const renderer = new markdownParser.Renderer();
  renderer.heading = function (token) {
    const id = uniqueHeadingId(token.text, usedHeadingIds);
    const headingContent = this.parser.parseInline(token.tokens);
    return `<h${token.depth}${id ? ` id="${id}"` : ""}>${headingContent}</h${token.depth}>\n`;
  };
  const html = markdownParser.parse(markdown, {
    gfm: true,
    breaks: false,
    renderer,
  });
  return sanitizer.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
