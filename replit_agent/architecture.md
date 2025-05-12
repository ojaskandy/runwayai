# Architecture Overview

## 1. Overview

CoachT is an AI-powered Taekwondo coaching application that uses pose detection to track and analyze martial arts movements. The application follows a modern full-stack architecture with a clear separation between client and server components.

The system consists of:
- A React-based frontend with TensorFlow.js integration for pose detection
- An Express.js backend server
- PostgreSQL database (via Neon Serverless)
- Authentication system with session management

## 2. System Architecture

CoachT uses a monorepo structure with client-server architecture:

```
├── client/          # Frontend React application
│   ├── src/         # React source code
│   └── index.html   # Entry HTML file
├── server/          # Express.js backend
├── shared/          # Shared code between client and server
└── public/          # Static assets
```

### Frontend Architecture

The frontend is built with React and uses a component-based architecture with the following key design decisions:

- **UI Framework**: Uses shadcn/ui components with Tailwind CSS for styling
- **State Management**: Uses React's Context API and React Query for data fetching
- **Routing**: Uses wouter for lightweight client-side routing
- **AI Processing**: Implements TensorFlow.js with pose detection models for real-time form analysis

### Backend Architecture

The backend is an Express.js server with the following characteristics:

- **API Design**: RESTful API endpoints for user data, recordings, and settings
- **Authentication**: Custom authentication using Passport.js with session-based auth
- **Database Access**: Uses Drizzle ORM for type-safe database queries
- **Session Management**: Express sessions with PostgreSQL storage

### Database Schema

The database uses PostgreSQL with the following key tables:

1. `users`: Stores user authentication and basic profile information
2. `user_profiles`: Extended user profile data with goals and images
3. `recordings`: User recording sessions for taekwondo practice
4. `tracking_settings`: User preferences for the pose detection system

## 3. Key Components

### Client Components

1. **Camera Tracking System**
   - Integrates TensorFlow.js for real-time pose detection
   - Supports multiple pose detection models (lightning, thunder)
   - Provides visual feedback with skeleton overlay

2. **User Dashboard**
   - Displays user progress, recordings history, and goals
   - Manages user profile and settings

3. **Authentication System**
   - Handles user login/registration
   - Manages authenticated sessions

### Server Components

1. **API Layer**
   - Exposes RESTful endpoints for client-server communication
   - Implements authentication middleware

2. **Data Access Layer**
   - Uses Drizzle ORM for database interactions
   - Implements storage patterns for database operations

3. **Authentication Service**
   - Manages user sessions
   - Handles password hashing and verification

## 4. Data Flow

### Authentication Flow

1. User submits credentials via login/register form
2. Server authenticates and creates a session
3. Session ID is stored in cookies
4. Subsequent requests include the session cookie
5. Protected routes check session validity

### Pose Detection Flow

1. Client requests camera access
2. TensorFlow.js models are loaded from CDN
3. Real-time video processing occurs directly in the browser
4. Detected poses are rendered as overlays on the video
5. Screenshots can be captured and saved to the server

### Data Persistence Flow

1. User data is saved to PostgreSQL database via API calls
2. Server validates requests using session data
3. Drizzle ORM handles database operations
4. Responses are returned to the client as JSON

## 5. External Dependencies

### Frontend Dependencies

- **TensorFlow.js**: For AI-based pose detection
- **Shadcn/UI & Radix UI**: For component library
- **Tailwind CSS**: For styling
- **React Query**: For data fetching and caching
- **Wouter**: For client-side routing

### Backend Dependencies

- **Express.js**: Web server framework
- **Passport.js**: Authentication middleware
- **Drizzle ORM**: Database ORM
- **Neon Serverless**: PostgreSQL database provider
- **connect-pg-simple**: Session storage

## 6. Deployment Strategy

The application is configured for deployment on Replit with the following strategy:

- **Build Process**: Vite for frontend bundling, esbuild for the backend
- **Runtime Environment**: Node.js 20
- **Database**: PostgreSQL 16 via Neon Serverless
- **Scaling**: Configured for autoscaling
- **Static Assets**: Served from the server's public directory

The deployment process:
1. Frontend is built using Vite
2. Backend is compiled using esbuild
3. Combined assets are served from a single Express server
4. Environment variables control production vs development behavior

Development mode uses a different setup with:
- Hot module reloading via Vite
- Development-specific logging and error handling
- Automatic database migrations during setup

## 7. Security Considerations

- Passwords are hashed using scrypt with salt
- Session cookies are HttpOnly and secure in production
- API requests validate user permissions before data access
- Camera access requires explicit user permission