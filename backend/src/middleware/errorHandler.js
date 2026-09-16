const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  // Handle PostgreSQL specific errors
  if (err.code === '23505') {
    // Unique violation
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
      detail: err.detail
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist or cannot be modified because of existing references.',
      detail: err.detail
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
};

module.exports = errorHandler;
