import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  basePrice: { type: Number, required: true, default: 0 },
  currentPrice: { type: Number, required: true, default: 0 },
  type: { type: String, required: true }, // indian, foreign, associate
  assignedType: { type: String, default: null },
  role: { type: String },
  country: { type: String },
  sold: { type: Boolean, default: false },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  soldPrice: { type: Number, default: null },
  roomId: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Player', playerSchema);
