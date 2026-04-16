import express from "express";
import axios from "axios";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Render API is running");
});

app.post("/render", async (req, res) => {
  try {
    const { videos, audio } = req.body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ error: "videos array is required" });
    }

    if (!audio) {
      return res.status(400).json({ error: "audio is required" });
    }

    const videoPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const path = `video_${i}.mp4`;
      const writer = fs.createWriteStream(path);
      const response = await axios.get(videos[i], { responseType: "stream" });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      videoPaths.push(path);
    }

    const audioPath = "audio.mp3";
    const audioWriter = fs.createWriteStream(audioPath);
    const audioResponse = await axios.get(audio, { responseType: "stream" });

    audioResponse.data.pipe(audioWriter);

    await new Promise((resolve, reject) => {
      audioWriter.on("finish", resolve);
      audioWriter.on("error", reject);
    });

    fs.writeFileSync(
      "list.txt",
      videoPaths.map((v) => `file '${v}'`).join("\n")
    );

    ffmpeg()
      .input("list.txt")
      .inputOptions(["-f concat", "-safe 0"])
      .input(audioPath)
      .outputOptions(["-c:v libx264", "-c:a aac", "-shortest"])
      .save("output.mp4")
      .on("end", () => {
        res.download("output.mp4");
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "ffmpeg failed", details: err.message });
      });

  } catch (err) {
    console.error("Render error:", err);
    res.status(500).json({ error: "render failed", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Render server running on port ${PORT}`);
});
