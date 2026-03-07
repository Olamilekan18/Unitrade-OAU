const supabase = require('../config/supabaseClient');
const ProductService = require('../services/ProductService');

const productService = new ProductService(supabase);

class ProductController {
  static async createProduct(req, res, next) {
    try {
      const { title, price, description, category_id, image_url, quantity } = req.body;

      const product = await productService.createProduct({
        title,
        price,
        description,
        category_id,
        image_url,
        quantity: quantity || 1,
        seller_id: req.user.id,
        status: 'available'
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const products = await productService.getAvailableProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getProductsBySeller(req, res, next) {
    try {
      const products = await productService.getProductsBySeller(req.params.id);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
