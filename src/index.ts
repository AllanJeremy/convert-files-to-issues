import { Octokit } from "octokit";
import { readdirSync } from "fs";
import * as chalk from "chalk";
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
  // TODO: Replace this to change what repo you want to generate issues for
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

async function createGithubIssue(data: {
  owner: string;
  repo: string;
  title: string;
  body: string;
}) {
  console.log(
    chalk.grey(`Preparing to create issue: ${chalk.blueBright(data.title)}`)
  );

  return octokit.rest.issues
    .create(data)
    .then((response) => {
      console.log(
        chalk.greenBright(`\nSuccessfully created issue: ${data.title}`)
      );
      return response;
    })
    .catch((err) => {
      console.error(chalk.redBright("Something went wrong: "), err);
      return err;
    });
}

function createConversionIssues(
  repoUrl: string,
  branch: string,
  projectRootDir = ".",
  sourceDirFromRoot = "src",
  fileExtension = "lua"
) {
  const startingDir = path.join(projectRootDir, sourceDirFromRoot);
  const fileNames = getFileNamesLocally(startingDir, fileExtension);

  console.log(
    chalk.blue(
      `Preparing to convert files to issues (${fileNames.length} ${fileExtension} files found)`
    )
  );

  return Promise.all(
    fileNames.map(async (fileName, i) => {
      const { owner, repo } = extractRepoDataFromUrl(repoUrl);
      const { title, body } = generateIssueTitleAndBody(
        repoUrl,
        branch,
        sourceDirFromRoot,
        fileName
      );

      const createStatus = await createGithubIssue({
        owner,
        repo,
        title,
        body,
      });

      console.log(
        "Creation status: ",
        chalk.bgGrey(JSON.stringify(createStatus))
      );

      return createStatus;
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
