import { sql } from "drizzle-orm";
import { db } from "./db";

// Define the migrations to run
async function runMigrations() {
  try {
    console.log("Running migrations...");

    // Add lastPracticeDate, recordingsCount, goal, goalDueDate, createdAt to users table
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_practice_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS recordings_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS goal_due_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS belt TEXT DEFAULT 'white',
      ADD COLUMN IF NOT EXISTS belt_name TEXT DEFAULT 'White Belt',
      ADD COLUMN IF NOT EXISTS belt_level INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log("Updated users table");

    // Create userProfiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        goal TEXT,
        goal_due_date TIMESTAMP,
        profile_image_url TEXT,
        gallery_images JSONB DEFAULT '[]'
      )
    `);
    console.log("Created user_profiles table");

    // Create recordings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS recordings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT DEFAULT 'Untitled Recording',
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `);
    console.log("Created recordings table");
    
    // Create reference_moves table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reference_moves (
        id SERIAL PRIMARY KEY,
        move_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL,
        joint_angles JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Created reference_moves table");

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migrations
runMigrations().then(() => {
  console.log("All migrations completed");
  process.exit(0);
}).catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});