const express = require('express');
const AdminController = require('../controllers/adminController');
const { verifyJwt, requireAdmin, requireSuperAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/summary', verifyJwt, requireAdmin, AdminController.getSummary);
router.get('/users', verifyJwt, requireAdmin, AdminController.listUsers);
router.get('/access-requests', verifyJwt, requireAdmin, AdminController.listAccessRequests);
router.get('/verification-requests', verifyJwt, requireAdmin, AdminController.listVerificationRequests);
router.get('/products', verifyJwt, requireAdmin, AdminController.listProducts);
router.get('/orders', verifyJwt, requireAdmin, AdminController.listOrders);
router.get('/audit-logs', verifyJwt, requireAdmin, AdminController.listAuditLogs);
router.get('/messages', verifyJwt, requireAdmin, AdminController.listMessages);
router.get('/conversations', verifyJwt, requireAdmin, AdminController.listConversations);
router.get('/conversations/:id/messages', verifyJwt, requireAdmin, AdminController.listConversationMessages);
router.get('/message-reports', verifyJwt, requireAdmin, AdminController.listMessageReports);
router.get('/conversation-reports', verifyJwt, requireAdmin, AdminController.listConversationReports);
router.get('/account-reports', verifyJwt, requireAdmin, AdminController.listAccountReports);
router.post('/promotions', verifyJwt, requireAdmin, AdminController.sendPromotion);

router.put('/users/:id/block', verifyJwt, requireAdmin, AdminController.blockUser);
router.put('/users/:id/suspend', verifyJwt, requireAdmin, AdminController.suspendUser);
router.put('/users/:id/role', verifyJwt, requireSuperAdmin, AdminController.setRole);
router.put('/products/:id/status', verifyJwt, requireAdmin, AdminController.updateProductStatus);
router.delete('/products/:id', verifyJwt, requireAdmin, AdminController.deleteProduct);

module.exports = router;
