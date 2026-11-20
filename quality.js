import { collectExplicitHtmlIds, slugHeading, uniqueHeadingId } from "./markdown-headings.js";

function stripInlineCode(line) {
  return line.replace(/(`+).*?\1/g, (code) => " ".repeat(code.length));
}

function getLines(markdown) {
  let offset = 0;
  return markdown.split(/\r\n|\n|\r/).map((text) => {
    const line = { text, start: offset };
    offset += text.length;
    if (markdown[offset] === "\r") offset += 1;
    if (markdown[offset] === "\n") offset += 1;
    return line;
  });
}

export function checkMarkdownQuality(markdown) {
  const lines = getLines(markdown);
  const issues = [];
  const anchors = collectExplicitHtmlIds(markdown);
  const headingCounts = new Map();
  let previousHeadingLevel = 0;
  let fence = null;

  const addIssue = (severity, message, line, start, end) => {
    issues.push({
      severity,
      message,
      line: line + 1,
      start,
      end,
    });
  };

  const addHeading = (text, level, lineIndex, lineStart, lineEnd) => {
    if (previousHeadingLevel && level > previousHeadingLevel + 1) {
      addIssue(
        "warning",
        `Heading level skips from H${previousHeadingLevel} to H${level}.`,
        lineIndex,
        lineStart,
        lineEnd,
      );
    }
    previousHeadingLevel = level;

    const slug = slugHeading(text);
    if (!slug) return;
    const count = headingCounts.get(slug) || 0;
    if (count > 0) {
      addIssue("warning", "Duplicate heading; its generated anchor may be ambiguous.", lineIndex, lineStart, lineEnd);
    }
    headingCounts.set(slug, count + 1);

    uniqueHeadingId(text, anchors);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const { text, start } = lines[index];
    const fenceMarker = text.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMarker) {
      const marker = fenceMarker[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;

    const line = stripInlineCode(text);
    const setext = line.match(/^ {0,3}(=+|-+)\s*$/);
    if (setext && index > 0 && lines[index - 1].text.trim()) {
      const headingLine = lines[index - 1];
      addHeading(
        headingLine.text.trim(),
        setext[1][0] === "=" ? 1 : 2,
        index - 1,
        headingLine.start,
        headingLine.start + headingLine.text.length,
      );
      continue;
    }

    const atx = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/);
    if (atx) {
      const headingText = atx[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
      addHeading(
        headingText,
        atx[1].length,
        index,
        start,
        start + text.length,
      );
    }

    const unsafeMarkup = line.match(/<(?:script|iframe|object|embed)\b[^>]*>|(?:href|src)\s*=\s*["']\s*(?:javascript|vbscript|data):/i);
    const unsafeMarkdownLink = line.match(/!?\[[^\]]*\]\(\s*(?:<\s*)?(?:javascript|vbscript|data):/i);
    if (unsafeMarkup || unsafeMarkdownLink) {
      const match = unsafeMarkup || unsafeMarkdownLink;
      addIssue(
        "error",
        "Unsafe HTML or URL content will be removed from the preview.",
        index,
        start + match.index,
        start + match.index + match[0].length,
      );
    } else {
      const rawHtml = line.match(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^>]*)?\s*\/?>/);
      if (rawHtml) {
        addIssue(
          "warning",
          "Raw HTML may be sanitized in the preview; prefer Markdown syntax.",
          index,
          start + rawHtml.index,
          start + rawHtml.index + rawHtml[0].length,
        );
      }
    }

    for (const image of line.matchAll(/!\[([^\]]*)\]\(([^)]*)\)/g)) {
      if (!image[1].trim()) {
        addIssue(
          "warning",
          "Image is missing descriptive alt text.",
          index,
          start + image.index,
          start + image.index + image[0].length,
        );
      }
    }

  }

  fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const { text, start } = lines[index];
    const fenceMarker = text.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMarker) {
      const marker = fenceMarker[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;

    const line = stripInlineCode(text);
    for (const link of line.matchAll(/\[[^\]]+\]\(\s*#([^) \t]*)/g)) {
      let target = link[1];
      try {
        target = decodeURIComponent(target);
      } catch {
        // Keep malformed escapes visible to the missing-anchor check.
      }
      if (target && !anchors.has(target.toLowerCase())) {
        addIssue(
          "warning",
          `Local link target "#${target}" does not match a heading or HTML id.`,
          index,
          start + link.index,
          start + link.index + link[0].length,
        );
      }
    }
  }

  return issues.sort((left, right) => left.start - right.start || left.end - right.end);
}
