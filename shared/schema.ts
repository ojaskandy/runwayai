import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Basic user schema, not critical for the application's core functionality
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  lastPracticeDate: timestamp("last_practice_date"),
  recordingsCount: integer("recordings_count").default(0),
  goal: text("goal").default(""),
  goalDueDate: timestamp("goal_due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User profile schema for storing additional information
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  goal: text("goal"),
  goalDueDate: timestamp("goal_due_date"),
  profileImageUrl: text("profile_image_url"),
  galleryImages: jsonb("gallery_images").$type<string[]>().default([]),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  userId: true,
  goal: true,
  goalDueDate: true,
  profileImageUrl: true,
  galleryImages: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Schema for recording sessions
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").default("Untitled Recording"),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  userId: true,
  title: true,
  fileUrl: true,
  notes: true,
});

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

// Schema for tracking settings
export const trackingSettings = pgTable("tracking_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  confidenceThreshold: text("confidence_threshold").notNull().default("0.5"),
  modelSelection: text("model_selection").notNull().default("lightning"),
  maxPoses: integer("max_poses").notNull().default(1),
  skeletonColor: text("skeleton_color").notNull().default("#BB86FC"),
  showSkeleton: boolean("show_skeleton").notNull().default(true),
  showPoints: boolean("show_points").notNull().default(true),
});

export const insertTrackingSettingsSchema = createInsertSchema(trackingSettings).pick({
  userId: true,
  confidenceThreshold: true,
  modelSelection: true,
  maxPoses: true,
  skeletonColor: true,
  showSkeleton: true,
  showPoints: true,
});

export type InsertTrackingSettings = z.infer<typeof insertTrackingSettingsSchema>;
export type TrackingSettings = typeof trackingSettings.$inferSelect;

// Schema for early access signups
export const earlyAccessSignups = pgTable("early_access_signups", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  referralSource: text("referral_source").notNull(),
  experienceLevel: text("experience_level"),
  newsletterOptIn: boolean("newsletter_opt_in").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEarlyAccessSchema = createInsertSchema(earlyAccessSignups).pick({
  fullName: true,
  email: true,
  referralSource: true,
  experienceLevel: true,
  newsletterOptIn: true,
});

export type InsertEarlyAccess = z.infer<typeof insertEarlyAccessSchema>;
export type EarlyAccessSignup = typeof earlyAccessSignups.$inferSelect;

// Reference moves for Taekwondo techniques
export const referenceMoves = pgTable("reference_moves", {
  id: serial("id").primaryKey(),
  moveId: integer("move_id").notNull(), // ID from the frontend move collection
  name: text("name").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  jointAngles: jsonb("joint_angles"),  // Store joint angles as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReferenceMoveSchema = createInsertSchema(referenceMoves).pick({
  moveId: true,
  name: true,
  category: true,
  imageUrl: true,
  jointAngles: true,
});

export type InsertReferenceMove = z.infer<typeof insertReferenceMoveSchema>;
export type ReferenceMove = typeof referenceMoves.$inferSelect;

// Email records for tracking sent emails
export const emailRecords = pgTable("email_records", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  status: text("status").notNull(), // success, failure, etc.
  source: text("source").default("mobile_landing"), // where the email was sent from
  responseData: jsonb("response_data"), // Store response data from email service
});

export const insertEmailRecordSchema = createInsertSchema(emailRecords).pick({
  email: true,
  status: true,
  source: true,
  responseData: true,
});

export type InsertEmailRecord = z.infer<typeof insertEmailRecordSchema>;
export type EmailRecord = typeof emailRecords.$inferSelect;
