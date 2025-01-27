const User = require('../models/user');

const getLeaderboard = async (req, res) => {
  try {
    console.log('getLeaderboard');
    const leaderboard = await User.aggregate([
      {
        $project: {
          username: 1,
          wins: { $size: '$wins' },
          totalGames: { $size: '$games' },
        },
      },
      {
        $sort: { wins: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard',
      error: error.message,
    });
  }
};

module.exports = {
  getLeaderboard,
};
