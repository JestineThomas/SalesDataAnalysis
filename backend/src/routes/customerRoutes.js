const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

// All customer routes require authentication
router.use(authMiddleware);

router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', requireAdmin, customerController.deleteCustomer);

module.exports = router;
