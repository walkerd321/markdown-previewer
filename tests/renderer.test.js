import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { marked } from "marked";
import { renderMarkdown } from "../renderer.js";

const window = new JSDOM("").window;
const sanitizer = createDOMPurify(window);

after(() => window.close());

describe("renderMarkdown", () => {
  it("renders headings and inline links", () => {
    const html = renderMarkdown("# Guide\n\n[Docs](https://example.com)", marked, sanitizer);

    assert.match(html, /<h1>Guide<\/h1>/);
    assert.match(html, /<a href="https:\/\/example\.com">Docs<\/a>/);
  });

  it("renders inline and fenced code without interpreting its contents", () => {
    const html = renderMarkdown("Use `x < y`.\n\n```js\nalert(1)\n```", marked, sanitizer);

    assert.match(html, /<code>x &lt; y<\/code>/);
    assert.match(html, /<pre><code class="language-js">alert\(1\)\n<\/code><\/pre>/);
  });

  it("renders nested lists", () => {
    const html = renderMarkdown("- Parent\n  - Child", marked, sanitizer);

    assert.match(html, /<ul>[\s\S]*<li>Parent[\s\S]*<ul>[\s\S]*<li>Child<\/li>/);
  });

  it("renders GitHub-flavored Markdown tables", () => {
    const html = renderMarkdown("| Name | Value |\n| --- | ---: |\n| size | 3 |", marked, sanitizer);

    assert.match(html, /<table>/);
    assert.match(html, /<th>Name<\/th>/);
    assert.match(html, /<td(?:\s[^>]*)?>3<\/td>/);
  });

  it("removes scripts, event handlers, and unsafe URL schemes", () => {
    const html = renderMarkdown(
      '<script>alert("x")</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad link</a>',
      marked,
      sanitizer,
    );
    const parsed = new window.DOMParser().parseFromString(html, "text/html");

    assert.equal(parsed.querySelector("script"), null);
    assert.equal(parsed.querySelector("img")?.hasAttribute("onerror"), false);
    assert.equal(parsed.querySelector("a")?.hasAttribute("href"), false);
  });
});
