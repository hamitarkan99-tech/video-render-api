const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Render API is running");
});

app.post("/render", async (req, res) => {
  const { audioUrl, videoUrl } = req.body;

  const output = `output_${Date.now()}.mp4`;

  ffmpeg()
    .input(videoUrl)
    .input(audioUrl)
    .outputOptions("-c:v copy")
    .outputOptions("-c:a aac")
    .save(output)
    .on("end", () => {
      res.download(output, () => {
        fs.unlinkSync(output);
      });
    })
    .on("error", (err) => {
      console.error(err);
      res.status(500).send("Render failed");
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
