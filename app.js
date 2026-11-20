const markdownInput = document.querySelector("#markdown");
const preview = document.querySelector("#preview");
const wordCount = document.querySelector("#wordCount");
const toast = document.querySelector("#toast");

const starter = `# Welcome to Markdown

Write Markdown on the left and see it rendered here instantly.

## Common formatting

- **Bold text** and *italic text*
- [Links](https://developer.mozilla.org/)
- \`inline code\`

> Markdown is a lightweight markup language for creating formatted text.

### Code block

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

| Feature | Status |
| --- | --- |
| Live preview | Ready |
| HTML export | Ready |

---

Try editing this content.`;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function inlineMarkdown(value) {
  let codeIndex = 0;
  const codeTokens = [];
  value = value.replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `@@MDCODE${codeIndex}@@`;
    codeTokens.push([token, `<code>${escapeHtml(code)}</code>`]);
    codeIndex += 1;
    return token;
  });

  let result = escapeHtml(value);
  result = result.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, alt, url, title) =>
    `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>`
  );
  result = result.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, text, url, title) =>
    `<a href="${escapeAttribute(url)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>${text}</a>`
  );
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
  result = result.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  codeTokens.forEach(([token, html]) => {
    result = result.replaceAll(token, html);
  });
  return result;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let index = 0;
  let inList = null;
  let inBlockquote = false;

  function closeList() {
    if (inList) {
      html += `</${inList}>`;
      inList = null;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html += "</blockquote>";
      inBlockquote = false;
    }
  }

  while (index < lines.length) {
    const line = lines[index];

    if (/^```/.test(line.trim())) {
      closeList();
      closeBlockquote();
      const language = line.trim().slice(3).trim();
      index += 1;
      const code = [];
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html += `<pre><code${language ? ` class="language-${escapeAttribute(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`;
      continue;
    }

    if (!line.trim()) {
      closeList();
      closeBlockquote();
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      closeList();
      closeBlockquote();
      html += "<hr>";
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeList();
      if (!inBlockquote) {
        html += "<blockquote>";
        inBlockquote = true;
      }
      html += `<p>${inlineMarkdown(line.replace(/^>\s?/, ""))}</p>`;
      index += 1;
      continue;
    }

    if (inBlockquote) closeBlockquote();

    const unordered = line.match(/^[-+*]\s+(.+)$/);
    if (unordered) {
      if (inList !== "ul") {
        closeList();
        html += "<ul>";
        inList = "ul";
      }
      html += `<li>${inlineMarkdown(unordered[1])}</li>`;
      index += 1;
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      if (inList !== "ol") {
        closeList();
        html += "<ol>";
        inList = "ol";
      }
      html += `<li>${inlineMarkdown(ordered[1])}</li>`;
      index += 1;
      continue;
    }

    closeList();

    if (line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      const parseRow = (row) => row.trim().replace(/^\\|/, "").replace(/\\|$/, "").split("|").map((cell) => cell.trim());
      const headers = parseRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(parseRow(lines[index]));
        index += 1;
      }
      html += "<table><thead><tr>";
      headers.forEach((header) => (html += `<th>${inlineMarkdown(header)}</th>`));
      html += "</tr></thead><tbody>";
      rows.forEach((row) => {
        html += "<tr>";
        headers.forEach((_, cellIndex) => (html += `<td>${inlineMarkdown(row[cellIndex] || "")}</td>`));
        html += "</tr>";
      });
      html += "</tbody></table>";
      continue;
    }

    html += `<p>${inlineMarkdown(line)}</p>`;
    index += 1;
  }

  closeList();
  closeBlockquote();
  return html;
}

function updatePreview() {
  preview.innerHTML = markdownToHtml(markdownInput.value);
  const words = markdownInput.value.trim().match(/\S+/g)?.length || 0;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  localStorage.setItem("markdown-previewer-content", markdownInput.value);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 1800);
}

markdownInput.value = localStorage.getItem("markdown-previewer-content") ?? starter;
markdownInput.addEventListener("input", updatePreview);
markdownInput.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    markdownInput.setRangeText("  ", start, end, "end");
    updatePreview();
  }
});

document.querySelector("#clear").addEventListener("click", () => {
  markdownInput.value = "";
  markdownInput.focus();
  updatePreview();
});

const importButton = document.querySelector("#importMarkdown");
const markdownFile = document.querySelector("#markdownFile");

importButton.addEventListener("click", () => markdownFile.click());

markdownFile.addEventListener("change", async () => {
  const file = markdownFile.files?.[0];
  if (!file) return;

  try {
    markdownInput.value = await file.text();
    markdownInput.focus();
    updatePreview();
    showToast(`Imported ${file.name}`);
  } catch {
    showToast("Could not read the file");
  } finally {
    markdownFile.value = "";
  }
});

document.querySelector("#copyHtml").addEventListener("click", async () => {
  const html = markdownToHtml(markdownInput.value);
  try {
    await navigator.clipboard.writeText(html);
    showToast("HTML copied");
  } catch {
    showToast("Could not copy HTML");
  }
});

document.querySelector("#downloadHtml").addEventListener("click", () => {
  const body = markdownToHtml(markdownInput.value);
  const documentHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body { max-width: 760px; margin: 40px auto; padding: 0 24px; font-family: system-ui, sans-serif; line-height: 1.65; color: #172033; }
    pre { overflow: auto; padding: 16px; background: #f3f4f7; border-radius: 8px; }
    code { font-family: monospace; } table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } blockquote { border-left: 4px solid #ccc; margin-left: 0; padding-left: 16px; color: #697386; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
  const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "markdown-export.html";
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("HTML downloaded");
});

updatePreview();
