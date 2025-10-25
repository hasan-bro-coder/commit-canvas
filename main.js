const express = require("express");
const path = require("path");
// const open = require("open");
const { exec } = require("child_process");
const fs = require("fs");
const { exit } = require("process");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let config = {};

async function exec_cmd(str) {
  return new Promise((resolve, reject) => {
    exec(
      str,
      { cwd: path.join(__dirname, "repo") },
      (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message} ${stderr}`);
          reject(error);
          return;
        }
        // if (stderr) {
        //   console.log(`stderr: ${stderr}`);
        //   reject(new Error(stderr));
        //   return;
        // }
        console.log(`stdout: ${stdout}`);
        resolve(stdout);
      }
    );
  });
}
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
      `Day number must be between 1 and ${maxDays} for year ${year}`
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
app.post("/config", async (req, res) => {
  config = req.body;
  // 011****11**11111111**11111111**11111111**111******11
  // 011****11**11****11**11********11****11**11*1*****11
  // 011****11**11****11**11********11****11**11**1****11
  // 011111111**11111111**11111111**11111111**11***1***11
  // 011****11**11****11********11**11****11**11****1**11
  // *11****11**11****11********11**11****11**11*****1*11
  // *11****11**11****11**11111111**11****11**11******110

  let z = 0;
  for (let j = 0; j < 53; j++) {
    for (let i = 0; i < 7; i++) {
      let el = config.matrix[i][j];
      if (el == -1) {
        continue;
      }
      z++;
      if (el == 0) {
        continue;
      }
      let date = dayOfYearToMonthDay(z, config.year);
      console.log(z, el, date);
      for (let e = 0; e < el; e++) {
        await new Promise((resolve, reject) =>
          fs.writeFile(
            "repo/date.txt",
            `today is ${date.day}/${date.month}/${config.year}\n${config.massage}\ncommit number ${e}`,
            async (err) => {
              if (err) reject(err);
              await new Promise((resolve) => setTimeout(resolve, 600)); // 2 second delay
              await exec_cmd(`git add .`);
              await new Promise((resolve) => setTimeout(resolve, 600));
              await exec_cmd(
                `git commit --date="${config.year}-${date.month}-${date.day} 00:09:11" -m "today is ${date.day}/${date.month}/${config.year} ${config.massage} commit number ${e}"`
              );
              resolve();
            }
          )
        );
      }
    }
  }
  // exec_cmd("git push -u -f origin main");

  res.json({ status: "ok" });
  exit();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  // await open.default(`http://localhost:${PORT}`);
});
