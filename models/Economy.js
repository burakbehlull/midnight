import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  money: { type: Number, default: 0 },
  cookies: { type: Number, default: 0 },
  hearts: { type: Number, default: 0 },
  subtitle: { type: String, default: null },
  about: { type: String, default: null },
  rank: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  marriedTo: { type: String, default: null },
  marriageSince: { type: Date, default: null },
  marriageRing: { type: String, default: null },
  background: { type: String, default: null },
  fosterlings: { type: [String], default: [] },
  inventory: {
    type: Map,
    of: Number,
    default: {}
  },
  activeCosmetics: {
    type: Map,
    of: String,
    default: () => new Map()
  },
  pet: {
    type: {
      type: String,
      enum: ['dog', 'cat', 'rabbit', 'hamster', 'lion'],
      default: null
    },
    breed: {
      type: String,
      default: null
    },
    slug: {
      type: String,
      default: null
    },
    name: {
      type: String,
      default: null
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 100
    },
    xp: {
      type: Number,
      default: 0
    },
    love: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    hunger: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    happiness: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    energy: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    adoptedAt: {
      type: Date,
      default: null
    },
    lastFed: {
      type: Date,
      default: new Date(0)
    },
    lastPlayed: {
      type: Date,
      default: new Date(0)
    },
    lastLoved: {
      type: Date,
      default: new Date(0)
    },
    accessories: [{
      type: String
    }]
  },
  cooldowns: {
    daily: { type: Date, default: new Date(0) },
    heart: { type: Date, default: new Date(0) },
    cookie: { type: Date, default: new Date(0) }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

economySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Economy', economySchema);
