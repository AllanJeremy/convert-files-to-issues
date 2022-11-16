import { Octokit } from "octokit";
import { readdirSync } from "fs";
import * as chalk from "chalk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

function getExistingIssues(owner: string, repo: string) {
  // TODO: Add a workaround that keeps checking until we no longer have issues to check
  return octokit
    .graphql(
      `
  query lastIssues($owner: String!, $repo: String!, $num: Int = 100) {
    repository(owner: $owner, name: $repo) {
      issues(last: $num) {
        edges {
          node {
            title
          }
        }
      }
    }
  }
  `,
      {
        owner,
        repo,
        num: 100,
      }
    )
    .then(
      (response) =>
        (response as any).repository.issues.edges.map(
          (issue) => issue.node.title
        ) || []
    )
    .catch((_) => []);
}

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
      console.log(JSON.stringify(response));
      console.log(
        chalk.greenBright(`Successfully created issue: ${data.title}`)
      );
      return response;
    })
    .catch((err) => {
      console.error(chalk.redBright("Something went wrong: "), err);
      return err;
    });
}

function issueAlreadyExists(existingIssues: string[], issueTitle) {
  return existingIssues.includes(issueTitle);
}

async function createConversionIssues(
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

  const { owner, repo } = extractRepoDataFromUrl(repoUrl);
  const existingIssueNames = await getExistingIssues(owner, repo);

  return Promise.all(
    fileNames.map(async (fileName, i) => {
      const { title, body } = generateIssueTitleAndBody(
        repoUrl,
        branch,
        sourceDirFromRoot,
        fileName
      );

      console.log();
      // Prevent creation if the issue already exists
      if (issueAlreadyExists(existingIssueNames, title)) {
        console.log(
          `${chalk.bgYellow(chalk.black("WARNING: "))} ${chalk.yellow(
            `Skipped. An issue with the same title (${chalk.bgYellow(
              chalk.black(title)
            )}) already exists`
          )}`
        );
        return;
      }

      const createStatus = await createGithubIssue({
        owner,
        repo,
        title,
        body,
      });

      console.log(
        chalk.yellow(
          "Secondary rate limit probably hit. You need to run the tool again."
        ),
        fileName
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
