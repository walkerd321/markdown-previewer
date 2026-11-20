import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkMarkdownQuality } from "../quality.js";

describe("checkMarkdownQuality", () => {
  it("reports common accessibility, heading, anchor, and sanitization issues with source locations", () => {
    const markdown = [
      "# Guide",
      "",
      "### Details",
      "",
      "![ ](diagram.png)",
      "[Missing](#missing)",
      "### Details",
      "[Unsafe](javascript:alert(1))",
      "<div>Embedded HTML</div>",
    ].join("\n");

    const issues = checkMarkdownQuality(markdown);
    assert.deepEqual(issues.map(({ line }) => line), [3, 5, 6, 7, 8, 9]);
    assert.deepEqual(issues.map(({ severity }) => severity), [
      "warning",
      "warning",
      "warning",
      "warning",
      "error",
      "warning",
    ]);
    assert.match(issues[0].message, /skips from H1 to H3/);
    assert.match(issues[1].message, /alt text/);
    assert.match(issues[2].message, /target "#missing"/);
    assert.match(issues[3].message, /Duplicate heading/);
    assert.match(issues[4].message, /Unsafe HTML or URL/);
    assert.match(issues[5].message, /Raw HTML/);

    const imageStart = markdown.indexOf("![ ]");
    assert.equal(issues[1].start, imageStart);
    assert.equal(issues[1].end, imageStart + "![ ](diagram.png)".length);
  });

  it("recognizes setext headings and valid local anchors", () => {
    const issues = checkMarkdownQuality("Overview\n========\n\n[Jump](#overview)");
    assert.deepEqual(issues, []);
  });

  it("recognizes explicit HTML IDs as local link targets", () => {
    const issues = checkMarkdownQuality('<div id="details"></div>\n\n[Jump](#details)');
    assert.deepEqual(issues.map(({ message }) => message), [
      "Raw HTML may be sanitized in the preview; prefer Markdown syntax.",
    ]);
  });

  it("ignores examples inside fenced and inline code", () => {
    const markdown = [
      "```md",
      "![ ](image.png)",
      "### Missing heading",
      "[Broken](#missing)",
      "<script>alert(1)</script>",
      "```",
      "",
      "`![ ](inline.png)`",
    ].join("\n");

    assert.deepEqual(checkMarkdownQuality(markdown), []);
  });
});
