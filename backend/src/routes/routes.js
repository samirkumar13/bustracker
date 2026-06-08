const router = require('express').Router();
const c = require('../controllers/routeController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');

router.use(authenticate);
router.get('/', c.getAllRoutes);
router.get('/:id', c.getRoute);
router.post('/', authorize('ADMIN'), validate(s.createRoute), c.createRoute);
router.put('/:id', authorize('ADMIN'), validate(s.updateRoute), c.updateRoute);
router.delete('/:id', authorize('ADMIN'), c.deleteRoute);

module.exports = router;
