# Markdown Previewer

A lightweight, browser-based Markdown editor with a live preview and HTML export.

Try the [live Markdown Previewer](https://walkerd321.github.io/markdown-previewer/).

## Features

- Live preview with GitHub-flavored Markdown support
- Import `.md` and `.markdown` files
- Copy rendered HTML or download a standalone HTML document
- Automatically save the current draft in browser local storage
- Sanitize rendered HTML before displaying it

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

The unit tests cover Markdown rendering and HTML sanitization. The Playwright tests cover editing, file import, clipboard copy, HTML download, and clearing the editor.

## Dependencies

The browser uses the vendored `marked` and DOMPurify bundles in `vendor/`. Their npm packages are also listed in `package.json` for reproducible updates and testing.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
