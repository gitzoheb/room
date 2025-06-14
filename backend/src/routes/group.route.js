import { Router } from "express";
import {
  createGroup,
  deleteGroup,
  getAllGroups,
  getGroupById,
  removeMemberFromGroup,
  updateGroup,
  addMemberToGroup,
  removeGroupAvatar,
} from "../controllers/group.controller.js";
import requireUser from "../middlewares/requireUser.js";
import upload from "../middlewares/upload.js";

const router = Router();

router.post("/", requireUser, upload.single('avatar'), createGroup);
router.get("/", requireUser, getAllGroups);
router.get("/:groupId", requireUser, getGroupById);
router.patch("/:groupId", requireUser, upload.single('avatar'), updateGroup);
router.delete("/:groupId", requireUser, deleteGroup);
router.patch("/:groupId/add-member", requireUser, addMemberToGroup);
router.patch("/:groupId/remove-member", requireUser, removeMemberFromGroup);
router.patch("/:groupId/remove-avatar", requireUser, removeGroupAvatar);

export default router;
