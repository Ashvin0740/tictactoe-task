const express = require('express');
const leaderBoardController = require('../controllers/leaderBoardController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', leaderBoardController.getLeaderboard);

module.exports = router;
