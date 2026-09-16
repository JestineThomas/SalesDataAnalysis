const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/revenue-trend', reportController.getRevenueTrend);
router.get('/best-sellers', reportController.getBestSellers);
router.get('/customer-spending', reportController.getCustomerSpending);
router.get('/regional-sales', reportController.getRegionalSales);
router.get('/export-csv', reportController.exportReportCsv);

module.exports = router;
