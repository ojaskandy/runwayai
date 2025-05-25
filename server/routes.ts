import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertTrackingSettingsSchema, 
  insertUserProfileSchema, 
  insertRecordingSchema, 
  type InsertRecording,
  insertEarlyAccessSchema,
  type InsertEarlyAccess 
} from "@shared/schema";
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';
import { Request, Response, NextFunction } from "express";

// Initialize Resend with the API key from environment variables
// IMPORTANT: In a production environment, use an environment variable for the API key.
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("Resend API initialized successfully");
  } else {
    console.log("No Resend API key found. Email functionality will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize Resend:", error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Early Access Signup - no authentication required
  app.post("/api/early-access", async (req, res) => {
    try {
      const result = insertEarlyAccessSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      // Check if email already exists
      const existing = await storage.getEarlyAccessByEmail(result.data.email);
      if (existing) {
        return res.status(200).json({ message: "Thank you! Your email is already registered for early access." });
      }
      
      const signupData: InsertEarlyAccess = result.data;
      const signup = await storage.saveEarlyAccess(signupData);
      
      res.status(201).json({ message: "Thank you for your interest! We'll notify you when early access is available." });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // List all early access signups (should be protected in a real app)
  app.get("/api/early-access", async (req, res) => {
    try {
      const signups = await storage.listEarlyAccessSignups();
      res.json(signups);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // User profile routes
  app.get("/api/profile", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const profile = await storage.getUserProfile(req.user.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  app.post("/api/profile", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const schema = insertUserProfileSchema.pick({
        goal: true,
        goalDueDate: true,
        profileImageUrl: true,
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const existingProfile = await storage.getUserProfile(req.user.id);
      
      if (existingProfile) {
        // Update existing profile
        const updatedProfile = await storage.updateUserProfile(req.user.id, result.data);
        res.json(updatedProfile);
      } else {
        // Create new profile
        const newProfile = await storage.createUserProfile({
          userId: req.user.id,
          ...result.data,
          galleryImages: []
        });
        res.status(201).json(newProfile);
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Tracking settings routes
  app.get("/api/tracking-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const settings = await storage.getTrackingSettings(req.user.id);
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  app.post("/api/tracking-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const schema = insertTrackingSettingsSchema.pick({
        shoulderWidthCalibration: true,
        distanceCalibration: true,
        cameraSettings: true,
        preferredRoutines: true,
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const settings = await storage.saveTrackingSettings({
        userId: req.user.id,
        ...result.data
      });
      
      res.status(201).json(settings);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Gallery image routes
  app.post("/api/gallery", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const schema = z.object({
        imageUrl: z.string(),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const galleryImages = await storage.addGalleryImage(req.user.id, result.data.imageUrl);
      res.json({ galleryImages });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  app.delete("/api/gallery", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    try {
      const schema = z.object({
        imageUrl: z.string(),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const galleryImages = await storage.removeGalleryImage(req.user.id, result.data.imageUrl);
      res.json({ galleryImages });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Recording routes
  app.get("/api/recordings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    try {
      const recordings = await storage.getRecordings(req.user.id);
      res.json(recordings);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  app.post("/api/recordings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    try {
      // Create a schema that requires fileUrl but makes userId optional
      // (we'll fill it in with the authenticated user's ID)
      const recordingSchema = z.object({
        fileUrl: z.string(),
        title: z.string().optional().nullable(),
        notes: z.string().optional().nullable()
      });
      
      // Parse the incoming request body
      const parsedData = recordingSchema.parse(req.body);
      
      // Now create the actual recording data with the required userId
      const recordingData: InsertRecording = {
        userId: req.user.id,
        fileUrl: parsedData.fileUrl,
        title: parsedData.title || 'Untitled Recording',
        notes: parsedData.notes || '',
      };
      
      // Increment the user's recordings count
      await storage.incrementRecordingsCount(req.user.id);
      
      // Save the recording
      const recording = await storage.saveRecording(recordingData);
      res.status(201).json(recording);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  app.delete("/api/recordings/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid recording ID" });
      }
      
      const success = await storage.deleteRecording(id, req.user.id);
      if (!success) {
        return res.status(404).json({ error: "Recording not found or you don't have permission to delete it" });
      }
      
      res.status(200).json({ message: "Recording deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Landing page image upload - Temporary endpoint for development
  app.post("/api/landing-image", async (req, res) => {
    try {
      const schema = z.object({
        section: z.string(),
        imageUrl: z.string()
      });
      
      const { section, imageUrl } = schema.parse(req.body);
      
      // Write the base64 image to the public folder
      
      // Extract base64 data
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Determine file extension from the data URL
      const fileExtension = imageUrl.match(/^data:image\/(\w+);/)?.[1] || 'png';
      
      // Create a unique filename
      const filename = `${section}-${Date.now()}.${fileExtension}`;
      const filepath = path.join(process.cwd(), 'public', 'LandingPageImages', filename);
      
      // Ensure the directory exists
      const dir = path.join(process.cwd(), 'public', 'LandingPageImages');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write the file
      fs.writeFileSync(filepath, buffer);
      
      res.json({ imageUrl: `/LandingPageImages/${filename}` });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Reference move API routes - for saving and retrieving reference poses
  app.post("/api/reference-moves", async (req, res) => {
    // Anyone can access reference moves, no authentication required
    try {
      const schema = z.object({
        moveId: z.number(),
        name: z.string(),
        category: z.string(),
        imageUrl: z.string(),
        jointAngles: z.record(z.string(), z.number()).optional(),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const move = await storage.saveReferenceMove(result.data);
      res.json(move);
    } catch (error) {
      console.error("Error saving reference move:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Get all reference moves
  app.get("/api/reference-moves", async (req, res) => {
    try {
      const moves = await storage.getAllReferenceMoves();
      res.json(moves);
    } catch (error) {
      console.error("Error getting reference moves:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Get a specific reference move
  app.get("/api/reference-moves/:moveId", async (req, res) => {
    try {
      const moveId = parseInt(req.params.moveId);
      if (isNaN(moveId)) {
        return res.status(400).json({ error: "Invalid move ID" });
      }
      
      const move = await storage.getReferenceMove(moveId);
      if (!move) {
        return res.status(404).json({ error: "Reference move not found" });
      }
      
      res.json(move);
    } catch (error) {
      console.error("Error getting reference move:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // New endpoint for sending the setup guide email
  app.post("/api/send-guide", async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Always save the email request to the database regardless of Resend API status
    try {
      await storage.saveEmailRecord({
        email,
        status: 'requested',
        source: 'mobile_landing',
        responseData: { timestamp: new Date().toISOString() }
      });
    } catch (dbErr) {
      console.error("Failed to save email record to database:", dbErr);
      // Continue with email sending even if database record fails
    }

    // If Resend API is not configured, return a successful response without sending an email
    if (!resend) {
      console.log("Email sending skipped - Resend API not configured");
      
      // Update the email record in database
      try {
        await storage.saveEmailRecord({
          email,
          status: 'skipped',
          source: 'mobile_landing',
          responseData: { reason: 'Resend API not configured' }
        });
      } catch (dbErr) {
        console.error("Failed to update email record in database:", dbErr);
      }
      
      return res.status(200).json({ 
        message: "Email sending soon. Excited to have you here!"
      });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'CoachT <onboarding@coacht.ai>',
        to: [email],
        subject: 'Your CoachT Setup Guide is Here!',
        html: `
          <h1>Welcome to CoachT!</h1>
          <p>Thanks for your interest! We\'re excited to help you elevate your training.</p>
          <p>To get the best experience and access all features, please use CoachT on a <strong>laptop or desktop computer</strong>.</p>
          <p><strong>Here\'s a quick guide to get started:</strong></p>
          <ul>
            <li>Ensure you have a stable internet connection.</li>
            <li>Use a modern browser like Chrome or Firefox.</li>
            <li>Allow camera access when prompted.</li>
            <li>Explore the different modes: Practice, Test, and Routine.</li>
          </ul>
          <p>If you have any questions, don\'t hesitate to reach out to our support team.</p>
          <p>Happy Training!</p>
          <p>The CoachT Team</p>
        `
      });

      // Save the response to the database
      try {
        await storage.saveEmailRecord({
          email,
          status: error ? 'failed' : 'sent',
          source: 'mobile_landing',
          responseData: error ? { error: error.message } : data
        });
      } catch (dbErr) {
        console.error("Failed to save email response to database:", dbErr);
      }

      if (error) {
        console.error("Resend API Error:", error);
        // Return success anyway to not block the application flow
        return res.status(200).json({ 
          message: "Email sending soon. Excited to have you here!"
        });
      }

      return res.status(200).json({ message: "Setup guide sent successfully!" });
    } catch (err: any) {
      console.error("Server Error sending email:", err);
      
      // Save the error to the database
      try {
        await storage.saveEmailRecord({
          email,
          status: 'error',
          source: 'mobile_landing',
          responseData: { error: err.message }
        });
      } catch (dbErr) {
        console.error("Failed to save email error to database:", dbErr);
      }
      
      // Return success anyway to not block the application flow
      return res.status(200).json({ 
        message: "Email sending soon. Excited to have you here!"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}