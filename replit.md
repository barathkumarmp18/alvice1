# Alvice - Social Media PWA

## Project Overview
Alvice is a Progressive Web App (PWA) that combines self-expression, mood tracking, and social discovery. The platform uses emotional color psychology and smooth 3D animations to create a warm, human, and emotionally resonant experience.

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Firebase (Firestore, Authentication, Storage, Analytics)
- **Routing**: Wouter (client-side SPA routing)
- **State Management**: TanStack React Query + Firebase real-time listeners
- **UI Components**: shadcn/ui with custom emotional design system
- **PWA**: Service Worker for offline support and installability

## Firebase Configuration
The app uses Firebase services configured with environment variables:
- `VITE_FIREBASE_API_KEY`: Firebase API key
- `VITE_FIREBASE_APP_ID`: Firebase app ID
- `VITE_FIREBASE_PROJECT_ID`: alvice12345

Firebase services used:
- **Authentication**: Google OAuth and Email/Password
- **Firestore**: NoSQL database for users, posts, tribes, moods, messages
- **Storage**: Image and file uploads
- **Analytics**: User behavior tracking

## Project Structure

### Core Pages
- **SplashScreen**: Animated gradient intro with 3D shimmer logo effect (3-second display)
- **AuthPage**: Google + Email/password authentication with Firebase
- **ProfileSetup**: 9-step progressive onboarding (role, name, username, DOB, bio, interests, content preferences, life stage, enhanced bio with employment/relationship/organization details)
- **Home**: Feed with mood indicator, posts from friends, floating + button for creating posts
- **Chats**: Direct messaging for mutual followers + anonymous messaging center with shareable links
- **Explore** (formerly Tribes): Discovery page with horizontal scrollable top tribes, search functionality for tribes/people/topics/hashtags, posts feed, and create tribe button
- **CreateTribe**: Dedicated page for creating new tribes with enhanced form fields
- **Diary**: Calendar view showing daily moods with color-coded dates and entry details
- **Profile**: User profile with followers/following, posts, Creator Dashboard (for creators), and settings

### Key Components
- **BottomNav**: Floating navigation bar (Diary, Chats, Home, Explore, Profile)
- **MoodPopup**: Daily mood check-in at 4 PM with emoji selection, global stats, and private/public sharing
- **EnhancedCreatePostModal**: Post or Question creation with media upload (base64), tags, and crossposting to up to 5 tribes

## Emotional Color Psychology
The app uses five core emotions with associated colors:
- **Happiness**: #FFD166 (warm yellow)
- **Sadness**: #118AB2 (calming blue)
- **Anger**: #EF476F (red-pink)
- **Calm**: #06D6A0 (mint green)
- **Excitement**: #F3722C (vibrant orange)

These colors are used throughout the UI for mood indicators, gradients, and emotional feedback.

## Data Models (Firestore Collections)

### users
- id, email, displayName, username, photoURL
- role (creator/explorer), bio, dateOfBirth
- interests[], contentPreferences[], lifeStage
- employment (student/working/self_employed/unemployed/retired/prefer_not_to_say)
- relationshipStatus (single/in_relationship/married/prefer_not_to_say)
- organizationType (school/college/company/other)
- organizationName
- followers[], following[]
- profileSetupComplete, lastMoodCheck, anonymousLinkId

### posts
- id, authorId, type (post/question), title, content
- images[] (base64 or URLs), tribeIds[] (max 5)
- tags[] (for topic discovery)
- likes[], commentCount
- createdAt, updatedAt

### comments
- id, postId, authorId, content, parentCommentId
- likes[], createdAt

### tribes
- id, name, description, founderId, coverImage
- maxMembers, allowAnonymous, founderVisible, isPrivate
- members[], pendingMembers[]
- createdAt

### moods
- id, userId, emotion, reason
- isPublic, date, createdAt

### messages
- id, senderId, receiverId, content
- isAnonymous, read, createdAt

### notifications
- id, userId, type, actorId, postId, tribeId, message
- read, createdAt

## Key Features

### Authentication Flow
1. Splash screen with animated logo (3 seconds)
2. Google OAuth or Email/Password sign-in
3. New users → ProfileSetup (8 progressive steps)
4. Returning users → Home page

### Mood Tracking
- Daily popup at 4 PM (or manual trigger)
- Emoji selection with animations
- Global mood stats display (top 3 moods)
- Private (Diary) or Public (Feed) sharing
- Calendar view in Diary page with color-coded dates

### Post Creation
- **Post or Question Toggle**: Choose between regular post or question type
- **Media Upload**: Add images (currently base64, can be migrated to Firebase Storage)
- **Tags**: Add topic tags for discoverability
- **Crossposting**: Share to up to 5 tribes simultaneously
- Reddit-style threaded comments
- Like and comment engagement

### Explore Page (Discovery & Communities)
- **Horizontal Scrollable Top Tribes**: Featured tribes with member counts and join buttons
- **Search Functionality**: Filter by All/Tribes/People/Tags with real-time results
- **People Discovery**: Browse and discover other users
- **Tag Discovery**: Find trending topics and hashtags
- **Community Posts Feed**: See latest posts from all tribes
- **Create Tribe**: Dedicated button leading to tribe creation page

### Tribes (Subreddit-style Communities)
- Public or Private tribes
- Admin approval for private tribes
- Founder visibility toggle
- Anonymous posting option
- Max member limits (optional)

### Messaging
- DM for mutual followers
- Anonymous messaging center
- Shareable NGL-style anonymous link
- Real-time message updates
- Scrollable message container (not full-page)

### Creator Dashboard
- Post reach analytics
- Engagement metrics (likes + comments)
- Follower growth tracking
- Visible only for users with role="creator"

## Design System

### Typography
- Display/Headers: Poppins (bold, warm)
- Body Text: Inter (clean, readable)

### Border Radius
- Cards/Containers: 2xl (16px)
- Buttons/Badges: rounded-full for pills
- Images: rounded-xl

### Animations
- Page transitions: Framer Motion fade + slide (300ms)
- Card hover: Subtle parallax tilt effect
- Emoji: Bounce and glow on selection
- Logo: Continuous shimmer gradient
- Floating elements: Gentle up-down motion

### Responsive Design
- Mobile-first (375px-428px base)
- Tablet: 768px (md)
- Desktop: 1024px (lg)
- Bottom navigation always visible on mobile

## PWA Configuration
- **manifest.json**: App metadata, icons, theme color
- **Service Worker** (sw.js): Offline caching for last visited page
- Installable on mobile devices
- Theme color: #FFD166 (happiness yellow)

## Development Notes
- All components use shadcn/ui with custom emotional design
- Framer Motion for all transitions and 3D effects
- Firebase real-time listeners for live updates
- Date-fns for date formatting and calendar logic
- All forms use react-hook-form with Zod validation

## Recent Changes (November 2025)
- **Explore Page Redesign**: Renamed Tribes to Explore with horizontal scrollable top tribes section
- **Enhanced Search**: Added comprehensive search for tribes, people, topics, and hashtags with filter tabs
- **Post Type System**: Implemented Question/Post toggle in create modal
- **Tagging System**: Added tag support for posts with discovery in Explore page
- **Enhanced ProfileSetup**: Extended to 9 steps with employment status, relationship status, and organization details
- **CreateTribe Page**: Separated tribe creation into dedicated page with enhanced form
- **Schema Updates**: Added PostType enum, tags array, and organization/employment fields to User model
- **Defensive Coding**: Added null-safety for tags field to prevent crashes on legacy posts
- **Navigation Update**: Changed bottom nav and routing from /tribes to /explore

## Technical Notes
- **Media Upload**: Currently using base64 encoding for images. For production, migrate to Firebase Storage to avoid Firestore document size limits (1MB)
- **Organization Autocomplete**: Placeholder implemented. Can be enhanced with open-source APIs for colleges/companies (no API key required)
- **Tag System**: Fully functional with search and filtering capabilities
- **Legacy Data**: All tag operations include defensive null-checks (`post.tags || []`) to prevent crashes
