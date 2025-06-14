import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import uploadRoutes from "./routes/upload.route.js";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import setupSocket from "./config/socket.js";
import deleteOldMessages from "./config/cron.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create native HTTP server
const httpServer = http.createServer(app);

// Setup socket.io in separate module
setupSocket(httpServer);

// Resolve an absolute path to the "uploads" directory regardless of the
// current working directory. This guarantees the same folder is used for
// both saving files (multer) and serving them statically.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(cors({
  origin: "http://localhost:5000",
  credentials: true,
}));

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);

connectDB().then(() => {
  deleteOldMessages();
  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
