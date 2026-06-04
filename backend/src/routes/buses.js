const router = require('express').Router();
const c = require('../controllers/busController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.getAllBuses);
router.get('/:id', c.getBus);
router.get('/:id/location', c.getBusLocation);
router.post('/', authorize('ADMIN'), c.createBus);
router.put('/:id', authorize('ADMIN'), c.updateBus);
router.delete('/:id', authorize('ADMIN'), c.deleteBus);

module.exports = router;
