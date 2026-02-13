// import jwt from 'jsonwebtoken';
// import User from '../models/User.js';
// import UserRole from '../models/UserRole.js';

// export const authenticate = async (req, res, next) => {
//   try {
//     // Get token from cookie or header
//     const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Access denied. No token provided.' 
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     // Get user with active role and permissions
//     const user = await User.findById(decoded.userId)
//       .select('-passwordHash');
    
//     if (!user || !user.isActive) {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Token invalid. User not found or inactive.' 
//       });
//     }

//     // Get user's active role and permissions
//     const userRole = await UserRole.findOne({ 
//       user: user._id, 
//       isActive: true 
//     })
//     // const userRole = await UserRole.findOne({ 
//     //   user: user._id, 
//     //   isActive: true 
//     // }).populate('permissions');

//     if (!userRole) {
//       return res.status(403).json({ 
//         success: false,
//         message: 'No active role assigned to user.' 
//       });
//     }

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save();

//     // Add user and permissions to request
//     req.user = user;
//     req.userRole = userRole;
//     req.userPermissions = userRole.permissions?.permissions;

//     next();
//   } catch (error) {
//     console.error('Auth middleware error:', error);
    
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid token.' 
//       });
//     }
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Token expired.' 
//       });
//     }
    
//     res.status(500).json({ 
//       success: false,
//       message: 'Authentication failed.' 
//     });
//   }
// };


import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserRole from '../models/UserRole.js';

/**
 * Authenticate middleware - Your exact function
 */
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
    });
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

/**
 * Alias for authenticate (to match your route imports)
 */
export const protect = authenticate;

/**
 * Authorize middleware - Checks if user has required roles
 * @param {...string} allowedRoles - List of allowed roles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists (authenticated)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user role from req.user (assuming role field exists in User model)
      const userRole = req.user.role;

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'No role assigned to user'
        });
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`
        });
      }

      next();
    } catch (error) {
      console.error('Authorize middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed'
      });
    }
  };
};

/**
 * Require Admin or HR (your existing function)
 */
export const requireAdminOrHR = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
    return res.status(403).json({
      success: false,
      message: 'Admin or HR access required'
    });
  }
  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (user && user.isActive) {
        const userRole = await UserRole.findOne({ 
          user: user._id, 
          isActive: true 
        });

        if (userRole) {
          req.user = user;
          req.userRole = userRole;
          req.userPermissions = userRole.permissions?.permissions;
        }
      }
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

/**
 * Generate JWT Token
 */
export const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export default {
  authenticate,
  protect,
  authorize,
  requireAdminOrHR,
  optionalAuth,
  generateToken
};