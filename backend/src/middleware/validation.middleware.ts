import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import xss from 'xss';

/**
 * Custom sanitizers
 */
export const sanitizeHtml = (value: string): string => {
  return xss(value, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
};

/**
 * Common validation rules
 */
export const commonValidators = {
  // ID validators
  id: param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
    
  conversationId: param('conversationId')
    .isUUID()
    .withMessage('Invalid conversation ID format'),
    
  // Pagination validators
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  
  // User validators
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
  email: body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
    
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  // Content validators
  title: body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .customSanitizer(sanitizeHtml),
    
  content: body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10,000 characters')
    .customSanitizer(sanitizeHtml),
    
  // Search validators
  searchQuery: query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .customSanitizer(sanitizeHtml)
};

/**
 * Validation error handler middleware
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: (err as any).param || (err as any).path || 'unknown',
        message: err.msg,
        value: (err as any).value
      }))
    });
    return;
  }
  
  next();
};

/**
 * Create validation middleware chain
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Handle errors
    handleValidationErrors(req, res, next);
  };
};

/**
 * Auth validation rules
 */
export const authValidation = {
  register: [
    commonValidators.username,
    commonValidators.email,
    commonValidators.password,
    body('fullName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Full name must not exceed 100 characters')
      .customSanitizer(sanitizeHtml)
  ],
  
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

/**
 * Conversation validation rules
 */
export const conversationValidation = {
  create: [
    commonValidators.title,
    body('context')
      .optional()
      .isJSON()
      .withMessage('Context must be valid JSON')
  ],
  
  update: [
    commonValidators.id,
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be between 1 and 255 characters')
      .customSanitizer(sanitizeHtml),
    body('context')
      .optional()
      .isJSON()
      .withMessage('Context must be valid JSON')
  ],
  
  delete: [
    commonValidators.id
  ],
  
  get: [
    commonValidators.id
  ],
  
  list: [
    ...commonValidators.pagination,
    commonValidators.searchQuery
  ]
};

/**
 * Message validation rules
 */
export const messageValidation = {
  send: [
    commonValidators.conversationId,
    commonValidators.content
  ],
  
  list: [
    commonValidators.conversationId,
    ...commonValidators.pagination
  ]
};

/**
 * SQL injection prevention for raw queries
 */
export const sanitizeSqlIdentifier = (identifier: string): string => {
  // Only allow alphanumeric characters and underscores
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
};

/**
 * Prevent NoSQL injection for object queries
 */
export const sanitizeMongoQuery = (query: any): any => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const sanitized: any = {};
  
  for (const key in query) {
    if (key.startsWith('$')) {
      // Reject queries with MongoDB operators
      throw new Error('Invalid query parameter');
    }
    
    if (typeof query[key] === 'object') {
      sanitized[key] = sanitizeMongoQuery(query[key]);
    } else {
      sanitized[key] = query[key];
    }
  }
  
  return sanitized;
};