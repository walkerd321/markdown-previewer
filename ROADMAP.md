# Markdown Previewer Professionalization Roadmap

This roadmap describes the remaining work needed to turn Markdown Previewer into a polished, professional, free product. It reflects features already available in the application and organizes the rest by user value and implementation risk.

## Current state

The application already includes:

- Live GitHub-flavored Markdown preview with sanitized HTML
- Named browser-local drafts, draft switching, local autosave, and unsaved-change warnings
- Markdown import, drag-and-drop, `.md` download, HTML copy/download, and print preview
- Light, dark, and system themes
- Resizable editor/preview panes with mobile stacking
- Find/replace, document outline, heading IDs, and Markdown quality diagnostics
- Keyboard formatting shortcuts and synchronized editor/preview scrolling
- Distraction-free focus mode and pasted-image embedding
- Debounced rendering for large documents and copy controls for code blocks
- Installable PWA support, offline caching, privacy/security/support documents, CSP, tests, GitHub Pages deployment, and semantic versioning

## Goals

The remaining work should:

1. Protect documents from accidental loss.
2. Make large-document editing fast and predictable.
3. Support complete Markdown and publishing workflows.
4. Improve accessibility and international use.
5. Strengthen security, privacy, observability, and dependency maintenance.
6. Preserve a polished experience across desktop, tablet, and mobile.

## Phase 1: document reliability

**Priority: high**

- Add a document picker for recent drafts and explicit open/save actions.
- Store named drafts in IndexedDB instead of relying only on localStorage.
- Add migration and recovery from the existing localStorage draft.
- Detect storage quota, blocked storage, and corrupted draft data.
- Add draft metadata: created date, modified date, size, and source filename.
- Add duplicate, rename, delete, import, export, and restore actions.
- Improve unsaved-change protection for tab close, reload, draft switch, clear, and import.
- Add conflict detection when two tabs edit the same draft.
- Persist or restore pane, theme, outline, quality-panel, focus, and scroll preferences intentionally.

**Acceptance criteria**

- A browser restart restores every named draft and the active draft.
- Import/export and clear operations cannot silently destroy a document.
- Draft storage failures are visible and recoverable.
- Multiple editing tabs do not overwrite one another silently.

## Phase 2: editing performance and usability

**Priority: high**

- Add find/replace across all named drafts.
- Add case-sensitive, whole-word, and regular-expression search options.
- Add undo/redo-aware formatting actions and toolbar formatting controls.
- Add syntax highlighting in the editor.
- Add optional line numbers and active-line highlighting.
- Implement accurate synchronized scrolling for headings and block structure.
- Add foldable sections and a mobile-friendly outline.
- Add keyboard shortcut customization and a shortcut reference dialog.
- Add focus, selection, and cursor-position status.
- Debounce rendering further and use worker-based parsing for very large documents.
- Prevent UI locks and memory spikes for large imports.
- Add graceful limits or virtualized rendering for very large documents.

**Acceptance criteria**

- Typing remains responsive for multi-megabyte documents.
- Find/replace and formatting actions support keyboard-only use.
- Scroll synchronization remains accurate with long lists, code blocks, and headings.
- Syntax highlighting does not alter the underlying Markdown.

## Phase 3: Markdown and publishing expansion

**Priority: medium**

- Add task-list rendering and editing assistance.
- Add Mermaid and other diagram support with local/vendor fallback behavior.
- Add footnotes, definition lists, emoji, math, and additional GFM extensions.
- Add configurable Markdown dialect and parser compatibility options.
- Add image file picker support in addition to pasted images.
- Store embedded images efficiently rather than expanding the Markdown source unnecessarily.
- Add image alt-text suggestions and image-size metadata.
- Add publish-ready HTML themes and export preview.
- Add PDF export if the browser print pipeline cannot cover it.
- Add document front matter editing and rendering controls.
- Add document outline navigation to exported HTML.

**Acceptance criteria**

- Users can choose supported Markdown features without silently changing document meaning.
- Unsupported or disabled extensions have clear errors or fallback rendering.
- HTML and print exports remain sanitized and visually consistent.
- Exported documents do not depend on application-local state.

## Phase 4: accessibility and internationalization

**Priority: high**

- Complete keyboard navigation for every toolbar, panel, and editor action.
- Verify focus order, focus trapping, Escape behavior, and visible focus states.
- Audit and improve contrast in light, dark, and system themes.
- Add accessible names and live-region announcements for all status changes.
- Ensure pane resizing works with screen readers and touch devices.
- Support reduced-motion preferences.
- Add localization infrastructure for interface strings.
- Externalize all user-visible text and provide a locale fallback.
- Add initial locale options after untranslated coverage is complete.
- Review right-to-left layouts for toolbar and document controls.

**Acceptance criteria**

- Core workflows pass automated accessibility checks and manual keyboard-only testing.
- A screen reader can import, edit, preview, save, and export a document.
- Theme and motion preferences respect operating-system settings.

## Phase 5: security and privacy hardening

**Priority: high**

- Tighten CSP without relying on unsafe inline script/style exceptions.
- Remove inline bootstrap scripts or move theme initialization to a CSP-compatible mechanism.
- Add SRI or equivalent pinned-integrity checks for vendored third-party assets.
- Add dependency scanning, lockfile review, and automated dependency updates.
- Add code scanning and secret scanning.
- Add CSP violation reporting that does not collect document content.
- Add test coverage for unsafe URL schemes, malformed HTML, pasted content, and large files.
- Document browser telemetry and hosting-log behavior in the privacy policy.
- Add a local-only mode guarantee and user-visible privacy indicators.

**Acceptance criteria**

- Known dependency vulnerabilities have a documented response process.
- No draft content is transmitted by application code.
- Sanitization and CSP tests cover malicious Markdown and HTML cases.
- Builds have reproducible dependencies and pinned action versions.

## Phase 6: operations and distribution

**Priority: medium**

- Add issue, bug report, feature request, pull request, and security templates.
- Add release notes and a maintained changelog.
- Add browser support and minimum-version documentation.
- Add PWA installation and update prompts.
- Improve offline update detection and cache migration for new releases.
- Add lightweight performance monitoring measured locally, not remotely.
- Add startup, preview, save, import, and export performance benchmarks.
- Add automated visual and responsive-layout tests.
- Add deployment smoke tests against GitHub Pages after publish.
- Evaluate desktop packaging for users who need native file-system integration.

**Acceptance criteria**

- Every release has a changelog and reproducible deployment record.
- Offline updates appear predictably and do not strand stale assets.
- A browser matrix defines supported desktop and mobile behavior.
- Public Pages releases pass automated smoke checks after deployment.

## Phase 7: product polish

**Priority: medium**

- Add branded PWA icons and a polished install experience.
- Add Open Graph/social preview assets.
- Add a keyboard shortcut dialog and in-app help.
- Add onboarding for first-time users.
- Add status notifications for save, import, export, print, and offline state.
- Add subtle unsaved-draft indicators and document metadata.
- Add a document statistics panel: reading time, characters, paragraphs, and line count.
- Add a reusable document template library.
- Add export presets for GitHub README, documentation, blog posts, and reports.

**Acceptance criteria**

- New users can discover core actions without external documentation.
- First-run and repeated-use flows are consistent across themes and screen sizes.
- Status information is unobtrusive, accurate, and accessible.

## Recommended release sequence

### v2.6.0: document reliability

- IndexedDB draft storage and migration
- Recent-document management
- Storage failure and corruption recovery
- Cross-tab conflict handling

### v2.7.0: editing power

- Syntax highlighting
- Line numbers and active line
- Search across drafts
- Improved synchronized scrolling

### v2.8.0: publishing

- Mermaid and task lists
- Front matter
- Enhanced HTML/PDF export
- Image file workflow

### v2.9.0: accessibility

- Keyboard and screen-reader audit
- Reduced motion
- Localization foundation
- Responsive-layout verification

### v3.0.0: hardened public release

- Tight CSP
- Dependency and supply-chain controls
- Desktop distribution evaluation
- Production support and observability baseline

## Implementation principles

- Keep draft content local and avoid account or server requirements unless a future feature needs them.
- Use the existing `feat`, `fix`, and `!` conventions for SemVer releases.
- Add focused unit and browser tests before merge.
- Keep PRs independently deployable and avoid bundling unrelated layout changes.
- Run mobile, tablet, and desktop visual checks for every release.
- Preserve backward compatibility for existing local drafts and exported Markdown.

## Definition of done

A professional release should include:

- Passing unit and browser suites
- Mobile/tablet/desktop layout coverage
- Keyboard and accessibility checks
- Privacy and security review
- PWA and offline validation
- Updated README and release notes
- Semantic version tag and Pages deployment
- Main branch protection and required review/status checks
