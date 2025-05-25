import { 
  users, trackingSettings, userProfiles, recordings, earlyAccessSignups, referenceMoves, emailRecords,
  type User, type InsertUser, 
  type TrackingSettings, type InsertTrackingSettings,
  type UserProfile, type InsertUserProfile,
  type Recording, type InsertRecording,
  type EarlyAccessSignup, type InsertEarlyAccess,
  type ReferenceMove, type InsertReferenceMove,
  type EmailRecord, type InsertEmailRecord
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastPractice(userId: number, date?: Date): Promise<User>;
  incrementRecordingsCount(userId: number): Promise<number>;
  
  // User profile methods
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  updateUserGoal(userId: number, goal: string, dueDate?: Date): Promise<UserProfile>;
  addGalleryImage(userId: number, imageUrl: string): Promise<string[]>;
  removeGalleryImage(userId: number, imageUrl: string): Promise<string[]>;
  
  // Recording methods
  getRecordings(userId: number): Promise<Recording[]>;
  saveRecording(recording: InsertRecording): Promise<Recording>;
  deleteRecording(id: number, userId: number): Promise<boolean>;
  
  // Tracking settings methods
  getTrackingSettings(userId: number): Promise<TrackingSettings | undefined>;
  saveTrackingSettings(settings: InsertTrackingSettings): Promise<TrackingSettings>;
  
  // Early access methods
  getEarlyAccessByEmail(email: string): Promise<EarlyAccessSignup | undefined>;
  saveEarlyAccess(data: InsertEarlyAccess): Promise<EarlyAccessSignup>;
  listEarlyAccessSignups(): Promise<EarlyAccessSignup[]>;
  
  // Reference move methods
  getReferenceMove(moveId: number): Promise<ReferenceMove | undefined>;
  saveReferenceMove(move: InsertReferenceMove): Promise<ReferenceMove>;
  getAllReferenceMoves(): Promise<ReferenceMove[]>;
  
  // Email record methods
  saveEmailRecord(record: InsertEmailRecord): Promise<EmailRecord>;
  getEmailRecords(): Promise<EmailRecord[]>;
  
  // Session store
  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // Early access methods
  async getEarlyAccessByEmail(email: string): Promise<EarlyAccessSignup | undefined> {
    const [signup] = await db
      .select()
      .from(earlyAccessSignups)
      .where(eq(earlyAccessSignups.email, email));
    return signup || undefined;
  }
  
  async saveEarlyAccess(data: InsertEarlyAccess): Promise<EarlyAccessSignup> {
    const [signup] = await db
      .insert(earlyAccessSignups)
      .values(data)
      .returning();
    return signup;
  }
  
  async listEarlyAccessSignups(): Promise<EarlyAccessSignup[]> {
    const signups = await db
      .select()
      .from(earlyAccessSignups)
      .orderBy(earlyAccessSignups.createdAt);
    return signups;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUserLastPractice(userId: number, date: Date = new Date()): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastPracticeDate: date })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  async incrementRecordingsCount(userId: number): Promise<number> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        recordingsCount: sql`${users.recordingsCount} + 1` 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser.recordingsCount || 0;
  }
  
  // Profile methods
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    // Check if profile already exists
    const existingProfile = await this.getUserProfile(profile.userId);
    
    if (existingProfile) {
      return this.updateUserProfile(profile.userId, profile);
    }
    
    // Ensure galleryImages is an array if provided
    // Make sure galleryImages is a proper string array
    const galleryImages = Array.isArray(profile.galleryImages) ? 
      profile.galleryImages : 
      (profile.galleryImages ? [profile.galleryImages.toString()] : []);
    
    const [newProfile] = await db
      .insert(userProfiles)
      .values({
        ...profile,
        galleryImages
      })
      .returning();
    return newProfile;
  }
  
  async updateUserProfile(userId: number, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(userId);
    
    if (!existingProfile) {
      // Create a new profile if it doesn't exist
      return this.createUserProfile({ 
        userId, 
        ...profile,
        // Ensure galleryImages is an array
        galleryImages: Array.isArray(profile.galleryImages) ? profile.galleryImages : []
      } as InsertUserProfile);
    }
    
    // Make a safe copy of the profile 
    const safeProfile: Partial<InsertUserProfile> = { ...profile };
    
    // Ensure galleryImages is a proper string array if provided
    if (profile.galleryImages !== undefined) {
      const galleryImages = Array.isArray(profile.galleryImages) 
        ? profile.galleryImages 
        : (profile.galleryImages ? [profile.galleryImages.toString()] : []);
      
      // Only update galleryImages if it's a valid array
      safeProfile.galleryImages = galleryImages;
    }
    
    // Remove galleryImages from the set operation if it's not properly formatted
    const updateData = {...safeProfile};
    
    const [updatedProfile] = await db
      .update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }
  
  async updateUserGoal(userId: number, goal: string, dueDate?: Date): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(userId);
    
    if (!existingProfile) {
      // Create a new profile with the goal
      return this.createUserProfile({ 
        userId, 
        goal, 
        goalDueDate: dueDate 
      } as InsertUserProfile);
    }
    
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({ 
        goal,
        goalDueDate: dueDate
      })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }
  
  async addGalleryImage(userId: number, imageUrl: string): Promise<string[]> {
    const profile = await this.getUserProfile(userId);
    
    const currentImages = profile?.galleryImages || [];
    const updatedImages = [...currentImages, imageUrl];
    
    if (!profile) {
      // Create new profile with the image
      const newProfile = await this.createUserProfile({
        userId,
        galleryImages: updatedImages
      } as InsertUserProfile);
      return newProfile.galleryImages || [];
    }
    
    // Update existing profile
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({ galleryImages: updatedImages })
      .where(eq(userProfiles.userId, userId))
      .returning();
    
    return updatedProfile.galleryImages || [];
  }
  
  async removeGalleryImage(userId: number, imageUrl: string): Promise<string[]> {
    const profile = await this.getUserProfile(userId);
    
    if (!profile || !profile.galleryImages) {
      return [];
    }
    
    // Filter out the image to remove
    const updatedImages = profile.galleryImages.filter(img => img !== imageUrl);
    
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({ galleryImages: updatedImages })
      .where(eq(userProfiles.userId, userId))
      .returning();
    
    return updatedProfile.galleryImages || [];
  }
  
  // Recording methods
  async getRecordings(userId: number): Promise<Recording[]> {
    const userRecordings = await db
      .select()
      .from(recordings)
      .where(eq(recordings.userId, userId));
    
    return userRecordings;
  }
  
  async saveRecording(recording: InsertRecording): Promise<Recording> {
    const [newRecording] = await db
      .insert(recordings)
      .values(recording)
      .returning();
    
    // Increment the user's recordings count
    await this.incrementRecordingsCount(recording.userId);
    
    return newRecording;
  }
  
  async deleteRecording(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(recordings)
      .where(eq(recordings.id, id) && eq(recordings.userId, userId));
    
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Tracking settings methods
  async getTrackingSettings(userId: number): Promise<TrackingSettings | undefined> {
    const [settings] = await db
      .select()
      .from(trackingSettings)
      .where(eq(trackingSettings.userId, userId));
    return settings || undefined;
  }

  async saveTrackingSettings(settings: InsertTrackingSettings): Promise<TrackingSettings> {
    // Try to find existing settings
    const existingSettings = settings.userId 
      ? await this.getTrackingSettings(settings.userId)
      : undefined;

    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(trackingSettings)
        .set(settings)
        .where(eq(trackingSettings.id, existingSettings.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(trackingSettings)
        .values(settings)
        .returning();
      return created;
    }
  }
  
  // Reference move methods
  async getReferenceMove(moveId: number): Promise<ReferenceMove | undefined> {
    const [move] = await db
      .select()
      .from(referenceMoves)
      .where(eq(referenceMoves.moveId, moveId));
    return move || undefined;
  }
  
  async saveReferenceMove(move: InsertReferenceMove): Promise<ReferenceMove> {
    // Check if move already exists
    const existingMove = await this.getReferenceMove(move.moveId);
    
    if (existingMove) {
      // Update existing move
      const [updated] = await db
        .update(referenceMoves)
        .set({
          ...move,
          updatedAt: new Date()
        })
        .where(eq(referenceMoves.id, existingMove.id))
        .returning();
      return updated;
    } else {
      // Create new move
      const [created] = await db
        .insert(referenceMoves)
        .values(move)
        .returning();
      return created;
    }
  }
  
  async getAllReferenceMoves(): Promise<ReferenceMove[]> {
    const moves = await db
      .select()
      .from(referenceMoves)
      .orderBy(referenceMoves.moveId);
    return moves;
  }
  
  // Email record methods
  async saveEmailRecord(record: InsertEmailRecord): Promise<EmailRecord> {
    const [created] = await db
      .insert(emailRecords)
      .values(record)
      .returning();
    return created;
  }
  
  async getEmailRecords(): Promise<EmailRecord[]> {
    const records = await db
      .select()
      .from(emailRecords)
      .orderBy(desc(emailRecords.sentAt));
    return records;
  }
}

export const storage = new DatabaseStorage();
