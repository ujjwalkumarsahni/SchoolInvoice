// const mongoose = require('mongoose');
// const Book = require('./models/Book');

import mongoose from "mongoose";
import Book from "./OrderManagement/models/Book.js";
const booksData = [
  // ELP - Pre-Nursery Program
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Math O Mania Part-1', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Math O Mania Part-2', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Alpha O Mania Part-1', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Alpha O Mania Part-2', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Pyare Axar Part-1', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Pyare Axar Part-2', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Pyare Axar Part-3', standardPrice: 200 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Rhyme Book', standardPrice: 150 },
  { program: 'ELP', grade: 'Pre-Nursery Program', name: 'Steamheartia', standardPrice: 250 },
  
  // ELP - LKG
  { program: 'ELP', grade: 'LKG', name: 'Axar Masti Part-1', standardPrice: 220 },
  { program: 'ELP', grade: 'LKG', name: 'Axar Masti Part-2', standardPrice: 220 },
  { program: 'ELP', grade: 'LKG', name: 'Letter Land Heroes', standardPrice: 250 },
  { program: 'ELP', grade: 'LKG', name: 'Number Nuts Part-1', standardPrice: 220 },
  { program: 'ELP', grade: 'LKG', name: 'Number Nuts Part-2', standardPrice: 220 },
  { program: 'ELP', grade: 'LKG', name: 'Rhyme Book', standardPrice: 150 },
  { program: 'ELP', grade: 'LKG', name: 'SoundTopia', standardPrice: 250 },
  { program: 'ELP', grade: 'LKG', name: 'Thinky Tots Lab', standardPrice: 280 },
  
  // ELP - UKG
  { program: 'ELP', grade: 'UKG', name: 'Kahani Kadam Part-1', standardPrice: 240 },
  { program: 'ELP', grade: 'UKG', name: 'Kahani Kadam Part-2', standardPrice: 240 },
  { program: 'ELP', grade: 'UKG', name: 'Number Bots Part-1', standardPrice: 240 },
  { program: 'ELP', grade: 'UKG', name: 'Number Bots Part-2', standardPrice: 240 },
  { program: 'ELP', grade: 'UKG', name: 'PenPals Paradise Part-1', standardPrice: 250 },
  { program: 'ELP', grade: 'UKG', name: 'SoundSpark Part-1', standardPrice: 250 },
  { program: 'ELP', grade: 'UKG', name: 'Rhyme Bunny', standardPrice: 150 },
  { program: 'ELP', grade: 'UKG', name: 'Tiny Tinker Lab', standardPrice: 280 },
  
  // LTE Grades
  { program: 'LTE', grade: 'Grade 1', name: 'LTE Grade 1', standardPrice: 300 },
  { program: 'LTE', grade: 'Grade 2', name: 'LTE Grade 2', standardPrice: 320 },
  { program: 'LTE', grade: 'Grade 3', name: 'LTE Grade 3', standardPrice: 340 },
  { program: 'LTE', grade: 'Grade 4', name: 'LTE Grade 4', standardPrice: 360 },
  { program: 'LTE', grade: 'Grade 5', name: 'LTE Grade 5', standardPrice: 380 },
  
  // CAC Grades
  { program: 'CAC', grade: 'Grade 1', name: 'CAC Grade 1', standardPrice: 350 },
  { program: 'CAC', grade: 'Grade 2', name: 'CAC Grade 2', standardPrice: 370 },
  { program: 'CAC', grade: 'Grade 3', name: 'CAC Grade 3', standardPrice: 390 },
  { program: 'CAC', grade: 'Grade 4', name: 'CAC Grade 4', standardPrice: 410 },
  { program: 'CAC', grade: 'Grade 5', name: 'CAC Grade 5', standardPrice: 430 },
  { program: 'CAC', grade: 'Grade 6', name: 'CAC Grade 6', standardPrice: 450 },
  { program: 'CAC', grade: 'Grade 7', name: 'CAC Grade 7', standardPrice: 470 },
  { program: 'CAC', grade: 'Grade 8', name: 'CAC Grade 8', standardPrice: 490 },
  
  // CTF Grades
  { program: 'CTF', grade: 'Grade 6', name: 'CTF Grade 6', standardPrice: 500 },
  { program: 'CTF', grade: 'Grade 7', name: 'CTF Grade 7', standardPrice: 520 },
  { program: 'CTF', grade: 'Grade 8', name: 'CTF Grade 8', standardPrice: 540 },
  { program: 'CTF', grade: 'Grade 9-12', name: 'CTF Grade 9-12', standardPrice: 600 }
];

async function seedBooks() {
  try {
    await mongoose.connect('mongodb+srv://ujjwalkumar0514_db_user:niPo2rOO1QQqSpTA@cluster0.lw7jn1f.mongodb.net');
    
    // Clear existing books
    await Book.deleteMany({});
    
    // Insert new books
    await Book.insertMany(booksData);
    
    console.log('Books seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding books:', error);
    process.exit(1);
  }
}

seedBooks();