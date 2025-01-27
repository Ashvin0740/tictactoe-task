const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPrivate: { type: Boolean, default: false },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  spectators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  boardState: {
    type: [[String]],
    default: [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
  },
  currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('GameRoom', gameRoomSchema);
