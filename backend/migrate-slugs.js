const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const TenantSchema = new mongoose.Schema({
  companyName: String,
  slug: { type: String, unique: true, sparse: true }
});

const Tenant = mongoose.model('Tenant', TenantSchema);

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    const tenants = await Tenant.find({ slug: { $exists: false } });
    console.log(`Found ${tenants.length} tenants without slug.`);

    for (const tenant of tenants) {
      let baseSlug = slugify(tenant.companyName || 'shop');
      let slug = baseSlug;
      let counter = 1;

      // Ensure uniqueness
      while (await Tenant.findOne({ slug, _id: { $ne: tenant._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      tenant.slug = slug;
      await tenant.save();
      console.log(`Updated tenant ${tenant.companyName} with slug: ${slug}`);
    }

    console.log('Migration completed!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
