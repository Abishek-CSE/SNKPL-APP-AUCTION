import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import Room from './models/Room.js';
import Player from './models/Player.js';
import Team from './models/Team.js';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/snkpl-auction';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Set up file upload middleware
const upload = multer({ storage: multer.memoryStorage() });

// --- REST API ROUTES ---

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { username: identifier }] 
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
    res.json({ success: true, token, user: { username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

import { verifyToken } from './middleware/auth.js';

app.put('/api/auth/update', verifyToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
    res.json({ success: true, message: 'Profile updated successfully', user: { username: updatedUser.username, email: updatedUser.email } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate a random 6-digit room code
function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/room/create', async (req, res) => {
  try {
    const { adminId } = req.body;
    let roomId = generateRoomCode();
    // Ensure uniqueness
    while (await Room.findOne({ roomId })) {
      roomId = generateRoomCode();
    }
    const newRoom = new Room({ roomId, adminId });
    await newRoom.save();
    res.status(201).json({ success: true, room: newRoom });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/room/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/players/upload/:roomId', upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Very basic mapping based on typical columns
    const players = data.map(row => {
      // Find case-insensitive keys
      const getVal = (keys) => {
        const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase()));
        return foundKey ? row[foundKey] : '';
      };

      let basePriceStr = getVal(['price', 'base price', 'baseprice']).toString().replace(/[^0-9.]/g, '');
      const basePrice = parseFloat(basePriceStr) || 0;

      return {
        name: getVal(['name', 'player name', 'player']) || 'Unknown',
        basePrice: basePrice,
        currentPrice: basePrice,
        type: (getVal(['type', 'category']) || 'indian').toLowerCase(),
        role: getVal(['role', 'position']),
        country: getVal(['country']),
        roomId: roomId
      };
    });

    await Player.insertMany(players);
    res.status(201).json({ success: true, message: `${players.length} players uploaded` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', async ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Fetch current state for this room and send to user
    const players = await Player.find({ roomId });
    const teams = await Team.find({ roomId });
    socket.emit('room_state', { players, teams });
  });

  socket.on('admin_start_player', async ({ roomId, playerId }) => {
    // Admin selects a player to put on the block
    io.to(roomId).emit('current_player_updated', { playerId });
  });

  socket.on('place_bid', async ({ roomId, playerId, teamId, amount }) => {
    try {
      const player = await Player.findById(playerId);
      const team = await Team.findById(teamId);

      if (!player || !team) return;
      if (amount <= player.currentPrice) return; // Must be higher
      if (amount > team.purse) return; // Team can't afford it

      player.currentPrice = amount;
      await player.save();

      io.to(roomId).emit('bid_updated', {
        playerId,
        currentPrice: amount,
        highestBidderTeamId: teamId
      });
    } catch (error) {
      console.error('Bid error:', error);
    }
  });

  socket.on('admin_sell_player', async ({ roomId, playerId, teamId, amount }) => {
    try {
      const player = await Player.findById(playerId);
      const team = await Team.findById(teamId);
      
      if (!player || !team) return;

      // Update player
      player.sold = true;
      player.teamId = team._id;
      player.soldPrice = amount;
      await player.save();

      // Update team purse and roster
      team.purse -= amount;
      team.players.push(player._id);
      await team.save();

      // Broadcast sale
      io.to(roomId).emit('player_sold', {
        player,
        team
      });
    } catch (error) {
      console.error('Sell error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Nodemon trigger
