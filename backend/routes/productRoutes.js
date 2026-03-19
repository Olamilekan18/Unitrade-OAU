const express = require('express');
const ProductController = require('../controllers/productController');
const { verifyJwt } = require('../middlewares/authMiddleware');
const { productValidation, productUpdateValidation } = require('../middlewares/validateMiddleware');

const router = express.Router();

router.get('/', ProductController.getProducts);
router.get('/seller/:id', ProductController.getProductsBySeller);
router.get('/mine', verifyJwt, ProductController.getMyProducts);
router.get('/:id', ProductController.getProductById);
router.post('/', verifyJwt, productValidation, ProductController.createProduct);
router.put('/:id', verifyJwt, productUpdateValidation, ProductController.updateProduct);

module.exports = router;
