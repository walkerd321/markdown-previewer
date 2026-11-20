export function slugHeading(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_~]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function uniqueHeadingId(text, usedIds) {
  const slug = slugHeading(text);
  if (!slug) return "";

  let id = slug;
  let suffix = 0;
  while (usedIds.has(id)) {
    suffix += 1;
    id = `${slug}-${suffix}`;
  }
  usedIds.add(id);
  return id;
}

export function collectExplicitHtmlIds(markdown) {
  const ids = new Set();
  let fence = null;
  for (const line of markdown.split(/\r\n|\n|\r/)) {
    const fenceMarker = line.match(/^ {0,3}(`{3,}|~{3,})/);
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

    const withoutInlineCode = line.replace(/(`+).*?\1/g, (code) => " ".repeat(code.length));
    for (const match of withoutInlineCode.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
      ids.add(match[1]);
    }
  }
  return ids;
}
