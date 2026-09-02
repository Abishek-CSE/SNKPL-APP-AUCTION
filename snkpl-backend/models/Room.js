import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  adminId: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
