import Group from "../models/group.model.js";
import User from "../models/user.model.js";

export const createUser = async (req, res) => {
  try {
    console.log("Creating user...", req.body);
    const { name, username, avatar } = req.body;
    if (!name || !username) {
      return res.status(400).json({ message: "Name and username are required." });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const user = await User.create({ name, username, avatar });
    res.status(201).json(user);
  } catch (error) {
    console.log("Error while creating user", error);
    res.status(500).json({ message: "Server error while creating user." });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");
    res.status(200).json({ total, users });
  } catch (error) {
    console.log("Error while fetching users", error);
    res.status(500).json({ message: "Server error while fetching users." });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error while fetching user", error);
    res.status(500).json({ message: "Server error while fetching user." });
  }
};

export const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    }).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error while fetching user", error);
    res.status(500).json({ message: "Server error while fetching user." });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q)
      return res.status(400).json({ message: "Search query is missing." });

    const regex = new RegExp(q, "i");
    const users = await User.find({
      $or: [{ name: regex }, { username: regex }],
    });
    res.status(200).json(users);
  } catch (error) {
    console.log("Error while searching users", error);
    res.status(500).json({ message: "Server error while searching users." });
  }
};

export const updateUserById = async (req, res) => {
  try {
    const { name, username, avatar } = req.body;
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (username && username !== user.username) {
      const taken = await User.findOne({ username: username.toLowerCase() });
      if (taken) {
        return res.status(409).json({ message: "This username is already taken. Please choose a different one." });
      }
      user.username = username.toLowerCase();
    }

    user.name = name || user.name;
    user.avatar = avatar || user.avatar;
    await user.save();
    res.status(200).json(user);
  } catch (error) {
    console.log("Error while updating user", error);
    res.status(500).json({ message: "Server error while updating user." });
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("Error while deleting user", error);
    res.status(500).json({ message: "Server error while deleting user." });
  }
};

export const addUserToGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
      res
        .status(200)
        .json({ message: "User added to group successfully", group });
    }
  } catch (error) {
    console.log("Error while adding user to group", error);
    res
      .status(500)
      .json({ message: "Server error while adding user to group." });
  }
};

export const removeUserFromGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    group.members = group.members.filter((id) => id.toString() !== userId);
    await group.save();
    res
     .status(200)
     .json({ message: "User removed from group successfully", group });
  } catch (error) {
    console.log("Error while removing user from group", error);
    res
      .status(500)
      .json({ message: "Server error while removing user from group." });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    const groups = await Group.find({ members: userId }).populate("members", "name username");
    res.status(200).json(groups);
  } catch (error) {
    console.log("Error while fetching user groups", error);
    res
      .status(500)
      .json({ message: "Server error while fetching user groups." });
  }
};
