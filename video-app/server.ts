import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { spawn } from "child_process";
import cors from "cors";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PORT = 3000;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "output");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

interface TaskProgress {
  status: "queued" | "processing" | "completed" | "error";
  progress: number;
  frame: number;
  fps: number;
  time: string;
  speed: string;
  bitrate: string;
  downloadUrl: string | null;
  error: string | null;
}

const tasks = new Map<string, TaskProgress>();

const PLATFORM_CONFIGS: Record<string, { w: number; h: number; maxBitrate: string; fps: number }> = {
  whatsapp: { w: 1280, h: -2, maxBitrate: "2500k", fps: 30 },
  instagram: { w: 1080, h: 1920, maxBitrate: "3500k", fps: 30 },
  tiktok: { w: 1080, h: 1920, maxBitrate: "3500k", fps: 30 },
  "youtube-shorts": { w: 1080, h: 1920, maxBitrate: "4000k", fps: 30 },
  twitter: { w: 1280, h: -2, maxBitrate: "2500k", fps: 30 },
  custom: { w: 1280, h: -2, maxBitrate: "3500k", fps: 30 },
};

async function checkVaapi(): Promise<boolean> {
  try {
    if (!fs.existsSync("/dev/dri/renderD128")) return false;
    const { stdout } = await execFileAsync("vainfo", [], { timeout: 5000 });
    return stdout.includes("VAEntrypoint");
  } catch {
    return false;
  }
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", filePath,
    ]);
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function startServer() {
  const vaapiAvailable = await checkVaapi();
  console.log(`VA-API: ${vaapiAvailable ? "Disponible" : "No disponible"}`);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/hw-status", (_req, res) => {
    res.json({ vaapi: vaapiAvailable });
  });

  app.get("/api/progress/:taskId", (req, res) => {
    const task = tasks.get(req.params.taskId);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  });

  app.get("/api/download/:filename", (req, res) => {
    const filePath = path.join(OUTPUT_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send("File not found");
    }
  });

  app.post("/api/optimize", upload.single("video"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No video file uploaded" });
      return;
    }

    const platform = (req.body.platform as string) || "whatsapp";
    const customWidth = parseInt(req.body.customWidth as string) || 1280;
    const useCpu = req.body.useCpu === "true";
    const inputPath = req.file.path;
    const config = { ...(PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.whatsapp) };
    if (platform === "custom") config.w = customWidth;

    const taskId = `task_${Date.now()}`;
    const outputFilename = `optimized_${taskId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    tasks.set(taskId, {
      status: "processing",
      progress: 0,
      frame: 0,
      fps: 0,
      time: "00:00:00",
      speed: "0x",
      bitrate: "",
      downloadUrl: null,
      error: null,
    });

    // Return task ID immediately so frontend can poll
    res.json({ taskId, downloadUrl: `/api/download/${outputFilename}` });

    // Process in background using spawn for real-time progress
    const duration = await getVideoDuration(inputPath);
    const useGpu = vaapiAvailable && !useCpu;
    const task = tasks.get(taskId)!;

    let ffmpegArgs: string[];

    if (useGpu) {
      ffmpegArgs = [
        "-y",
        "-hwaccel", "vaapi",
        "-hwaccel_output_format", "vaapi",
        "-i", inputPath,
        "-vf", `scale_vaapi=w=${config.w}:h=${config.h},format=nv12,hwdownload,format=nv12`,
        "-c:v", "h264_vaapi",
        "-qp", "24",
        "-c:a", "aac",
        "-b:a", "128k",
        "-r", config.fps.toString(),
        "-movflags", "+faststart",
        outputPath,
      ];
    } else {
      const scaleFilter = config.h === -2
        ? `scale=${config.w}:-2`
        : `scale=${config.w}:${config.h}`;

      ffmpegArgs = [
        "-y",
        "-i", inputPath,
        "-vf", scaleFilter,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-maxrate", config.maxBitrate,
        "-bufsize", config.maxBitrate,
        "-c:a", "aac",
        "-b:a", "128k",
        "-r", config.fps.toString(),
        "-movflags", "+faststart",
        outputPath,
      ];
    }

    console.log(`[task ${taskId}] Starting ffmpeg: ${useGpu ? "GPU" : "CPU"}`);

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    ffmpeg.stderr.on("data", (data: Buffer) => {
      const line = data.toString();
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      const frameMatch = line.match(/frame=\s*(\d+)/);
      const fpsMatch = line.match(/fps=\s*([\d.]+)/);
      const speedMatch = line.match(/speed=\s*([\d.]+x)/);
      const bitrateMatch = line.match(/bitrate=\s*([\d.]+\w+\/s)/);

      if (timeMatch && duration > 0) {
        const hours = parseFloat(timeMatch[1]);
        const minutes = parseFloat(timeMatch[2]);
        const seconds = parseFloat(timeMatch[3]);
        const current = hours * 3600 + minutes * 60 + seconds;
        task.progress = Math.min((current / duration) * 100, 99);
        task.time = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
      }
      if (frameMatch) task.frame = parseInt(frameMatch[1]);
      if (fpsMatch) task.fps = parseFloat(fpsMatch[1]);
      if (speedMatch) task.speed = speedMatch[1];
      if (bitrateMatch) task.bitrate = bitrateMatch[1];
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        task.status = "completed";
        task.progress = 100;
        task.downloadUrl = `/api/download/${outputFilename}`;
        console.log(`[task ${taskId}] Completed`);
      } else {
        task.status = "error";
        task.error = `FFmpeg exited with code ${code}`;
        console.error(`[task ${taskId}] Failed with code ${code}`);
      }
    });

    ffmpeg.on("error", (err) => {
      task.status = "error";
      task.error = err.message;
      console.error(`[task ${taskId}] Spawn error:`, err.message);
    });
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  AMD Video Optimizer`);
    console.log(`  VA-API: ${vaapiAvailable ? "✅ Disponible" : "❌ No disponible"}`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`${"=".repeat(50)}\n`);
  });
}

startServer().catch(console.error);