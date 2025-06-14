import express from "express";
import {
    addUserToGroup,
  createUser,
  deleteUserById,
  getAllUsers,
  getUserById,
  getUserGroups,
  removeUserFromGroup,
  searchUsers,
  updateUserById,
} from "../controllers/user.controller.js";

const router = express.Router();

// create a new user
router.post("/", createUser);

// get all users
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Search users by query string
router.get("/search", searchUsers);

// Update user by ID
router.put("/:id", updateUserById);

// Delete user by ID
router.delete("/:id", deleteUserById);

// Add user to group (via body or params)
router.post("/:id/groups/:groupId", addUserToGroup);

// Remove user from group
router.delete("/:id/groups/:groupId", removeUserFromGroup);

// Get all groups a user belongs to
router.get("/:id/groups", getUserGroups);

export default router;
