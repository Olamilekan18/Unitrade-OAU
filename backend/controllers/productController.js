const supabase = require('../config/supabaseClient');
const ProductService = require('../services/ProductService');
const AuditService = require('../services/AuditService');

const productService = new ProductService(supabase);
const auditService = new AuditService(supabase);

class ProductController {
  static async createProduct(req, res, next) {
    try {
      const { title, price, description, category_id, image_url, image_urls, quantity } = req.body;

      const images = Array.isArray(image_urls) && image_urls.length
        ? image_urls.filter(Boolean)
        : image_url
          ? [image_url]
          : [];

      if (!images.length) {
        const err = new Error('At least one product image is required.');
        err.status = 400;
        throw err;
      }
      if (images.length > 3) {
        const err = new Error('You can upload up to 3 images.');
        err.status = 400;
        throw err;
      }

      const product = await productService.createProduct({
        title,
        price,
        description,
        category_id,
        image_url: images[0],
        image_urls: images,
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
      const { q, category, sort } = req.query;
      const products = await productService.getAvailableProducts({
        search: q,
        categoryId: category,
        sort: sort
      });
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

  static async getMyProducts(req, res, next) {
    try {
      const products = await productService.getProductsForOwner(req.user.id);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const { title, price, description, category_id, image_url, image_urls, quantity } = req.body;

      let images = null;
      if (Array.isArray(image_urls)) {
        images = image_urls.filter(Boolean);
      } else if (image_url) {
        images = [image_url];
      }

      if (images && images.length > 3) {
        const err = new Error('You can upload up to 3 images.');
        err.status = 400;
        throw err;
      }

      const updates = {};
      if (title !== undefined) updates.title = title;
      if (price !== undefined) updates.price = price;
      if (description !== undefined) updates.description = description;
      if (category_id !== undefined) updates.category_id = category_id;
      if (quantity !== undefined) updates.quantity = quantity;
      if (images) {
        if (!images.length) {
          const err = new Error('At least one product image is required.');
          err.status = 400;
          throw err;
        }
        updates.image_url = images[0];
        updates.image_urls = images;
      }

      const product = await productService.updateProduct(req.params.id, req.user.id, updates);

      await auditService.log({
        actorId: req.user.id,
        action: 'product.updated',
        entityType: 'product',
        entityId: product.id
      });

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;
