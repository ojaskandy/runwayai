# CoachT - AI-Powered Taekwondo Coach

## Overview

CoachT is an AI-powered Taekwondo coaching application that provides real-time pose analysis and feedback for martial arts training. The system uses computer vision and machine learning to analyze user movements, calculate joint angles, and provide scoring feedback to help users improve their Taekwondo techniques.

## System Architecture

CoachT follows a modern full-stack architecture with a clear separation between client and server components:

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library with Tailwind CSS for styling
- **State Management**: React Context API for theme and authentication, React Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **AI Processing**: TensorFlow.js with pose detection models (MoveNet) for real-time pose analysis
- **Animations**: Framer Motion for smooth UI transitions

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with session-based authentication using local strategy
- **API Design**: RESTful endpoints with structured error handling
- **Development**: tsx for TypeScript execution in development

### Database Schema
- **Provider**: PostgreSQL via Neon Serverless
- **Key Tables**:
  - `users`: Core user authentication and profile data
  - `user_profiles`: Extended profile information with goals and gallery images
  - `recordings`: User practice session recordings
  - `tracking_settings`: User-specific AI model preferences
  - `early_access_signups`: Pre-launch user registration

## Key Components

### Pose Detection Engine
- Uses TensorFlow.js MoveNet models (Lightning/Thunder variants)
- Real-time joint angle calculation for martial arts analysis
- Dynamic Time Warping (DTW) algorithm for movement sequence comparison
- Custom scoring system based on biomechanical analysis

### Camera System
- Multi-source support (webcam, uploaded images/videos)
- Dual camera support (front/rear facing)
- Real-time video processing with pose overlay visualization
- Screenshot and recording capabilities

### User Management
- Session-based authentication with secure password hashing
- User profiles with belt progression tracking
- Goal setting and progress monitoring
- Gallery system for storing reference poses

### AI Analysis Features
- Joint angle measurement and comparison
- Movement timing analysis
- Reference pose matching
- Scoring system with detailed feedback
- Progress tracking over time

## Data Flow

1. **User Authentication**: Users log in through the authentication system, creating secure sessions
2. **Media Input**: Users can use live camera feed or upload images/videos for analysis
3. **Pose Detection**: TensorFlow.js processes the visual input to extract pose keypoints
4. **Analysis Engine**: Joint angles are calculated and compared against reference poses
5. **Scoring**: DTW algorithm compares movement sequences and generates performance scores
6. **Feedback**: Results are presented to users with detailed breakdowns and improvement suggestions
7. **Storage**: Session data, recordings, and progress are stored in the PostgreSQL database

## External Dependencies

### Core AI/ML Libraries
- `@tensorflow/tfjs-core`: Core TensorFlow.js functionality
- `@tensorflow-models/pose-detection`: Pre-trained pose detection models
- `@mediapipe/pose`: MediaPipe pose estimation (backup option)

### UI and Styling
- `@radix-ui/*`: Accessible UI primitive components
- `tailwindcss`: Utility-first CSS framework
- `framer-motion`: Animation library

### Backend Services
- `@neondatabase/serverless`: Serverless PostgreSQL driver
- `passport`: Authentication middleware
- `express-session`: Session management
- `resend`: Email service integration

### Development Tools
- `drizzle-kit`: Database migration tool
- `tsx`: TypeScript execution for development
- `vite`: Fast build tool and dev server

## Deployment Strategy

### Development Environment
- Local development using Replit with PostgreSQL module
- Hot reload enabled via Vite dev server
- Development server runs on port 5000 with Vite on 5173

### Production Build
- Vite builds the client-side application to static assets
- esbuild bundles the server-side code for production
- Autoscale deployment target configured for performance

### Database Management
- Drizzle migrations handle schema changes
- Environment-based database URL configuration
- Connection pooling via Neon serverless for scalability

## Changelog
- June 21, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.