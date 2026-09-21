// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString()
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 404,
    path: req.path
  });
};

export const requestLogger = (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
};
