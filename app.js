import { renderMarkdown } from "./renderer.js";

const markdownInput = document.querySelector("#markdown");
const preview = document.querySelector("#preview");
const wordCount = document.querySelector("#wordCount");
const toast = document.querySelector("#toast");
const draftStatus = document.querySelector("#draftStatus");
const themeSelect = document.querySelector("#themeSelect");
const workspace = document.querySelector("#workspace");
const resizeHandle = document.querySelector("#resizeHandle");
const editorPane = document.querySelector("#editorPane");

themeSelect.value = document.documentElement.dataset.theme;
themeSelect.addEventListener("change", () => {
  const theme = themeSelect.value;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("markdown-previewer-theme", theme);
});

fetch("./version.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Version request failed: ${response.status}`);
    return response.json();
  })
  .then(({ version }) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid application version");
    const versionLabel = document.querySelector("#appVersion");
    versionLabel.textContent = `v${version}`;
    versionLabel.setAttribute("aria-label", `Version ${version}`);
  })
  .catch((error) => console.error("Could not load the application version.", error));

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

function updatePreview() {
  preview.innerHTML = renderMarkdown(markdownInput.value, globalThis.marked, globalThis.DOMPurify);
  const words = markdownInput.value.trim().match(/\S+/g)?.length || 0;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  localStorage.setItem("markdown-previewer-content", markdownInput.value);
  draftStatus.textContent = "Saved locally";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function downloadFile(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown() {
  downloadFile("markdown-export.md", markdownInput.value, "text/markdown;charset=utf-8");
  showToast("Markdown downloaded");
}

function wrapSelection(marker) {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const selected = markdownInput.value.slice(start, end);
  markdownInput.setRangeText(`${marker}${selected}${marker}`, start, end, "select");
  const selectionStart = start + marker.length;
  markdownInput.setSelectionRange(selectionStart, selectionStart + selected.length);
  updatePreview();
}

function insertLink() {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const selected = markdownInput.value.slice(start, end);
  const label = selected || "text";
  markdownInput.setRangeText(`[${label}](url)`, start, end, "select");
  const selectionStart = start + label.length + 3;
  markdownInput.setSelectionRange(selectionStart, selectionStart + 3);
  updatePreview();
}

async function importMarkdownFile(file) {
  const isMarkdown = /\.(md|markdown)$/i.test(file.name)
    || ["text/markdown", "text/x-markdown", "text/plain"].includes(file.type);
  try {
    if (!isMarkdown) {
      showToast("Choose a Markdown file");
      return;
    }
    if (markdownInput.value.trim() && !window.confirm("Importing this file will replace your current draft. Continue?")) {
      return;
    }
    markdownInput.value = await file.text();
    markdownInput.focus();
    updatePreview();
    showToast(`Imported ${file.name}`);
  } catch {
    showToast("Could not read the file");
  } finally {
    document.querySelector("#markdownFile").value = "";
  }
}

const paneRatioKey = "markdown-previewer-pane-ratio";
const storedPaneRatio = Number(localStorage.getItem(paneRatioKey));
let paneRatio = Number.isFinite(storedPaneRatio) && storedPaneRatio >= 0.2 && storedPaneRatio <= 0.8
  ? storedPaneRatio
  : 0.5;
const mobileLayout = window.matchMedia("(max-width: 760px)");

function applyPaneRatio() {
  const mobile = mobileLayout.matches;
  const totalSize = (mobile ? workspace.clientHeight : workspace.clientWidth) - 7;
  if (totalSize <= 0) return;

  const firstPaneSize = Math.round(totalSize * paneRatio);
  if (mobile) {
    workspace.style.gridTemplateRows = `${firstPaneSize}px 7px minmax(0, 1fr)`;
    workspace.style.gridTemplateColumns = "";
    resizeHandle.setAttribute("aria-orientation", "horizontal");
  } else {
    workspace.style.gridTemplateColumns = `${firstPaneSize}px 7px minmax(0, 1fr)`;
    workspace.style.gridTemplateRows = "";
    resizeHandle.setAttribute("aria-orientation", "vertical");
  }
  resizeHandle.setAttribute("aria-valuenow", String(Math.round(paneRatio * 100)));
  resizeHandle.setAttribute("aria-valuetext", `${Math.round(paneRatio * 100)}% editor`);
}

function savePaneRatio() {
  localStorage.setItem(paneRatioKey, String(paneRatio));
}

function updatePaneRatioFromPointer(event) {
  const bounds = workspace.getBoundingClientRect();
  const mobile = mobileLayout.matches;
  const totalSize = (mobile ? bounds.height : bounds.width) - 7;
  const position = mobile ? event.clientY - bounds.top : event.clientX - bounds.left;
  paneRatio = Math.min(0.8, Math.max(0.2, position / totalSize));
  applyPaneRatio();
}

let resizing = false;
resizeHandle.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  resizing = true;
  resizeHandle.setPointerCapture(event.pointerId);
});
resizeHandle.addEventListener("pointermove", (event) => {
  if (resizing) updatePaneRatioFromPointer(event);
});
resizeHandle.addEventListener("pointerup", (event) => {
  if (!resizing) return;
  resizing = false;
  savePaneRatio();
  resizeHandle.releasePointerCapture(event.pointerId);
});
resizeHandle.addEventListener("pointercancel", () => {
  resizing = false;
  savePaneRatio();
});
resizeHandle.addEventListener("keydown", (event) => {
  const mobile = mobileLayout.matches;
  const increase = mobile ? event.key === "ArrowDown" : event.key === "ArrowRight";
  const decrease = mobile ? event.key === "ArrowUp" : event.key === "ArrowLeft";
  if (!increase && !decrease) return;
  event.preventDefault();
  paneRatio = Math.min(0.8, Math.max(0.2, paneRatio + (increase ? 0.025 : -0.025)));
  applyPaneRatio();
  savePaneRatio();
});
window.addEventListener("resize", applyPaneRatio);
mobileLayout.addEventListener("change", applyPaneRatio);
applyPaneRatio();

markdownInput.value = localStorage.getItem("markdown-previewer-content") ?? starter;
markdownInput.addEventListener("input", updatePreview);
markdownInput.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    markdownInput.setRangeText("  ", start, end, "end");
    updatePreview();
    return;
  }

  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  switch (event.key.toLowerCase()) {
    case "b":
      event.preventDefault();
      wrapSelection("**");
      break;
    case "i":
      event.preventDefault();
      wrapSelection("*");
      break;
    case "k":
      event.preventDefault();
      insertLink();
      break;
    case "s":
      event.preventDefault();
      downloadMarkdown();
      break;
  }
});

document.querySelector("#clear").addEventListener("click", () => {
  if (markdownInput.value.trim() && !window.confirm("Clear your current draft? This cannot be undone.")) return;
  markdownInput.value = "";
  markdownInput.focus();
  updatePreview();
});

const importButton = document.querySelector("#importMarkdown");
const markdownFile = document.querySelector("#markdownFile");

importButton.addEventListener("click", () => markdownFile.click());

markdownFile.addEventListener("change", () => {
  const file = markdownFile.files?.[0];
  if (!file) return;
  importMarkdownFile(file);
});

editorPane.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  editorPane.classList.add("is-dragging");
});
editorPane.addEventListener("dragover", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});
editorPane.addEventListener("dragleave", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  if (!event.relatedTarget || !editorPane.contains(event.relatedTarget)) {
    editorPane.classList.remove("is-dragging");
  }
});
editorPane.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault();
  editorPane.classList.remove("is-dragging");
  importMarkdownFile(event.dataTransfer.files[0]);
});

document.querySelector("#downloadMarkdown").addEventListener("click", downloadMarkdown);

document.querySelector("#copyHtml").addEventListener("click", async () => {
  const html = renderMarkdown(markdownInput.value, globalThis.marked, globalThis.DOMPurify);
  try {
    await navigator.clipboard.writeText(html);
    showToast("HTML copied");
  } catch {
    showToast("Could not copy HTML");
  }
});

document.querySelector("#downloadHtml").addEventListener("click", () => {
  const body = renderMarkdown(markdownInput.value, globalThis.marked, globalThis.DOMPurify);
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
  downloadFile("markdown-export.html", documentHtml, "text/html;charset=utf-8");
  showToast("HTML downloaded");
});

updatePreview();
