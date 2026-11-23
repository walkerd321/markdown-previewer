import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows the current application version unobtrusively", async ({ page }) => {
  await page.route("**/version.json", (route) => route.fulfill({ json: { version: "2.4.6" } }));
  await page.reload();

  await expect(page.locator("#appVersion")).toHaveText("v2.4.6");
});

test("defaults to System and follows operating system appearance changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();

  await expect(page.locator("#themeSelect")).toHaveValue("system");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 24, 34)");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(237, 240, 245)");
});

test("persists an explicit Dark theme regardless of system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByLabel("Color theme").selectOption("dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 24, 34)");
  await expect(page.locator("#markdown")).toHaveCSS("background-color", "rgb(23, 30, 41)");
  await expect(page.locator("#preview")).toHaveCSS("background-color", "rgb(29, 36, 49)");

  await page.reload();

  await expect(page.getByLabel("Color theme")).toHaveValue("dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 24, 34)");
});

test("persists an explicit Light theme regardless of system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByLabel("Color theme").selectOption("light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(237, 240, 245)");

  await page.reload();

  await expect(page.getByLabel("Color theme")).toHaveValue("light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(237, 240, 245)");
});

test("keeps the theme selector and toolbar actions visible on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const selector of ["#themeSelect", "#importMarkdown", "#copyHtml", "#downloadHtml", "#downloadMarkdown"]) {
    const bounds = await page.locator(selector).boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(156);
  }
});

test("updates the preview as Markdown is edited", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Live\n\n**updated**");

  await expect(page.locator("#preview h1")).toHaveText("Live");
  await expect(page.locator("#preview strong")).toHaveText("updated");
});

test("creates, renames, switches, and preserves named drafts", async ({ page }) => {
  await page.getByLabel("Draft name").fill("Project Notes");
  await page.getByLabel("Draft name").press("Enter");
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Project notes");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.getByLabel("Draft name")).toHaveValue("Draft 2");
  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("");
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Second draft");
  await page.getByLabel("Draft name").fill("Meeting Notes");
  await page.getByLabel("Draft name").press("Enter");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Draft", { exact: true }).selectOption({ label: "Project Notes" });
  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("# Project notes");

  await page.reload();
  await page.getByLabel("Draft", { exact: true }).selectOption({ label: "Project Notes" });
  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("# Project notes");
});

test("finds, replaces, and navigates document text", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "Markdown input" });
  await editor.fill("Alpha beta\nAlpha gamma");
  await page.getByRole("button", { name: "Find" }).click();
  await page.getByRole("searchbox", { name: "Find" }).fill("Alpha");
  await page.getByRole("button", { name: "Next match" }).click();
  await expect(page.getByRole("searchbox", { name: "Find" })).toHaveValue("Alpha");
  await expect(page.locator("#findStatus")).toHaveText("1 of 2");

  await page.getByRole("textbox", { name: "Replace" }).fill("Omega");
  await page.getByRole("button", { name: "All" }).click();
  await expect(editor).toHaveValue("Omega beta\nOmega gamma");
});

test("shows a clickable document outline", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Overview\n\n## Details\n\n### Example");
  await page.getByRole("button", { name: "Outline" }).click();

  await expect(page.locator("#outlineResults")).toContainText("Overview");
  await expect(page.locator("#outlineResults")).toContainText("Details");
  await page.getByRole("button", { name: "· Details" }).click();
  const selectedText = await page.getByRole("textbox", { name: "Markdown input" }).evaluate(
    (input) => input.value.slice(input.selectionStart, input.selectionEnd),
  );
  expect(selectedText).toBe("## Details");
});

test("reports Markdown quality issues and jumps to their source", async ({ page }) => {
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
  await page.getByRole("textbox", { name: "Markdown input" }).fill(markdown);
  await page.getByRole("button", { name: "Quality check" }).click();

  await expect(page.locator("#qualitySummary")).toHaveText("1 error, 5 warnings found.");
  await expect(page.locator("#qualityResults li")).toHaveCount(6);

  await page.getByRole("button", { name: /Line 3: Heading level skips/ }).click();
  const selectedText = await page.getByRole("textbox", { name: "Markdown input" }).evaluate(
    (input) => input.value.slice(input.selectionStart, input.selectionEnd),
  );
  expect(selectedText).toBe("### Details");
});

test("reports a clean Markdown document", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Guide\n\n[Top](#guide)");
  await expect(page.locator("#preview h1")).toHaveAttribute("id", "guide");
  await expect(page.locator("#preview a")).toHaveAttribute("href", "#guide");
  await page.getByRole("button", { name: "Quality check" }).click();

  await expect(page.locator("#qualitySummary")).toHaveText("No issues found.");
  await expect(page.locator("#qualityResults")).toBeEmpty();
});

test("saves the current draft locally and shows its save status", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "Markdown input" });
  await editor.fill("# Draft");

  await expect(page.locator("#draftStatus")).toHaveText("Unsaved file changes");
  await page.reload();
  await expect(editor).toHaveValue("# Draft");
});

test("resizes both panes with the separator and remembers the split", async ({ page }) => {
  const separator = page.getByRole("separator", { name: "Resize editor and preview" });
  const workspace = await page.locator("#workspace").boundingBox();
  const handle = await separator.boundingBox();
  const startX = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(workspace.x + workspace.width * 0.62, y, { steps: 5 });
  await page.mouse.up();

  const resizedValue = Number(await separator.getAttribute("aria-valuenow"));
  expect(resizedValue).toBeGreaterThan(55);
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  const keyboardValue = await separator.getAttribute("aria-valuenow");
  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", keyboardValue);
});

test("supports formatting, link, and Markdown save shortcuts", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "Markdown input" });
  await editor.fill("bold");
  await editor.evaluate((input) => input.setSelectionRange(0, 4));
  await editor.press("Control+B");
  await expect(editor).toHaveValue("**bold**");
  await expect(page.locator("#preview strong")).toHaveText("bold");

  await editor.fill("italic");
  await editor.evaluate((input) => input.setSelectionRange(0, 6));
  await editor.press("Control+I");
  await expect(editor).toHaveValue("*italic*");

  await editor.fill("link");
  await editor.evaluate((input) => input.setSelectionRange(0, 4));
  await editor.press("Control+K");
  await expect(editor).toHaveValue("[link](url)");

  const downloadPromise = page.waitForEvent("download");
  await editor.press("Control+S");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("markdown-export.md");
});

test("imports a Markdown file into the editor", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#markdownFile").setInputFiles({
    name: "notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Imported\n\nFrom a file."),
  });

  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("# Imported\n\nFrom a file.");
  await expect(page.locator("#preview h1")).toHaveText("Imported");
});

test("warns before replacing a draft and preserves it when import is cancelled", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "Markdown input" });
  await editor.fill("# Keep this draft");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#markdownFile").setInputFiles({
    name: "replacement.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Replacement"),
  });

  await expect(editor).toHaveValue("# Keep this draft");
  await expect(page.locator("#preview h1")).toHaveText("Keep this draft");
});

test("imports a Markdown file dropped onto the editor", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept());
  await page.evaluate(() => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(["# Dropped"], "dropped.md", { type: "text/markdown" }));
    window.testDataTransfer = dataTransfer;
    document.querySelector("#editorPane").dispatchEvent(new DragEvent("dragenter", {
      bubbles: true,
      dataTransfer,
    }));
  });

  await expect(page.locator(".drop-hint")).toBeVisible();
  await page.evaluate(() => {
    document.querySelector("#editorPane").dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      dataTransfer: window.testDataTransfer,
    }));
  });

  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("# Dropped");
  await expect(page.locator("#preview h1")).toHaveText("Dropped");
});

test("copies sanitized rendered HTML", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Copy test");
  await page.getByRole("button", { name: "Copy HTML" }).click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('<h1 id="copy-test">Copy test</h1>');
});

test("downloads a complete HTML document", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Download test");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .html" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("markdown-export.html");
  const stream = await download.createReadStream();
  let html = "";
  for await (const chunk of stream) html += chunk.toString();
  expect(html).toContain('<h1 id="download-test">Download test</h1>');
  expect(html).toContain("<!doctype html>");
});

test("downloads the Markdown source", async ({ page }) => {
  const markdown = "# Source\n\nKeep **formatting**.";
  await page.getByRole("textbox", { name: "Markdown input" }).fill(markdown);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save .md" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("markdown-export.md");
  const stream = await download.createReadStream();
  let contents = "";
  for await (const chunk of stream) contents += chunk.toString();
  expect(contents).toBe(markdown);
});

test("clears the editor and rendered preview", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Clear me");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear" }).click();

  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("");
  await expect(page.locator("#preview")).toBeEmpty();
});

test("keeps the draft when the clear confirmation is cancelled", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "Markdown input" });
  await editor.fill("# Keep me");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Clear" }).click();

  await expect(editor).toHaveValue("# Keep me");
  await expect(page.locator("#preview h1")).toHaveText("Keep me");
});
