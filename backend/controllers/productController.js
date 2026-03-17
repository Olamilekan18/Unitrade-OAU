const supabase = require('../config/supabaseClient');
const ProductService = require('../services/ProductService');
const AuditService = require('../services/AuditService');

const productService = new ProductService(supabase);
const auditService = new AuditService(supabase);

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

      await auditService.log({
        actorId: req.user.id,
        action: 'product.created',
        entityType: 'product',
        entityId: product.id
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
