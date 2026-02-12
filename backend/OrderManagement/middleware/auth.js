import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserRole from '../models/UserRole.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with active role and permissions
    const user = await User.findById(decoded.userId)
      .select('-passwordHash');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalid. User not found or inactive.' 
      });
    }

    // Get user's active role and permissions
    const userRole = await UserRole.findOne({ 
      user: user._id, 
      isActive: true 
    })
    // const userRole = await UserRole.findOne({ 
    //   user: user._id, 
    //   isActive: true 
    // }).populate('permissions');

    if (!userRole) {
      return res.status(403).json({ 
        success: false,
        message: 'No active role assigned to user.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Add user and permissions to request
    req.user = user;
    req.userRole = userRole;
    req.userPermissions = userRole.permissions?.permissions;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Authentication failed.' 
    });
  }
};
