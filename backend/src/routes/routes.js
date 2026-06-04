const router = require('express').Router();
const c = require('../controllers/routeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getAllRoutes);
router.get('/:id', c.getRoute);
router.post('/', authorize('ADMIN'), c.createRoute);
router.put('/:id', authorize('ADMIN'), c.updateRoute);
router.delete('/:id', authorize('ADMIN'), c.deleteRoute);

module.exports = router;
