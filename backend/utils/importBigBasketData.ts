import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import MasterProduct from '../models/MasterProduct';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DATASET_URL = 'https://raw.githubusercontent.com/riyasaini3001/BigBasket-Analysis/main/BigBasket.csv';

const parseCSVLine = (line: string) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
};

const extractUnit = (name: string) => {
    const unitRegex = /(\d+(\.\d+)?\s*(kg|g|ml|l|piece|unit|pack|pc|gm))/i;
    const match = name.match(unitRegex);
    return match ? match[1].toLowerCase() : 'piece';
};

const importData = async () => {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI not found');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB...');

        console.log('Fetching dataset from GitHub (28k+ items)...');
        const response = await axios.get(DATASET_URL);
        const lines = response.data.split('\n');
        
        // Header: index,product,category,sub_category,brand,sale_price,market_price,type,rating,description
        const headers = parseCSVLine(lines[0]);
        console.log('Headers:', headers);

        const productsToInsert = [];
        const seenNames = new Set();

        // Skip header, process up to 6000 lines to get at least 5000 valid ones
        for (let i = 1; i < lines.length && productsToInsert.length < 6000; i++) {
            const row = parseCSVLine(lines[i]);
            if (row.length < 7) continue;

            const name = row[1];
            const category = row[2];
            const brand = row[4];
            const salePrice = parseFloat(row[5]);
            const marketPrice = parseFloat(row[6]);

            if (!name || isNaN(salePrice) || isNaN(marketPrice)) continue;

            const fullName = brand ? `${brand} ${name}` : name;
            
            // Avoid exact duplicates in name
            if (seenNames.has(fullName)) continue;
            seenNames.add(fullName);

            productsToInsert.push({
                name: fullName,
                category: category || 'General',
                unit: extractUnit(name),
                mrp: marketPrice,
                pricePerUnit: salePrice,
                purchasePrice: Math.round(salePrice * 0.85 * 100) / 100, // 15% margin placeholder
            });

            if (productsToInsert.length % 1000 === 0) {
                console.log(`Processed ${productsToInsert.length} items...`);
            }
        }

        console.log(`Inserting ${productsToInsert.length} products into MasterProduct collection...`);
        
        // Clear existing and insert new
        await MasterProduct.deleteMany({});
        
        // Insert in batches of 1000 to avoid memory issues
        for (let i = 0; i < productsToInsert.length; i += 1000) {
            const batch = productsToInsert.slice(i, i + 1000);
            await MasterProduct.insertMany(batch);
            console.log(`Inserted batch ${i / 1000 + 1}...`);
        }

        console.log('Successfully imported large dataset!');
        mongoose.connection.close();
    } catch (err) {
        console.error('Error during import:', err);
        process.exit(1);
    }
};

importData();
