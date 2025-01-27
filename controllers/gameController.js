const GameRoom = require('../models/gameRoom');

const gameController = {
  // Create new game room
  createRoom: async (req, res) => {
    try {
      const { roomId, isPrivate } = req.body;
      const room = await GameRoom.create({
        roomId,
        isPrivate,
        createdBy: req.user._id,
      });
      return res.status(201).json(room);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  // Get list of rooms
  getRooms: async (req, res) => {
    try {
      const rooms = await GameRoom.find({
        gameStatus: 'waiting',
        isPrivate: req?.query?.isPrivate === 'true',
      });
      if (!rooms) return res.status(404).json({ error: 'No rooms found' });
      return res.status(200).json({ message: 'Rooms found', rooms });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Join room
  joinRoom: async (req, res) => {
    try {
      const { roomId } = req.body;
      const room = await GameRoom.findOne({ roomId });
      if (!room) return res.status(404).json({ error: 'Room not found' });

      if (room.players.includes(req.user._id)) {
        return res.status(400).json({ error: 'You are already in this room' });
      }

      if (room.players.length >= 2) {
        room.spectators.push(req.user._id);
      } else {
        room.players.push(req.user._id);
      }
      if (room.players.length === 2) {
        room.currentPlayer = room.players[0];
        room.gameStatus = 'playing';
      }
      await room.save();

      return res.status(200).json({ message: 'Room joined', room });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  makeMove: async (req, res) => {
    try {
      const { roomId, x, y } = req.body;
      const userId = req.user._id;

      const room = await GameRoom.findOne({ roomId });
      if (!room) return res.status(404).json({ error: 'Room not found' });
      if (room.players.length < 2)
        return res.status(400).json({ error: 'Not enough players' });

      if (room.currentPlayer.toString() !== userId.toString()) {
        return res.status(400).json({ error: 'Not your turn' });
      }

      if (room.boardState[x][y] !== '') {
        return res.status(400).json({ error: 'Invalid move' });
      }

      room.boardState[x][y] = userId.toString();
      room.currentPlayer = room.players.find(
        (p) => p.toString() !== userId.toString()
      );

      const winner = checkWinner(room.boardState);
      if (winner) {
        room.gameStatus = 'finished';
        room.winner = winner;
      }

      await room.save();

      if (winner) {
        const winningUser = await User.findById(winner);
        const losingUser = await User.findById(
          room.players.find((p) => p.toString() !== winner.toString())
        );

        winningUser.wins += 1;
        losingUser.losses += 1;

        await winningUser.save();
        await losingUser.save();
      } else if (!room.boardState.flat().includes('')) {
        const [player1, player2] = await Promise.all([
          User.findById(room.players[0]),
          User.findById(room.players[1]),
        ]);

        player1.draws += 1;
        player2.draws += 1;

        await player1.save();
        await player2.save();
      }

      return res.status(200).json({ boardState: room.boardState });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: error.message });
    }
  },

  restartGame: async (req, res) => {
    try {
      const { roomId } = req.body;
      const room = await GameRoom.findOne({ roomId });
      if (!room) return res.status(404).json({ error: 'Room not found' });

      if (room.players.length < 2) {
        return res
          .status(400)
          .json({ error: 'Not enough players to restart the game' });
      }

      room.boardState = [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ];
      room.currentPlayer = room.players[0];
      room.gameStatus = 'playing';
      room.winner = null;

      await room.save();

      return res.status(200).json({
        message: 'Game restarted successfully',
        boardState: room.boardState,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
};

function checkWinner(board) {
  for (let i = 0; i < 3; i++) {
    if (
      board[i][0] &&
      board[i][0] === board[i][1] &&
      board[i][1] === board[i][2]
    ) {
      return board[i][0];
    }
  }
  for (let j = 0; j < 3; j++) {
    if (
      board[0][j] &&
      board[0][j] === board[1][j] &&
      board[1][j] === board[2][j]
    ) {
      return board[0][j];
    }
  }
  if (
    board[0][0] &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return board[0][0];
  }
  if (
    board[0][2] &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return board[0][2];
  }
  return null;
}

module.exports = gameController;
