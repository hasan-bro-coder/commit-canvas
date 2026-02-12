const express = require("express");
const path = require("path");
const open = require("open");
const fs = require("fs");
const { exit } = require("process");
const simpleGit = require("simple-git");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const repoPath = path.join(__dirname, "repo");
const git = simpleGit(repoPath);

function dayOfYearToMonthDay(dayNumber, year) {
  if (dayNumber < 1) {
    throw new Error("Day number must be >= 1");
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const monthLengths = [
    31,
    isLeap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const maxDays = isLeap ? 366 : 365;
  if (dayNumber > maxDays) {
    throw new Error(
      `Day number must be between 1 and ${maxDays} for year ${year}`,
    );
  }

  let month = 1;
  while (dayNumber > monthLengths[month - 1]) {
    dayNumber -= monthLengths[month - 1];
    month++;
  }

  const pad = (n) => n.toString().padStart(2, "0");
  return { month: pad(month), day: pad(dayNumber) };
}

async function initRepo() {
  try {
    await git.init();
    console.log("Git repository initialized");
  } catch (error) {
    console.error("Failed to initialize repo:", error);
  }
}
initRepo();

app.post("/config", async (req, res) => {
  let config = req.body;

  let dayCounter = 0;

  for (let week = 0; week < 53; week++) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const commitCount = config.matrix[dayOfWeek][week];

      if (commitCount === -1) {
        continue;
      }

      dayCounter++;

      if (commitCount === 0) {
        continue;
      }

      const date = dayOfYearToMonthDay(dayCounter, config.year);
      console.log(date);
      for (let commitIndex = 0; commitIndex < commitCount; commitIndex++) {
        const fileContent = `today is ${date.day}/${date.month}/${config.year}\n${config.massage}\ncommit number ${commitIndex}`;
        const commitDate = `${config.year}-${date.month}-${date.day} 00:09:11`;
        const commitMessage = `today is ${date.day}/${date.month}/${config.year} ${config.massage} commit number ${commitIndex}`;

        await fs.promises.writeFile(
          path.join(repoPath, "date.txt"),
          fileContent,
        );
        await git.add(".");
        await git.commit(commitMessage, undefined, {
          "--date": commitDate,
        });
      }
    }
  }

  res.json({ status: "ok" });

  console.log("All commits have been created. push the repo to github");

  exit();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await open.default(`http://localhost:${PORT}`);
});
