import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateNextVersion } from "../scripts/next-version.js";

describe("calculateNextVersion", () => {
  it("starts the first release at 1.0.0", () => {
    assert.deepEqual(calculateNextVersion("", "feat: add version display"), {
      version: "1.0.0",
      shouldTag: true,
      bump: "initial",
    });
  });

  it("increments minor for features", () => {
    assert.equal(calculateNextVersion("1.2.3", "feat(editor): add shortcuts").version, "1.3.0");
  });

  it("increments patch for fixes", () => {
    assert.equal(calculateNextVersion("1.2.3", "fix: handle empty input").version, "1.2.4");
  });

  it("increments major for a breaking marker in the title or body", () => {
    assert.equal(calculateNextVersion("1.2.3", "feat!: change the API").version, "2.0.0");
    assert.equal(
      calculateNextVersion("1.2.3", "feat: change the API", "BREAKING CHANGE: old API removed").version,
      "2.0.0",
    );
  });

  it("does not create a tag for non-release conventional types", () => {
    assert.deepEqual(calculateNextVersion("1.2.3", "docs: update setup guide"), {
      version: "1.2.3",
      shouldTag: false,
      bump: "none",
    });
  });

  it("rejects non-conventional titles and invalid current versions", () => {
    assert.throws(() => calculateNextVersion("1.2.3", "Add some feature"), /Conventional Commits/);
    assert.throws(() => calculateNextVersion("v1.2", "fix: resolve issue"), /Invalid current semantic version/);
  });
});
