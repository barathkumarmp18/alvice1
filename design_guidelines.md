# Alvice Social Media PWA - Design Guidelines

## Design Philosophy
Alvice combines self-expression, mood tracking, and social discovery through emotional color psychology and organic 3D animations. Every interaction should feel warm, human, and emotionally resonant.

## Color Psychology System

### Primary Emotion Colors
- **Happiness**: #FFD166 (warm yellow)
- **Sadness**: #118AB2 (calming blue)
- **Anger**: #EF476F (red-pink)
- **Calm**: #06D6A0 (mint green)
- **Excitement**: #F3722C (vibrant orange)

### Color Application
- Use soft gradients blending emotion colors for backgrounds
- Apply emotion colors to mood indicators, diary entries, and user status
- Neutral backgrounds with emotion-based accents for cards and interactive elements
- Gradient transitions between emotional states

## Core Design Elements

### Typography
- **Display/Headers**: Bold, warm typeface with personality
- **Body Text**: Clean, readable sans-serif for posts and messages
- **Mood Messages**: Larger, emotionally expressive text with appropriate color
- **Timestamps**: Subtle, smaller secondary text

### Layout System
- Tailwind spacing: Consistent use of 2, 4, 8, 12, 16 units (p-2, m-4, gap-8, etc.)
- Card-based layouts with generous padding (p-6 to p-8)
- Section spacing: py-12 to py-20 for vertical rhythm
- Container max-widths: max-w-7xl for main content, max-w-2xl for feeds

### Shape Language
- Border radius: 2xl (rounded-2xl) for all cards and containers
- Rounded-full for profile pictures, mood emojis, and floating buttons
- Card shadows: Medium depth (shadow-lg) with subtle elevation changes on hover
- Smooth corners throughout - no sharp edges

## Component Library

### Cards & Containers
- **Post Cards**: Elevated cards with shadow-lg, rounded-2xl, white/neutral background, hover lift effect
- **Tribe Cards**: Horizontal scroll cards with cover images, rounded corners, gradient overlays
- **Mood Cards**: Large emoji display with animated glow effects and soft color backgrounds
- **Chat Bubbles**: Rounded-full for messages, different alignment for sender/receiver

### Navigation
- **Bottom Navigation**: Floating bar with shadow-2xl, centered icons with labels, active state with emotion-color indicators
- **Header**: Fixed top bar with app name (left), notification bell (right), minimal and clean
- **Tabs**: Smooth underline indicators with color transitions

### Buttons & Actions
- **Primary Button**: Emotion-colored backgrounds with white text, rounded-full, shadow on hover
- **Floating Action Button (+)**: Large circular button, bottom-right position, emotion-gradient with pulse animation
- **Icon Buttons**: Minimal with hover scale effect
- **Chip Selection**: Rounded-full tags for interests, toggleable with color fills

### Forms & Input
- **Text Fields**: Rounded-xl borders, focus states with emotion-color rings, generous padding (p-4)
- **Image Upload**: Dashed border upload zones with preview thumbnails
- **Modal Dialogs**: Centered overlays with backdrop blur, rounded-2xl containers
- **Progress Bars**: Thin colored bars for profile setup questions

### Content Display
- **Feed Layout**: Single column (max-w-2xl), infinite scroll, card-based posts
- **Thread Comments**: Reddit-style indented threading with connection lines
- **Calendar View**: Grid layout for diary with emotion-colored date cells
- **Statistics**: Minimalist cards showing mood analytics with gradient backgrounds

## Page-Specific Designs

### Splash Screen
- Full-screen gradient background (animated emotion colors)
- Large centered "Alvice" logo with 3D shimmer effect
- Particle animation floating around logo
- Smooth fade-out transition (2-3 seconds)

### Authentication
- Centered card (max-w-md) with welcome message
- Google sign-in button with brand colors
- Email/password fields with clean styling
- Subtle background gradient

### Progressive Profile Setup
- **One question per screen** with smooth fade transitions
- Top progress bar showing completion percentage
- Large centered question text
- Input fields or selection chips below
- "Next" button at bottom (disabled until answered)
- Role selection: Two large cards (Creator/Explorer) with icons
- Interest chips: Multi-select rounded-full tags grouped by category
- Profile picture upload: Circular preview with upload zone

### Home Page
- **Header**: Compact top bar with "Alvice" logo and notification bell
- **Mood Section**: Banner showing user's current emoji with message of the day, gradient background matching emotion
- **Feed**: Cards with post content, author info, images (up to 3 in grid), engagement buttons (like/comment counts)
- **Floating + Button**: Bottom-right, emotion-gradient, opens post-type modal

### Mood Popup (Daily Check-in)
- **Full-screen overlay** with semi-transparent backdrop
- Large emoji selection grid (5 emotions)
- After selection: Animated transition to global mood stats (top 3 moods displayed)
- Text input: "What made you feel this way?"
- Two buttons: "Keep Private" and "Post Publicly"
- Emoji floats to Home mood section after submission

### Chats
- **Chat List**: Cards showing recent conversations, profile pictures, last message preview
- **Anonymous Center**: Prominent button leading to mutual followers list
- **Copy Link**: Sticky top section with shareable anonymous message link (NGL-style)
- **Message View**: Contained scrollable area (not full-page), bubbles aligned left/right, rounded-full shapes

### Tribes (Explore)
- **Top Tribes**: Horizontal scroll of featured tribe cards with cover images
- **Trending Posts**: Feed-style layout below tribes
- **Create Tribe Button**: Floating or prominent CTA
- **Tribe Creation Form**: Multi-step with name, description, settings (max members, anonymous toggle, privacy)

### Diary
- **Calendar Grid**: Month view with dates showing mood emojis in corresponding colors
- **Date Selection**: Clicking opens full entry with mood, text, and timestamp
- **Navigation**: Month/year selector at top

### Profile
- **Header Section**: Large profile picture, name, username, follower/following counts
- **Creator Dashboard** (for creators): Analytics cards showing reach, engagement, top posts
- **Content Tabs**: Posts and Comments sections
- **Settings**: List items for dark mode, account management, edit profile, sign out

## Animations & Motion

### Framer Motion Integration
- **Page Transitions**: Fade + slide combinations (200-300ms duration)
- **Card Reveals**: Stagger animations for feed loading
- **Modal Entry**: Scale + opacity from 0.95 to 1
- **Button Press**: Scale down to 0.95 on click with quick spring back

### 3D Effects
- **Card Hover**: Subtle parallax tilt (3-5 degrees)
- **Emoji Animation**: Bounce and glow on selection
- **Logo Shimmer**: Continuous subtle gradient shift
- **Floating Elements**: Gentle up-down motion for floating buttons

### Interaction Feedback
- **Ripple Effects**: On button clicks originating from touch point
- **Smooth Scrolling**: Momentum-based with ease-out
- **Loading States**: Skeleton screens matching content layout
- **Success/Error**: Toast notifications with slide-in from top

## Responsive Behavior
- **Mobile-First**: Design for mobile (375px-428px), scale up for desktop
- **Breakpoints**: Mobile (base), Tablet (md: 768px), Desktop (lg: 1024px)
- **Bottom Navigation**: Always visible on mobile, optional sidebar on desktop
- **Feed Width**: Constrained to max-w-2xl on all screens for readability

## PWA Considerations
- **App Icon**: Rounded square with emotion-gradient background and "A" mark
- **Splash Screen**: Branded with Alvice logo on gradient
- **Status Bar**: Light/dark mode aware
- **Offline State**: Clear indicator with retry option

## Images
- **Hero/Splash**: Animated gradient background (no static image needed)
- **Profile Pictures**: User-uploaded, displayed as rounded-full
- **Post Images**: Up to 3 per quick post, displayed in grid (1, 2, or 3-column layouts)
- **Tribe Covers**: Wide banner images with gradient overlays
- **Story Posts**: Multiple images with rich text interspersed
- **Placeholder States**: Soft gradient backgrounds with icons for empty states