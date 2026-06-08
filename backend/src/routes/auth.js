const router = require('express').Router();
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../schemas');

router.post('/register', validate(s.register), register);
router.post('/login', validate(s.login), login);
router.get('/me', authenticate, me);

module.exports = router;
