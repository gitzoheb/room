import User from '../models/user.model.js';

const requireUser = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']; // or use cookies/session
    if (!userId) return res.status(401).json({ message: 'User ID required' });

    const user = await User.findById(userId);
    if (!user) return res.status(403).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: 'User check failed', error: err.message });
  }
};

export default requireUser;
