const express = require('express');
const ProductController = require('../controllers/productController');
const { verifyJwt } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);
router.get('/seller/:id', ProductController.getProductsBySeller);
router.post('/', verifyJwt, ProductController.createProduct);

module.exports = router;
