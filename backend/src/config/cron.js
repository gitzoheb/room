import cron from "node-cron";
import Message from "../models/message.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const deleteOldMessages = () => {
  // Schedule a job to run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      // Find messages that should be deleted (older than 45 days)
      const outdatedMessages = await Message.find({ createdAt: { $lt: fortyFiveDaysAgo } });

      // Collect all media file paths referenced by these messages so we can
      // remove the corresponding files from the uploads directory after the
      // messages are purged from the database.
      const filesToRemove = [];
      outdatedMessages.forEach((msg) => {
        msg.media?.forEach((m) => {
          if (!m?.url) return;
          // Stored URLs look like "/uploads/<filename>" – strip the leading slash
          const relativePath = m.url.startsWith("/") ? m.url.slice(1) : m.url;
          // Resolve the project root relative to this file (two levels up from
          // backend/src/config).
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const projectRoot = path.resolve(__dirname, "../../");
          filesToRemove.push(path.join(projectRoot, relativePath));
        });
      });

      // Delete the messages from the database
      const result = await Message.deleteMany({ _id: { $in: outdatedMessages.map((m) => m._id) } });

      // Delete the media files from the filesystem (if they still exist)
      filesToRemove.forEach((file) => {
        fs.unlink(file, (err) => {
          if (err && err.code !== "ENOENT") {
            console.error(`Failed to remove file ${file}:`, err);
          }
        });
      });

      console.log(`Deleted ${result.deletedCount} messages and ${filesToRemove.length} media files older than 45 days.`);
    } catch (error) {
      console.error("Error deleting old messages:", error);
    }
  });
};

export default deleteOldMessages; 