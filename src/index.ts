import { Octokit } from "octokit";
import { readdirSync } from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

function getFileNamesFromGit(repoUrl: string, sourceDirFromRoot: string) {
  // TODO: Add implementation
}

// get list of file names from a given directoru
function getFileNamesLocally(
  startingDir = ".",
  fileExtension = "lua"
): string[] {
  const dirContents = readdirSync(startingDir, { withFileTypes: true });

  return (
    dirContents
      .map((content) => {
        if (content.isDirectory()) {
          const dir = path.join(startingDir, content.name);
          return getFileNamesLocally(dir).map(
            (subdirContent) => `${content.name}/${subdirContent}`
          );
        }

        return content.name as string;
      })
      .flat() as string[]
  ).filter((c) => c.endsWith(`.${fileExtension}`));
}

function extractRepoDataFromUrl(repoUrl: string) {
  // TODO: Add implementation
  return {
    owner: "AllanJeremy",
    repo: "test",
  };
}

function getUpstreamFilePath(
  repoUrl: string,
  branch: string,
  sourceDirFromRoot: string,
  fileName: string
) {
  return `${repoUrl}/tree/${branch}/${sourceDirFromRoot}/${fileName}`;
}

function generateIssueTitleAndBody(
  repoUrl: string,
  branch: string,
  sourceDirFromRoot: string,
  fileName: string
) {
  const titleTemplate = `Port ${fileName}`;
  const bodyTemplate =
    "[Upstream `" +
    fileName +
    "` code](" +
    getUpstreamFilePath(repoUrl, branch, sourceDirFromRoot, fileName) +
    ")";

  return {
    title: titleTemplate,
    body: bodyTemplate,
  };
}

function createConversionIssues(
  repoUrl: string,
  branch: string,
  projectRootDir = ".",
  sourceDirFromRoot = "src"
) {
  const startingDir = path.join(projectRootDir, sourceDirFromRoot);
  return Promise.all(
    getFileNamesLocally(startingDir).map(async (fileName, i) => {
      // TODO: Check if there are duplicates

      const { owner, repo } = extractRepoDataFromUrl(repoUrl);
      const { title, body } = generateIssueTitleAndBody(
        repoUrl,
        branch,
        sourceDirFromRoot,
        fileName
      );

      return octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
      });
    })
  );
}

async function main() {
  createConversionIssues(
    "https://github.com/thisdot/react-hooks-testing-library-lua",
    "main",
    "../../ThisDot/Roblox/TestingLibrary/react-hooks-lua",
    "src"
  );
}

main();
