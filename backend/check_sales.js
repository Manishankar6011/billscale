const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Sale = mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));
  const sales = await Sale.find().sort({ _id: -1 }).limit(3).lean();
  sales.forEach(s => {
    console.log(`Sale ID: ${s._id}`);
    console.log(`  Total: ${s.totalAmount}`);
    console.log(`  RoundOff (roundOffAmount): ${s.roundOffAmount}`);
    console.log(`  RoundOff (roundoffAmount): ${s.roundoffAmount}`);
  });
  process.exit(0);
});
