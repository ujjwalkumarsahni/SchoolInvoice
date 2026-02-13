export const requireAdminOrHR = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
    return res.status(403).json({
      success: false,
      message: 'Admin or HR access required'
    });
  }
  next();
};
