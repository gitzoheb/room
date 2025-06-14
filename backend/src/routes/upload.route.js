import { Router } from "express";
import upload from "../middlewares/upload.js";

const router = Router();

// POST /api/upload/avatar
router.post("/avatar", upload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  // Return the public URL to the uploaded file
  const url = `/uploads/${req.file.filename}`;
  res.status(200).json({ url });
});

export default router; 