const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

router.use(authMiddleware);

// Categories
router.get('/categories', lookupController.getAllCategories);
router.post('/categories', requireAdmin, lookupController.createCategory);
router.put('/categories/:id', requireAdmin, lookupController.updateCategory);
router.delete('/categories/:id', requireAdmin, lookupController.deleteCategory);

// Regions
router.get('/regions', lookupController.getAllRegions);
router.post('/regions', requireAdmin, lookupController.createRegion);
router.put('/regions/:id', requireAdmin, lookupController.updateRegion);
router.delete('/regions/:id', requireAdmin, lookupController.deleteRegion);

module.exports = router;
