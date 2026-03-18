const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name is too long'),
  body('oau_email').trim().notEmpty().withMessage('OAU Email is required').isEmail().withMessage('Must be a valid email').matches(/@.*oauife\.edu\.ng$/i).withMessage('Must be a valid OAU student email address'),
  body('department').trim().notEmpty().withMessage('Department is required').isLength({ max: 150 }).withMessage('Department name is too long'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validateRequest
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

const productValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title is too long'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage('Description is too long'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category is required'),
  body('image_url').trim().notEmpty().withMessage('Image URL is required').isURL().withMessage('Must be a valid URL'),
  body('quantity').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validateRequest
];

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Comment is too long'),
  validateRequest
];

module.exports = {
  registerValidation,
  loginValidation,
  productValidation,
  reviewValidation
};
