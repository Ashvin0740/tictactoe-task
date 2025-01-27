const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const GameRoom = require('./models/gameRoom');
const User = require('./models/user');

const SECRET_KEY = process.env.JWT_SECRET;

module.exports = (server) => {
  const io = socketIo(server);

  io.use((socket, next) => {
    const token = socket.handshake.headers.authorization;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Handle player joining a game room
    socket.on('joinRoom', async (roomId) => {
      socket.join(roomId);
      console.log(`Player ${socket.user.username} joined room ${roomId.data}`);

      io.to(roomId).emit(
        'message',
        `Player ${socket.user.username} has joined the room.`
      );

      // Optionally, send the current game state to the new player
      const room = await GameRoom.findOne({ roomId: roomId.data });
      if (room) {
        socket.emit('gameState', room.boardState);
      }
    });

    // Handle player moves or actions
    socket.on('playerMove', async (data) => {
      const { roomId, x, y } = data;
      const userId = socket.user.userId;
      const room = await GameRoom.findOne({ roomId });

      if (!room) {
        socket.emit('error', 'Room not found');
        console.log('Room not found');
        return;
      }

      if (room.players.length < 2) {
        socket.emit('error', 'Not enough players');
        console.log('Not enough players');
        return;
      }

      if (room.currentPlayer.toString() !== userId.toString()) {
        socket.emit('error', 'Not your turn');
        console.log('Not your turn', userId);
        return;
      }

      if (room?.boardState[x][y] !== '') {
        socket.emit('error', 'Invalid move');
        console.log('Invalid move');
        return;
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

      io.to(roomId).emit('gameState', room.boardState);

      if (winner) {
        io.to(roomId).emit('gameOver', { winner });
        const winningUser = await User.findById(winner);
        const losingUser = await User.findById(
          room.players.find((p) => p.toString() !== winner.toString())
        );

        winningUser.wins += 1;
        losingUser.losses += 1;

        await winningUser.save();
        await losingUser.save();
      } else if (!room.boardState.flat().includes('')) {
        io.to(roomId).emit('gameOver', { winner: null });
        const [player1, player2] = await Promise.all([
          User.findById(room.players[0]),
          User.findById(room.players[1]),
        ]);

        player1.draws += 1;
        player2.draws += 1;

        await player1.save();
        await player2.save();
      }

      //   setTimeout(async () => {
      //     if (room.players.length < 2) {
      //       await GameRoom.deleteOne({ roomId });
      //       return io.to(roomId).emit('gameOver', {
      //         message: 'Not enough players to restart the game',
      //       });
      //     }

      //     room.boardState = [
      //       ['', '', ''],
      //       ['', '', ''],
      //       ['', '', ''],
      //     ];
      //     room.currentPlayer = room.players[0];
      //     room.gameStatus = 'playing';
      //     room.winner = null;

      //     await room.save();
      //     io.to(roomId).emit('gameRestarted', room.boardState);
      //   }, 3000);
    });

    socket.on('disconnect', () => {
      console.log('A player disconnected:', socket.id);
    });
  });
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
