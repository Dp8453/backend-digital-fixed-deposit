export const successResponse = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

export const paginatedResponse = (res, message = 'Success', data = [], page = 1, limit = 10, total = 0, statusCode = 200) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};
