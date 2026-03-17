const express = require('express');
const BidController = require('../controllers/bidController');
const { verifyJwt } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/product/:productId/count', BidController.getBidCount);
router.get('/product/:productId/mine', verifyJwt, BidController.getMyBid);
router.post('/', verifyJwt, BidController.createBid);
router.get('/seller', verifyJwt, BidController.getSellerBids);
router.put('/:id/accept', verifyJwt, BidController.acceptBid);
router.put('/:id', verifyJwt, BidController.updateBid);

module.exports = router;
