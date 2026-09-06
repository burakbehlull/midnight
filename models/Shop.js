import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  module: {
    type: String,
    default: null,
    index: true
  },
  slug: {
    type: String,
    default: null,
    index: true
  },
  type: {
    type: String,
    default: 'item',
    enum: ['item', 'theme', 'cosmetic']
  }
});

shopSchema.index({ module: 1, slug: 1 }, { unique: true, sparse: true });

export default mongoose.model("Shop", shopSchema);
