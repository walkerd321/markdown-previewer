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

function markdownToHtml(markdown) {
  const rendered = marked.parse(markdown, {
    gfm: true,
    breaks: false,
  });
  return DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true },
  });
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
