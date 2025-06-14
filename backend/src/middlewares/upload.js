import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Determine an absolute path to the uploads directory **relative to this file**,
// not the process working directory. This avoids ENOENT errors when the
// application is started from a different folder (e.g. running
// `node backend/src/app.js` from the monorepo root).

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");

// Ensure the directory exists at runtime. `recursive: true` creates nested
// folders if necessary and is a no-op when the folder already exists.
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  console.error("Failed to create uploads directory:", err);
}

// Storage Engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniquename = `${Date.now()}-${file.originalname}`;
    cb(null, uniquename);
  },
});

const upload = multer({
  storage,
  limits:{
    fileSize:100*1024*1024, // 100MB limit
  }
});

export default upload;