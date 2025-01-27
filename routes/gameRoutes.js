const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/rooms', gameController.createRoom);
router.get('/rooms', gameController.getRooms);
router.post('/rooms/join', gameController.joinRoom);
router.post('/rooms/move', gameController.makeMove);
router.post('/rooms/restart', gameController.restartGame);

module.exports = router;
