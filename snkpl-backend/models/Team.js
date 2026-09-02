import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  purse: { type: Number, required: true, default: 90 },
  maxPrice: { type: Number, required: true, default: 90 },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  roomId: { type: String, required: true },
  userId: { type: String, default: null } // Optional: Tie team to a specific user session
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
