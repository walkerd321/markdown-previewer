import { renderMarkdown } from "./renderer.js";
import { checkMarkdownQuality } from "./quality.js";

const markdownInput = document.querySelector("#markdown");
const preview = document.querySelector("#preview");
const wordCount = document.querySelector("#wordCount");
const toast = document.querySelector("#toast");
const draftStatus = document.querySelector("#draftStatus");
const themeSelect = document.querySelector("#themeSelect");
const workspace = document.querySelector("#workspace");
const resizeHandle = document.querySelector("#resizeHandle");
const editorPane = document.querySelector("#editorPane");
const qualityToggle = document.querySelector("#qualityToggle");
const qualityPanel = document.querySelector("#qualityPanel");
const qualitySummary = document.querySelector("#qualitySummary");
const qualityResults = document.querySelector("#qualityResults");
const draftSelect = document.querySelector("#draftSelect");
const draftName = document.querySelector("#draftName");
const newDraft = document.querySelector("#newDraft");
const findToggle = document.querySelector("#findToggle");
const findReplacePanel = document.querySelector("#findReplacePanel");
const findInput = document.querySelector("#findInput");
const replaceInput = document.querySelector("#replaceInput");
const findStatus = document.querySelector("#findStatus");
const outlineToggle = document.querySelector("#outlineToggle");
const outlinePanel = document.querySelector("#outlinePanel");
const outlineResults = document.querySelector("#outlineResults");

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

const draftsKey = "markdown-previewer-drafts-v1";
const activeDraftKey = "markdown-previewer-active-draft";
let drafts = [];
let activeDraftId = "";
let dirty = false;
let exportedBaseline = "";

function createDraftId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadDrafts() {
  try {
    const stored = JSON.parse(localStorage.getItem(draftsKey) || "[]");
    if (Array.isArray(stored)) {
      drafts = stored
        .filter((draft) => draft && typeof draft.id === "string" && typeof draft.content === "string")
        .map((draft) => ({
          id: draft.id,
          name: typeof draft.name === "string" && draft.name.trim() ? draft.name.trim().slice(0, 80) : "Untitled",
          content: draft.content,
          updatedAt: Number(draft.updatedAt) || 0,
        }));
    }
  } catch {
    drafts = [];
  }

  if (!drafts.length) {
    drafts.push({
      id: createDraftId(),
      name: "Untitled",
      content: localStorage.getItem("markdown-previewer-content") ?? starter,
      updatedAt: Date.now(),
    });
  }

  const storedActiveId = localStorage.getItem(activeDraftKey);
  activeDraftId = drafts.some((draft) => draft.id === storedActiveId)
    ? storedActiveId
    : drafts[0].id;
}

function persistDrafts() {
  localStorage.setItem(draftsKey, JSON.stringify(drafts));
  localStorage.setItem(activeDraftKey, activeDraftId);
}

function activeDraft() {
  return drafts.find((draft) => draft.id === activeDraftId) || drafts[0];
}

function renderDraftPicker() {
  draftSelect.replaceChildren();
  for (const draft of drafts) {
    const option = document.createElement("option");
    option.value = draft.id;
    option.textContent = draft.name;
    draftSelect.append(option);
  }
  draftSelect.value = activeDraftId;
  draftName.value = activeDraft()?.name || "Untitled";
}

function saveActiveDraft({ touch = false } = {}) {
  const draft = activeDraft();
  if (!draft) return;
  draft.content = markdownInput.value;
  draft.name = draftName.value.trim().slice(0, 80) || "Untitled";
  if (touch) draft.updatedAt = Date.now();
  draftName.value = draft.name;
  localStorage.setItem("markdown-previewer-content", markdownInput.value);
  persistDrafts();
  renderDraftPicker();
}

function selectDraft(id) {
  if (!drafts.some((draft) => draft.id === id)) return;
  if (dirty && !window.confirm("Switch drafts? Unsaved Markdown file changes will remain in the locally saved draft.")) {
    renderDraftPicker();
    return;
  }

  saveActiveDraft();
  activeDraftId = id;
  const draft = activeDraft();
  markdownInput.value = draft.content;
  draftName.value = draft.name;
  dirty = false;
  exportedBaseline = draft.content;
  persistDrafts();
  renderDraftPicker();
  updatePreview();
  markdownInput.focus();
}

function createNewDraft() {
  if (dirty && !window.confirm("Create a new draft? Unsaved Markdown file changes will remain in the locally saved draft.")) return;
  saveActiveDraft();
  const draft = {
    id: createDraftId(),
    name: `Draft ${drafts.length + 1}`,
    content: "",
    updatedAt: Date.now(),
  };
  drafts.push(draft);
  activeDraftId = draft.id;
  markdownInput.value = "";
  draftName.value = draft.name;
  dirty = false;
  exportedBaseline = "";
  persistDrafts();
  renderDraftPicker();
  updatePreview();
  draftName.select();
}

function renameActiveDraft() {
  saveActiveDraft();
  renderDraftPicker();
  showToast("Draft renamed");
}

function updatePreview() {
  preview.innerHTML = renderMarkdown(markdownInput.value, globalThis.marked, globalThis.DOMPurify);
  const words = markdownInput.value.trim().match(/\S+/g)?.length || 0;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  localStorage.setItem("markdown-previewer-content", markdownInput.value);
  saveActiveDraft({ touch: true });
  draftStatus.textContent = dirty ? "Unsaved file changes" : "Saved locally";
  if (!qualityPanel.hidden) renderQualityResults();
  if (!outlinePanel.hidden) renderOutline();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function renderQualityResults() {
  const issues = checkMarkdownQuality(markdownInput.value);
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;

  qualitySummary.textContent = issues.length
    ? `${errors} ${errors === 1 ? "error" : "errors"}, ${warnings} ${warnings === 1 ? "warning" : "warnings"} found.`
    : "No issues found.";
  qualityResults.replaceChildren();

  for (const issue of issues) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quality-issue quality-issue-${issue.severity}`;
    button.textContent = `${issue.severity === "error" ? "Error" : "Warning"} · Line ${issue.line}: ${issue.message}`;
    button.addEventListener("click", () => {
      markdownInput.focus();
      markdownInput.setSelectionRange(issue.start, issue.end);
      const lineHeight = Number.parseFloat(getComputedStyle(markdownInput).lineHeight);
      markdownInput.scrollTop = Math.max(0, (issue.line - 1) * lineHeight - markdownInput.clientHeight / 2);
    });
    item.append(button);
    qualityResults.append(item);
  }
}

qualityToggle.addEventListener("click", () => {
  const isOpen = qualityToggle.getAttribute("aria-expanded") === "true";
  qualityToggle.setAttribute("aria-expanded", String(!isOpen));
  qualityPanel.hidden = isOpen;
  if (!isOpen) renderQualityResults();
});

function renderOutline() {
  const headings = [];
  const lines = markdownInput.value.split(/\r\n|\n|\r/);
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMarker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMarker) {
      const marker = fenceMarker[1];
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;

    const atx = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/);
    if (atx) {
      headings.push({ level: atx[1].length, text: atx[2].trim(), line: index });
      continue;
    }
    if (index > 0 && /^ {0,3}(?:=+|-+)\s*$/.test(line) && lines[index - 1].trim()) {
      headings.push({ level: line.trim()[0] === "=" ? 1 : 2, text: lines[index - 1].trim(), line: index - 1 });
    }
  }

  outlineResults.replaceChildren();
  if (!headings.length) {
    const empty = document.createElement("li");
    empty.textContent = "No headings found.";
    empty.className = "outline-item";
    outlineResults.append(empty);
    return;
  }

  for (const heading of headings) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "outline-item";
    button.style.paddingLeft = `${(heading.level - 1) * 14}px`;
    button.textContent = `${"·".repeat(heading.level - 1)} ${heading.text}`;
    button.title = `Go to line ${heading.line + 1}`;
    button.addEventListener("click", () => {
      const sourceLines = markdownInput.value.split(/\r\n|\n|\r/);
      const before = sourceLines.slice(0, heading.line);
      let start = before.reduce((total, line) => total + line.length + 1, 0);
      markdownInput.focus();
      markdownInput.setSelectionRange(start, start + sourceLines[heading.line].length);
      const lineHeight = Number.parseFloat(getComputedStyle(markdownInput).lineHeight);
      markdownInput.scrollTop = Math.max(0, heading.line * lineHeight - markdownInput.clientHeight / 2);
    });
    item.append(button);
    outlineResults.append(item);
  }
}

outlineToggle.addEventListener("click", () => {
  const isOpen = outlineToggle.getAttribute("aria-expanded") === "true";
  outlineToggle.setAttribute("aria-expanded", String(!isOpen));
  outlinePanel.hidden = isOpen;
  if (!isOpen) renderOutline();
});

function findMatches(query) {
  if (!query) return [];
  const text = markdownInput.value;
  const matches = [];
  let start = 0;
  while (start <= text.length) {
    const index = text.toLowerCase().indexOf(query.toLowerCase(), start);
    if (index === -1) break;
    matches.push({ start: index, end: index + query.length });
    start = index + Math.max(query.length, 1);
  }
  return matches;
}

let activeMatchIndex = -1;

function showFindStatus() {
  const query = findInput.value;
  const matches = findMatches(query);
  if (!query) {
    findStatus.textContent = "";
  } else if (!matches.length) {
    findStatus.textContent = "No matches";
  } else {
    findStatus.textContent = activeMatchIndex >= 0
      ? `${activeMatchIndex + 1} of ${matches.length}`
      : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`;
  }
}

function findMatch(direction) {
  const matches = findMatches(findInput.value);
  if (!matches.length) {
    activeMatchIndex = -1;
    showFindStatus();
    return;
  }

  if (activeMatchIndex < 0) {
    activeMatchIndex = direction >= 0 ? 0 : matches.length - 1;
  } else {
    activeMatchIndex = (activeMatchIndex + direction + matches.length) % matches.length;
  }
  const match = matches[activeMatchIndex];
  markdownInput.focus();
  markdownInput.setSelectionRange(match.start, match.end);
  showFindStatus();
}

findToggle.addEventListener("click", () => {
  const isOpen = findToggle.getAttribute("aria-expanded") === "true";
  findToggle.setAttribute("aria-expanded", String(!isOpen));
  findReplacePanel.hidden = isOpen;
  if (!isOpen) {
    findInput.value = markdownInput.value.slice(markdownInput.selectionStart, markdownInput.selectionEnd);
    findInput.focus();
    activeMatchIndex = -1;
    showFindStatus();
  }
});
findInput.addEventListener("input", () => {
  activeMatchIndex = -1;
  showFindStatus();
});
findInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    findMatch(event.shiftKey ? -1 : 1);
  }
});
document.querySelector("#findPrevious").addEventListener("click", () => findMatch(-1));
document.querySelector("#findNext").addEventListener("click", () => findMatch(1));
document.querySelector("#replaceOne").addEventListener("click", () => {
  const query = findInput.value;
  if (!query) return;
  const matches = findMatches(query);
  if (!matches.length) return;
  const index = activeMatchIndex >= 0 ? activeMatchIndex : 0;
  const match = matches[index];
  markdownInput.setRangeText(replaceInput.value, match.start, match.end, "select");
  dirty = true;
  updatePreview();
  activeMatchIndex = -1;
  showFindStatus();
});
document.querySelector("#replaceAll").addEventListener("click", () => {
  const query = findInput.value;
  if (!query) return;
  const matches = findMatches(query);
  if (!matches.length) return;
  let text = markdownInput.value;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  text = text.replace(new RegExp(escaped, "gi"), () => replaceInput.value);
  markdownInput.value = text;
  dirty = true;
  updatePreview();
  activeMatchIndex = -1;
  showFindStatus();
});

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
  dirty = false;
  exportedBaseline = markdownInput.value;
  draftStatus.textContent = "Saved locally";
  showToast("Markdown downloaded");
}

function wrapSelection(marker) {
  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const selected = markdownInput.value.slice(start, end);
  markdownInput.setRangeText(`${marker}${selected}${marker}`, start, end, "select");
  const selectionStart = start + marker.length;
  markdownInput.setSelectionRange(selectionStart, selectionStart + selected.length);
  dirty = markdownInput.value !== exportedBaseline;
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
  dirty = markdownInput.value !== exportedBaseline;
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
    dirty = markdownInput.value !== exportedBaseline;
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

loadDrafts();
renderDraftPicker();
const initialDraft = activeDraft();
markdownInput.value = initialDraft?.content ?? starter;
exportedBaseline = markdownInput.value;
markdownInput.addEventListener("input", () => {
  dirty = markdownInput.value !== exportedBaseline;
  draftStatus.textContent = dirty ? "Unsaved file changes" : "Saved locally";
  updatePreview();
});
markdownInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    findToggle.click();
    return;
  }
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
  dirty = markdownInput.value !== exportedBaseline;
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

draftSelect.addEventListener("change", () => selectDraft(draftSelect.value));
draftName.addEventListener("change", renameActiveDraft);
draftName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.prevent();
    renameActiveDraft();
    draftName.blur();
  }
});
newDraft.addEventListener("click", createNewDraft);

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

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
