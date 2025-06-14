import { Router } from "express";
import {
  createMessage,
  deleteMessage,
  getMessagesBetweenUsers,
  getMessagesInGroup,
  reactToMessage,
  updateMessage,
  deleteAllMessagesInGroup,
  deleteAllMessagesBetweenUsers,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} from "../controllers/message.controller.js";
import upload from "../middlewares/upload.js";
import requireUser from "../middlewares/requireUser.js";

const router = Router();

router.post("/", requireUser, upload.array("media", 5), createMessage);
router.get("/user/:user1Id/:user2Id", requireUser, getMessagesBetweenUsers);
router.get("/group/:groupId", requireUser, getMessagesInGroup);
router.delete("/:messageId", requireUser, deleteMessage);
router.patch("/:messageId", requireUser, updateMessage);
router.patch("/:messageId/react", requireUser, reactToMessage);
router.delete("/group/:groupId/all", requireUser, deleteAllMessagesInGroup);
router.delete("/user/:user1Id/:user2Id/all", requireUser, deleteAllMessagesBetweenUsers);
router.patch("/:messageId/pin", requireUser, pinMessage);
router.patch("/:messageId/unpin", requireUser, unpinMessage);
router.get("/pinned", requireUser, getPinnedMessages);

export default router;
