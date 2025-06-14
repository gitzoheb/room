import Group from '../models/group.model.js';
import User from '../models/user.model.js';
import path from 'path';
import fs from 'fs';

// Create a group
export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const members = JSON.parse(req.body.members);
    const admin = req.user._id;

    if (!name || !admin) {
      return res.status(400).json({ message: 'Group name and admin are required.' });
    }

    const allMembers = [...new Set([admin.toString(), ...members.map(id => id.toString())])];

    if (allMembers.length < 2) {
      return res.status(400).json({ message: "Group must have at least 2 members" });
    }

    const groupData = {
      name,
      admin,
      members: allMembers,
    };

    if (req.file) {
      groupData.avatar = `/uploads/${req.file.filename}`;
    }

    const group = await Group.create(groupData);

    await User.updateMany(
      { _id: { $in: allMembers } },
      { $push: { groups: group._id } }
    );

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "username email avatar")
      .populate("members", "username email avatar");

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.log("Error while creating group", error);
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
};

// Get all groups
export const getAllGroups = async (req, res) => {
  try {
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const query = {
      $or: [
        { admin: userId },
        { members: userId },
      ],
    };
    const total = await Group.countDocuments(query);
    const groups = await Group.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('admin')
      .populate('members');
    res.status(200).json({ total, groups });
  } catch (error) {
    console.log("Error while fetching groups", error);
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
};

// Get single group by ID
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('admin').populate('members');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.log("Error while fetching group", error);
    res.status(500).json({ message: 'Error fetching group', error: error.message });
  }
};

// Update group (only admin)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Authorize using the authenticated user injected by requireUser middleware
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can update the group.' });
    }

    // Update name if provided
    if (name) group.name = name;

    // Handle avatar update if a file is uploaded
    if (req.file) {
      try {
        // Build absolute path to the existing avatar file on disk and remove it (if any)
        if (group.avatar) {
          const oldPath = group.avatar.startsWith('/') ? group.avatar.slice(1) : group.avatar; // remove leading slash for fs access
          const absoluteOldPath = path.join(process.cwd(), oldPath);
          if (fs.existsSync(absoluteOldPath)) {
            fs.unlinkSync(absoluteOldPath);
          }
        }
      } catch (err) {
        console.warn('Failed to remove old avatar:', err.message);
      }
      group.avatar = `/uploads/${req.file.filename}`;
    }

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate("admin", "username email avatar")
      .populate("members", "username email avatar");

    res.status(200).json({ message: 'Group updated', group: populatedGroup });
  } catch (error) {
    console.log("Error while updating group", error);
    res.status(500).json({ message: 'Error updating group', error: error.message });
  }
};

// Delete group (only admin)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { requesterId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== requesterId) {
      return res.status(403).json({ message: 'Only admin can delete the group.' });
    }

    await group.deleteOne();
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.log("Error while deleting group", error);
    res.status(500).json({ message: 'Error deleting group', error: error.message });
  }
};

// Add member (only admin)
export const addMemberToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, requesterId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== requesterId) {
      return res.status(403).json({ message: 'Only admin can add members.' });
    }

    if (group.members.some(member => member.toString() === userId)) {
      return res.status(400).json({ message: 'User already a member of the group.' });
    }

    group.members.push(userId);
    await group.save();

    const populatedGroup = await Group.findById(groupId).populate("admin", "username email avatar").populate("members", "username email avatar");

    res.status(200).json({ message: 'Member added', group: populatedGroup });
  } catch (error) {
    console.log("Error while adding member", error);
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
};

// Remove member (only admin)
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, requesterId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== requesterId) {
      return res.status(403).json({ message: 'Only admin can remove members.' });
    }

    if (group.admin.toString() === userId) {
      return res.status(400).json({ message: 'Admin cannot remove themselves from the group.' });
    }

    group.members = group.members.filter(
      member => member.toString() !== userId
    );

    await group.save();

    const populatedGroup = await Group.findById(groupId).populate("admin", "username email avatar").populate("members", "username email avatar");

    res.status(200).json({ message: 'Member removed', group: populatedGroup });
  } catch (error) {
    console.log("Error while removing member", error);
    res.status(500).json({ message: 'Error removing member', error: error.message });
  }
};

// Remove group avatar (only admin)
export const removeGroupAvatar = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove the group avatar.' });
    }
    if (group.avatar) {
      const oldPath = group.avatar.startsWith('/') ? group.avatar.slice(1) : group.avatar;
      const absoluteOldPath = path.join(process.cwd(), oldPath);
      if (fs.existsSync(absoluteOldPath)) {
        try {
          fs.unlinkSync(absoluteOldPath);
        } catch (err) {
          console.warn('Failed to remove avatar:', err.message);
        }
      }
    }
    group.avatar = undefined;
    await group.save();
    const populatedGroup = await Group.findById(groupId)
      .populate('admin', 'username email avatar')
      .populate('members', 'username email avatar');
    res.status(200).json({ message: 'Group avatar removed', group: populatedGroup });
  } catch (error) {
    console.log('Error while removing group avatar', error);
    res.status(500).json({ message: 'Error removing group avatar', error: error.message });
  }
};
