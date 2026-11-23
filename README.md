# Markdown Previewer

A lightweight, browser-based Markdown editor with a live preview and HTML export.

Try the [live Markdown Previewer](https://walkerd321.github.io/markdown-previewer/).

## Features

### Editing and preview

- Update a live preview as you edit, with GitHub-flavored Markdown tables and formatting
- Insert two spaces with Tab; use `Ctrl`/`⌘` + `B` for bold, `I` for italic, and `K` for a link
- Show the Markdown word count
- Generate stable heading IDs so local heading links work in the preview and exported HTML
- Find and replace text with match navigation
- Browse a clickable document outline

### Documents and saving

- Import `.md` and `.markdown` files using the file picker or drag and drop
- Confirm before an import replaces the current draft or Clear removes it
- Automatically save the current draft in this browser and show its save status
- Manage multiple named drafts and rename the active document
- Warn before replacing or clearing content and before closing with unsaved file changes
- Download the Markdown source with **Save .md** or `Ctrl+S` / `⌘+S`
- Copy rendered HTML or download it as a standalone HTML file

### Quality and safety

- Check for missing image alt text, skipped heading levels, duplicate headings, broken local links, and raw or unsafe HTML/URLs
- Review warnings and errors, then select a finding to jump to its source in the editor
- Sanitize rendered HTML before showing or exporting it

### Workspace and appearance

- Choose System, Light, or Dark theme; remember the choice or follow the operating-system setting
- Resize the editor and preview with the mouse or keyboard; remember the split between visits
- Reset the pane split to a balanced 50/50 view by double-clicking the divider or pressing Home
- Show the application version in the toolbar
- Install the application as a PWA and continue using cached assets offline
- Print only the rendered preview, with editor and toolbar controls excluded

## Run locally

Requires Python 3 to serve the static files.

```sh
npm install
npm start
```

Open [http://localhost:4173](http://localhost:4173).

## Tests

Requires Node.js 24 or newer and Python 3.

```sh
npm ci
npx playwright install chromium
npm test
```

Unit tests cover Markdown rendering, sanitization, quality diagnostics, heading anchors, and semantic version calculation. Playwright tests cover theme behavior, editing and saving, imports and drag-and-drop, quality checks, pane resizing, shortcuts, and HTML/Markdown exports.

## Releases

Pull requests should use [Conventional Commit](https://www.conventionalcommits.org/) titles. After a merged pull request passes CI, the Pages workflow deploys it and creates a Git tag: `feat` increments the minor version, `fix` increments the patch version, and `!` or a `BREAKING CHANGE:` footer increments the major version. Other conventional types deploy without creating a new version tag. The first tagged deployment starts at `v1.0.0`.

## Dependencies

The browser uses the vendored `marked` and DOMPurify bundles in `vendor/`. Their npm packages are also listed in `package.json` for reproducible updates and testing.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
