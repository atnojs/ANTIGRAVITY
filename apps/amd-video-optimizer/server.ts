import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import cors from "cors";

const PORT = 3000;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "output");

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post("/api/optimize", upload.single("video"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const inputPath = req.file.path;
    const outputFilename = `optimized_${req.file.filename}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    console.log(`Processing video: ${inputPath}`);

    // Progress tracking
    let progress = 0;

    const command = ffmpeg(inputPath)
      .output(outputPath)
      .size("1280x?") // Proportional scaling in fluent-ffmpeg
      .aspect("16:9") // Optional, but usually WhatsApp wants 16:9. Actually, let's keep it just proportional.
      .videoCodec("libx264") // Cloud Run doesn't have AMD GPUs, using CPU for demo
      .audioCodec("aac")
      .audioBitrate("128k")
      .outputOptions("-movflags +faststart")
      .on("progress", (p) => {
        progress = p.percent || 0;
        console.log(`Progress: ${progress.toFixed(2)}%`);
      })
      .on("error", (err) => {
        console.error("FFmpeg Error:", err);
        res.status(500).json({ error: "Encoding failed" });
      })
      .on("end", () => {
        console.log("Encoding finished");
        res.json({
          status: "success",
          downloadUrl: `/api/download/${outputFilename}`,
        });
      });

    // NOTE: If this were running on the user's WSL2 with AMD:
    // command
    //   .inputOptions("-hwaccel vaapi", "-hwaccel_device /dev/dri/renderD128")
    //   .videoCodec("h264_vaapi")
    //   .videoFilters("scale_vaapi=w=1280:h=720,format=nv12")

    command.run();
  });

  app.get("/api/download/:filename", (req, res) => {
    const filePath = path.join(OUTPUT_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send("File not found");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
