import { pathToFileURL } from "node:url";

export function calculateNextVersion(currentVersion, title, body = "") {
  const conventionalCommit = title.match(/^([a-z][a-z0-9-]*)(?:\([^)]+\))?(!)?:\s+.+$/);
  if (!conventionalCommit) {
    throw new Error("Merged pull request title must follow Conventional Commits.");
  }

  if (!currentVersion) {
    return { version: "1.0.0", shouldTag: true, bump: "initial" };
  }

  const versionMatch = currentVersion.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if (!versionMatch) {
    throw new Error(`Invalid current semantic version: ${currentVersion}`);
  }

  let [major, minor, patch] = versionMatch.slice(1).map(Number);
  const breaking = conventionalCommit[2] === "!" || /^BREAKING CHANGE:\s*\S/im.test(body);

  if (breaking) {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (conventionalCommit[1] === "feat") {
    minor += 1;
    patch = 0;
  } else if (conventionalCommit[1] === "fix") {
    patch += 1;
  } else {
    return { version: currentVersion, shouldTag: false, bump: "none" };
  }

  return {
    version: `${major}.${minor}.${patch}`,
    shouldTag: true,
    bump: breaking ? "major" : conventionalCommit[1] === "feat" ? "minor" : "patch",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = calculateNextVersion(
      process.env.CURRENT_VERSION || "",
      process.env.PR_TITLE || "",
      process.env.PR_BODY || "",
    );
    process.stdout.write(`version=${result.version}\nshould_tag=${result.shouldTag}\nbump=${result.bump}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
