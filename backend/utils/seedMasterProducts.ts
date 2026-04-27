import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MasterProduct from '../models/MasterProduct';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const products = [
    // 1. Edible Oils (Tel)
    { name: 'Fortune Soyabean Oil (1L Pouch)', category: 'Oil & Ghee', unit: 'piece', mrp: 160, pricePerUnit: 145, purchasePrice: 135 },
    { name: 'Fortune Soyabean Oil (5L Jar)', category: 'Oil & Ghee', unit: 'piece', mrp: 780, pricePerUnit: 740, purchasePrice: 700 },
    { name: 'Dhara Mustard Oil (1L Pouch)', category: 'Oil & Ghee', unit: 'piece', mrp: 185, pricePerUnit: 170, purchasePrice: 160 },
    { name: 'Engine Mustard Oil (1L Bottle)', category: 'Oil & Ghee', unit: 'piece', mrp: 210, pricePerUnit: 195, purchasePrice: 180 },
    { name: 'Saffola Gold Oil (1L Pouch)', category: 'Oil & Ghee', unit: 'piece', mrp: 220, pricePerUnit: 205, purchasePrice: 190 },
    { name: 'Saffola Gold Oil (5L Jar)', category: 'Oil & Ghee', unit: 'piece', mrp: 1050, pricePerUnit: 980, purchasePrice: 920 },
    { name: 'Fortune Sunflower Oil (1L Pouch)', category: 'Oil & Ghee', unit: 'piece', mrp: 170, pricePerUnit: 155, purchasePrice: 145 },
    { name: 'Dalda Vanaspati (1kg Pouch)', category: 'Oil & Ghee', unit: 'piece', mrp: 140, pricePerUnit: 130, purchasePrice: 120 },
    { name: 'Amul Ghee (500ml Pouch)', category: 'Oil & Ghee', unit: 'piece', mrp: 310, pricePerUnit: 295, purchasePrice: 275 },
    { name: 'Amul Ghee (1L Tin)', category: 'Oil & Ghee', unit: 'piece', mrp: 650, pricePerUnit: 620, purchasePrice: 580 },
    { name: 'Patanjali Cow Ghee (500ml)', category: 'Oil & Ghee', unit: 'piece', mrp: 300, pricePerUnit: 285, purchasePrice: 265 },

    // 2. Spices (Masala) - MDH, Everest, Catch
    { name: 'MDH Deggi Mirch (100g)', category: 'Spices', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'MDH Haldi Powder (100g)', category: 'Spices', unit: 'piece', mrp: 35, pricePerUnit: 32, purchasePrice: 28 },
    { name: 'MDH Dhania Powder (100g)', category: 'Spices', unit: 'piece', mrp: 40, pricePerUnit: 37, purchasePrice: 32 },
    { name: 'MDH Kitchen King (100g)', category: 'Spices', unit: 'piece', mrp: 85, pricePerUnit: 78, purchasePrice: 70 },
    { name: 'MDH Garam Masala (100g)', category: 'Spices', unit: 'piece', mrp: 90, pricePerUnit: 82, purchasePrice: 75 },
    { name: 'MDH Sabzi Masala (100g)', category: 'Spices', unit: 'piece', mrp: 75, pricePerUnit: 70, purchasePrice: 62 },
    { name: 'MDH Meat Masala (100g)', category: 'Spices', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'Everest Turmeric Powder (100g)', category: 'Spices', unit: 'piece', mrp: 38, pricePerUnit: 34, purchasePrice: 30 },
    { name: 'Everest Kutilal Mirch (100g)', category: 'Spices', unit: 'piece', mrp: 110, pricePerUnit: 100, purchasePrice: 90 },
    { name: 'Everest Chhole Masala (100g)', category: 'Spices', unit: 'piece', mrp: 80, pricePerUnit: 75, purchasePrice: 68 },
    { name: 'Everest Pav Bhaji Masala (100g)', category: 'Spices', unit: 'piece', mrp: 85, pricePerUnit: 78, purchasePrice: 70 },
    { name: 'Catch Black Pepper Powder (50g)', category: 'Spices', unit: 'piece', mrp: 115, pricePerUnit: 105, purchasePrice: 95 },
    { name: 'Catch Amchur Powder (100g)', category: 'Spices', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'Tata Sampann Besan (500g)', category: 'Staples', unit: 'piece', mrp: 65, pricePerUnit: 60, purchasePrice: 52 },

    // 3. Bathing Soaps (Sabun)
    { name: 'Dettol Soap Original (75g)', category: 'Personal Care', unit: 'piece', mrp: 40, pricePerUnit: 38, purchasePrice: 34 },
    { name: 'Dettol Soap Original (125g)', category: 'Personal Care', unit: 'piece', mrp: 65, pricePerUnit: 62, purchasePrice: 56 },
    { name: 'Lifebuoy Total (125g)', category: 'Personal Care', unit: 'piece', mrp: 38, pricePerUnit: 35, purchasePrice: 31 },
    { name: 'Lifebuoy Lemon Fresh (125g)', category: 'Personal Care', unit: 'piece', mrp: 38, pricePerUnit: 35, purchasePrice: 31 },
    { name: 'Lux Soft Touch (100g)', category: 'Personal Care', unit: 'piece', mrp: 45, pricePerUnit: 42, purchasePrice: 38 },
    { name: 'Lux International (125g)', category: 'Personal Care', unit: 'piece', mrp: 75, pricePerUnit: 70, purchasePrice: 62 },
    { name: 'Santoor Sandal & Turmeric (125g)', category: 'Personal Care', unit: 'piece', mrp: 55, pricePerUnit: 52, purchasePrice: 46 },
    { name: 'Cinthol Original (100g)', category: 'Personal Care', unit: 'piece', mrp: 48, pricePerUnit: 45, purchasePrice: 40 },
    { name: 'Hamam Soap (100g)', category: 'Personal Care', unit: 'piece', mrp: 42, pricePerUnit: 40, purchasePrice: 36 },
    { name: 'Medimix Ayurvedic (125g)', category: 'Personal Care', unit: 'piece', mrp: 60, pricePerUnit: 56, purchasePrice: 50 },
    { name: 'Pears Pure & Gentle (125g)', category: 'Personal Care', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'Rexona Soap (100g)', category: 'Personal Care', unit: 'piece', mrp: 40, pricePerUnit: 38, purchasePrice: 34 },

    // 4. Shampoos (Sempu)
    { name: 'Clinic Plus Strong & Long (175ml)', category: 'Personal Care', unit: 'piece', mrp: 90, pricePerUnit: 85, purchasePrice: 75 },
    { name: 'Clinic Plus Sachet (Bundle 100s)', category: 'Personal Care', unit: 'piece', mrp: 100, pricePerUnit: 95, purchasePrice: 82 },
    { name: 'Sunsilk Black Shine (180ml)', category: 'Personal Care', unit: 'piece', mrp: 115, pricePerUnit: 105, purchasePrice: 95 },
    { name: 'Sunsilk Gold (180ml)', category: 'Personal Care', unit: 'piece', mrp: 115, pricePerUnit: 105, purchasePrice: 95 },
    { name: 'Dove Hair Fall Rescue (180ml)', category: 'Personal Care', unit: 'piece', mrp: 185, pricePerUnit: 170, purchasePrice: 155 },
    { name: 'Head & Shoulders Smooth & Silky (180ml)', category: 'Personal Care', unit: 'piece', mrp: 195, pricePerUnit: 180, purchasePrice: 165 },
    { name: 'Pantene Pro-V (180ml)', category: 'Personal Care', unit: 'piece', mrp: 165, pricePerUnit: 155, purchasePrice: 140 },
    { name: 'Indulekha Bringha Shampoo (200ml)', category: 'Personal Care', unit: 'piece', mrp: 432, pricePerUnit: 410, purchasePrice: 375 },
    { name: 'Tresemme Keratin Smooth (185ml)', category: 'Personal Care', unit: 'piece', mrp: 210, pricePerUnit: 195, purchasePrice: 180 },
    { name: 'Meera Herbal Hair Wash (80g)', category: 'Personal Care', unit: 'piece', mrp: 65, pricePerUnit: 60, purchasePrice: 54 },

    // 5. Laundry & Dishwash (Sabun & Powder)
    { name: 'Surf Excel Quick Wash (500g)', category: 'Home Care', unit: 'piece', mrp: 115, pricePerUnit: 108, purchasePrice: 98 },
    { name: 'Surf Excel Easy Wash (1kg)', category: 'Home Care', unit: 'piece', mrp: 155, pricePerUnit: 145, purchasePrice: 132 },
    { name: 'Tide Plus Extra Power (1kg)', category: 'Home Care', unit: 'piece', mrp: 135, pricePerUnit: 125, purchasePrice: 115 },
    { name: 'Ariel Matic Top Load (1kg)', category: 'Home Care', unit: 'piece', mrp: 260, pricePerUnit: 245, purchasePrice: 225 },
    { name: 'Ghadi Detergent Powder (1kg)', category: 'Home Care', unit: 'piece', mrp: 70, pricePerUnit: 68, purchasePrice: 60 },
    { name: 'Rin Advanced Powder (1kg)', category: 'Home Care', unit: 'piece', mrp: 105, pricePerUnit: 98, purchasePrice: 88 },
    { name: 'Wheel Active Blue (1kg)', category: 'Home Care', unit: 'piece', mrp: 75, pricePerUnit: 72, purchasePrice: 65 },
    { name: 'Rin Bar (250g Pack of 4)', category: 'Home Care', unit: 'piece', mrp: 110, pricePerUnit: 105, purchasePrice: 95 },
    { name: 'Surf Excel Bar (250g)', category: 'Home Care', unit: 'piece', mrp: 35, pricePerUnit: 33, purchasePrice: 30 },
    { name: 'Vim Bar (300g)', category: 'Home Care', unit: 'piece', mrp: 20, pricePerUnit: 20, purchasePrice: 17.5 },
    { name: 'Vim Liquid Sachet (Bundle)', category: 'Home Care', unit: 'piece', mrp: 50, pricePerUnit: 48, purchasePrice: 42 },
    { name: 'Exo Dishwash Round (500g)', category: 'Home Care', unit: 'piece', mrp: 65, pricePerUnit: 60, purchasePrice: 54 },

    // 6. Food & Staples - Rice, Pulses, Flour
    { name: 'Aashirvaad Select Atta (5kg)', category: 'Staples', unit: 'piece', mrp: 310, pricePerUnit: 295, purchasePrice: 275 },
    { name: 'Fortune Chakki Fresh Atta (10kg)', category: 'Staples', unit: 'piece', mrp: 460, pricePerUnit: 440, purchasePrice: 410 },
    { name: 'Tata Sampann Toor Dal (1kg)', category: 'Staples', unit: 'kg', mrp: 185, pricePerUnit: 175, purchasePrice: 160 },
    { name: 'Tata Sampann Moong Dal (1kg)', category: 'Staples', unit: 'kg', mrp: 165, pricePerUnit: 155, purchasePrice: 142 },
    { name: 'Tata Sampann Chana Dal (1kg)', category: 'Staples', unit: 'kg', mrp: 125, pricePerUnit: 115, purchasePrice: 105 },
    { name: 'Daawat Rozana Basmati Rice (5kg)', category: 'Staples', unit: 'piece', mrp: 450, pricePerUnit: 420, purchasePrice: 390 },
    { name: 'India Gate Unity Rice (5kg)', category: 'Staples', unit: 'piece', mrp: 550, pricePerUnit: 520, purchasePrice: 480 },
    { name: 'Poha (Medium 500g)', category: 'Staples', unit: 'piece', mrp: 55, pricePerUnit: 50, purchasePrice: 42 },
    { name: 'Sabudana (Premium 500g)', category: 'Staples', unit: 'piece', mrp: 75, pricePerUnit: 68, purchasePrice: 60 },
    { name: 'Sugar (Sulfur Free 1kg)', category: 'Staples', unit: 'kg', mrp: 55, pricePerUnit: 52, purchasePrice: 48 },

    // 7. Snacks & Beverages
    { name: 'Maggi Family Pack (12 units)', category: 'Snacks', unit: 'piece', mrp: 168, pricePerUnit: 160, purchasePrice: 145 },
    { name: 'Yippee Noodles (Single)', category: 'Snacks', unit: 'piece', mrp: 12, pricePerUnit: 12, purchasePrice: 10.5 },
    { name: 'Haldiram Bhujia Sev (350g)', category: 'Snacks', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'Haldiram Navratna Mix (350g)', category: 'Snacks', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'Balaji Wafers (Masala Masti)', category: 'Snacks', unit: 'piece', mrp: 10, pricePerUnit: 10, purchasePrice: 8.5 },
    { name: 'Bournvita Health Drink (1kg Refill)', category: 'Beverages', unit: 'piece', mrp: 420, pricePerUnit: 400, purchasePrice: 375 },
    { name: 'Horlicks Classic Malt (1kg Refill)', category: 'Beverages', unit: 'piece', mrp: 450, pricePerUnit: 430, purchasePrice: 405 },
    { name: 'Complan Chocolate (500g Jar)', category: 'Beverages', unit: 'piece', mrp: 280, pricePerUnit: 265, purchasePrice: 245 },
    { name: 'Tata Tea Premium (500g)', category: 'Beverages', unit: 'piece', mrp: 245, pricePerUnit: 230, purchasePrice: 215 },
    { name: 'Red Label Tea (500g Jar)', category: 'Beverages', unit: 'piece', mrp: 295, pricePerUnit: 280, purchasePrice: 260 },
    { name: 'Nescafe Sunrise (100g Jar)', category: 'Beverages', unit: 'piece', mrp: 285, pricePerUnit: 270, purchasePrice: 250 },
    { name: 'Real Fruit Power Mixed (1L)', category: 'Beverages', unit: 'piece', mrp: 110, pricePerUnit: 100, purchasePrice: 92 },
    { name: 'Tang Orange Flavor (500g)', category: 'Beverages', unit: 'piece', mrp: 185, pricePerUnit: 175, purchasePrice: 160 },

    // 8. Personal Care - Skin & Grooming
    { name: 'Fair & Lovely Glow & Lovely (80g)', category: 'Personal Care', unit: 'piece', mrp: 185, pricePerUnit: 175, purchasePrice: 160 },
    { name: 'Ponds White Beauty (50g)', category: 'Personal Care', unit: 'piece', mrp: 165, pricePerUnit: 155, purchasePrice: 142 },
    { name: 'Nivea Men Face Wash (100ml)', category: 'Personal Care', unit: 'piece', mrp: 195, pricePerUnit: 180, purchasePrice: 165 },
    { name: 'Garnier Men Face Wash (100ml)', category: 'Personal Care', unit: 'piece', mrp: 180, pricePerUnit: 170, purchasePrice: 155 },
    { name: 'Colgate MaxFresh (150g)', category: 'Personal Care', unit: 'piece', mrp: 105, pricePerUnit: 98, purchasePrice: 88 },
    { name: 'Sensodyne Fresh Gel (75g)', category: 'Personal Care', unit: 'piece', mrp: 145, pricePerUnit: 135, purchasePrice: 125 },
    { name: 'Oral-B Toothbrush (Soft)', category: 'Personal Care', unit: 'piece', mrp: 45, pricePerUnit: 42, purchasePrice: 35 },
    { name: 'Parachute Coconut Oil (500ml Bottle)', category: 'Personal Care', unit: 'piece', mrp: 210, pricePerUnit: 195, purchasePrice: 180 },
    { name: 'Dabur Amla Hair Oil (200ml)', category: 'Personal Care', unit: 'piece', mrp: 105, pricePerUnit: 98, purchasePrice: 88 },
    { name: 'Keo Karpin Hair Oil (200ml)', category: 'Personal Care', unit: 'piece', mrp: 115, pricePerUnit: 105, purchasePrice: 95 },

    // 9. Health & Hygiene
    { name: 'Dettol Antiseptic Liquid (250ml)', category: 'Health', unit: 'piece', mrp: 125, pricePerUnit: 118, purchasePrice: 108 },
    { name: 'Savlon Antiseptic (200ml)', category: 'Health', unit: 'piece', mrp: 95, pricePerUnit: 88, purchasePrice: 80 },
    { name: 'Harpic Blue (1L)', category: 'Home Care', unit: 'piece', mrp: 195, pricePerUnit: 180, purchasePrice: 165 },
    { name: 'Lizol Floral (1L)', category: 'Home Care', unit: 'piece', mrp: 215, pricePerUnit: 200, purchasePrice: 185 },
    { name: 'Colin Glass Cleaner (250ml)', category: 'Home Care', unit: 'piece', mrp: 65, pricePerUnit: 60, purchasePrice: 54 },
    { name: 'Good Knight Gold Flash Machine', category: 'Home Care', unit: 'piece', mrp: 105, pricePerUnit: 98, purchasePrice: 85 },
    { name: 'Good Knight Gold Flash Refill', category: 'Home Care', unit: 'piece', mrp: 85, pricePerUnit: 80, purchasePrice: 70 },
    { name: 'Comfort Fabric Conditioner (200ml)', category: 'Home Care', unit: 'piece', mrp: 55, pricePerUnit: 52, purchasePrice: 46 },

    // 10. Baby Care
    { name: 'Himalaya Baby Soap (125g)', category: 'Baby Care', unit: 'piece', mrp: 65, pricePerUnit: 62, purchasePrice: 55 },
    { name: 'Himalaya Baby Shampoo (200ml)', category: 'Baby Care', unit: 'piece', mrp: 175, pricePerUnit: 165, purchasePrice: 150 },
    { name: 'Johnson Baby Powder (500g)', category: 'Baby Care', unit: 'piece', mrp: 350, pricePerUnit: 330, purchasePrice: 300 },
    { name: 'Pampers Baby Wipes (80s)', category: 'Baby Care', unit: 'piece', mrp: 195, pricePerUnit: 180, purchasePrice: 160 },
    { name: 'Mamy Poko Pants (M - 10s)', category: 'Baby Care', unit: 'piece', mrp: 145, pricePerUnit: 140, purchasePrice: 125 },

    // 11. More Grocery Variety
    { name: 'Saffola Oats (1kg Jar)', category: 'Breakfast', unit: 'piece', mrp: 210, pricePerUnit: 195, purchasePrice: 180 },
    { name: 'Kelloggs Corn Flakes (500g)', category: 'Breakfast', unit: 'piece', mrp: 195, pricePerUnit: 180, purchasePrice: 165 },
    { name: 'Kissan Mix Fruit Jam (500g)', category: 'Condiments', unit: 'piece', mrp: 165, pricePerUnit: 155, purchasePrice: 140 },
    { name: 'Honey (Dabur 500g Jar)', category: 'Health', unit: 'piece', mrp: 220, pricePerUnit: 205, purchasePrice: 190 },
    { name: 'Peanut Butter (Dr. Oetker 340g)', category: 'Snacks', unit: 'piece', mrp: 185, pricePerUnit: 170, purchasePrice: 155 },
    { name: 'Pasta (Bambino 500g)', category: 'Snacks', unit: 'piece', mrp: 55, pricePerUnit: 50, purchasePrice: 42 },
    { name: 'Vermicelli (Bambino 500g)', category: 'Snacks', unit: 'piece', mrp: 65, pricePerUnit: 60, purchasePrice: 52 },
    { name: 'Chyawanprash (Dabur 1kg)', category: 'Health', unit: 'piece', mrp: 410, pricePerUnit: 390, purchasePrice: 360 }
];

const seedDB = async () => {
    const MONGO_URI = process.env.MONGO_URI;
    
    if (!MONGO_URI) {
        console.error('MONGO_URI not found in .env file');
        process.exit(1);
    }
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');
        
        await MasterProduct.deleteMany({});
        await MasterProduct.insertMany(products);
        console.log(`Successfully seeded ${products.length} Master Products!`);
        
        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedDB();
