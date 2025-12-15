const express = require("express");
const path = require("path");
const open = require("open");
const { exec } = require("child_process");
const fs = require("fs");
const { exit } = require("process");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));



async function exec_cmd(str) {
  return new Promise((resolve, reject) => {
    exec(
      str,
      { cwd: path.join(__dirname, "repo") }, // Setting the current working directory to "repo"
      (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message} ${stderr}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
        //   reject(new Error(stderr));
          // return;
        }
        console.log(`stdout: ${stdout}`);
        resolve(stdout);
      }
    );
  });
}

// Function to convert day of the year to month and day
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

  const pad = (n) => n.toString().padStart(2, "0"); // Function to pad numbers with leading zeros
  return { month: pad(month), day: pad(dayNumber) }; // Return the month and day
}

// Function to initialize a Git repository
async function initRepo() {
  try {
    await exec_cmd("git init");
  } catch (error) {
    console.error("Failed to initialize repo:", error);
  }
}
initRepo();


// Endpoint to configure the repository based on the provided data
app.post("/config", async (req, res) => {
  let config = req.body;
  // 011****11**11111111**11111111**11111111**111******11
  // 011****11**11****11**11********11****11**11*1*****11
  // 011****11**11****11**11********11****11**11**1****11
  // 011111111**11111111**11111111**11111111**11***1***11
  // 011****11**11****11********11**11****11**11****1**11
  // *11****11**11****11********11**11****11**11*****1*11
  // *11****11**11****11**11111111**11****11**11******110

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
      
      for (let commitIndex = 0; commitIndex < commitCount; commitIndex++) {
        const fileContent = `today is ${date.day}/${date.month}/${config.year}\n${config.massage}\ncommit number ${commitIndex}`; // Prepare the file content
        const commitDate = `${config.year}-${date.month}-${date.day} 00:09:11`; // Format the commit date
        const commitMessage = `today is ${date.day}/${date.month}/${config.year} ${config.massage} commit number ${commitIndex}`; // Prepare the commit message
        
        await fs.promises.writeFile("repo/date.txt", fileContent); // Write the content to a file
        await new Promise((resolve) => setTimeout(resolve, 600)); // Wait for a short duration
        await exec_cmd("git add ."); // Stage the changes
        await new Promise((resolve) => setTimeout(resolve, 600)); // Wait again
        await exec_cmd(`git commit --date="${commitDate}" -m "${commitMessage}"`); // Commit the changes
      }
    }
  }

  res.json({ status: "ok" });
  exit();
});

// Endpoint to serve the main HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); 
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await open.default(`http://localhost:${PORT}`);
});
