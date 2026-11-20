import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows the current application version unobtrusively", async ({ page }) => {
  await page.route("**/version.json", (route) => route.fulfill({ json: { version: "2.4.6" } }));
  await page.reload();

  await expect(page.locator("#appVersion")).toHaveText("v2.4.6");
});

test("updates the preview as Markdown is edited", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Live\n\n**updated**");

  await expect(page.locator("#preview h1")).toHaveText("Live");
  await expect(page.locator("#preview strong")).toHaveText("updated");
});

test("imports a Markdown file into the editor", async ({ page }) => {
  await page.locator("#markdownFile").setInputFiles({
    name: "notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Imported\n\nFrom a file."),
  });

  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("# Imported\n\nFrom a file.");
  await expect(page.locator("#preview h1")).toHaveText("Imported");
});

test("copies sanitized rendered HTML", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Copy test");
  await page.getByRole("button", { name: "Copy HTML" }).click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("<h1>Copy test</h1>");
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
  expect(html).toContain("<h1>Download test</h1>");
  expect(html).toContain("<!doctype html>");
});

test("clears the editor and rendered preview", async ({ page }) => {
  await page.getByRole("textbox", { name: "Markdown input" }).fill("# Clear me");
  await page.getByRole("button", { name: "Clear" }).click();

  await expect(page.getByRole("textbox", { name: "Markdown input" })).toHaveValue("");
  await expect(page.locator("#preview")).toBeEmpty();
});
