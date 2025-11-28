# Firebase Deployment Guide for Alvice

## Prerequisites
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created (Project ID: alvice12345)

## Setup Steps

### 1. Install Dependencies
```bash
cd /app
npm install
cd client
npm install
```

### 2. Firebase Login
```bash
firebase login
```

### 3. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

This will deploy the security rules defined in `/app/firestore.rules` to your Firebase project.

### 4. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

This will create the composite indexes defined in `/app/firestore.indexes.json`.

### 5. Deploy Storage Rules
```bash
firebase deploy --only storage
```

This will deploy the storage security rules from `/app/storage.rules`.

### 6. Build and Deploy Frontend
```bash
cd /app/client
npm run build
cd ..
firebase deploy --only hosting
```

## Environment Variables

The Firebase configuration is stored in `/app/client/.env`:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID

**Important:** Never commit `.env` file to public repositories. Add it to `.gitignore`.

## Key Features Implemented

### 1. **Firebase Storage Integration**
- Images are now uploaded to Firebase Storage instead of being stored as base64
- Automatic image optimization and CDN delivery
- Proper storage paths: `profile-images/`, `post-images/`, `tribe-images/`

### 2. **Firestore Security Rules**
- Users can only modify their own data
- Public read access for social features
- Private messages are only accessible to sender/receiver
- Tribe founders have additional permissions

### 3. **Storage Security Rules**
- 10MB max file size limit
- Only image files allowed
- Users can only upload to their own folders

### 4. **Real-time Updates**
- Posts feed updates in real-time using `onSnapshot`
- Chat messages sync instantly
- Tribes list updates automatically
- No need for manual refresh

### 5. **Composite Indexes**
- Optimized queries for posts, moods, messages, and comments
- Prevents Firestore query errors
- Better performance for complex queries

## Fixed Issues

### 1. **Image Upload Bug**
- **Before:** Images stored as base64 strings in Firestore (hit 1MB document limit)
- **After:** Images uploaded to Firebase Storage with CDN URLs

### 2. **Firestore Query Bugs**
- **Before:** Querying users by non-existent "id" field
- **After:** Using `doc()` to get users by document ID

### 3. **Missing Real-time Updates**
- **Before:** Using `getDocs()` for one-time reads
- **After:** Using `onSnapshot()` for real-time listeners

### 4. **Anonymous Link Feature**
- **Before:** Link generated but not saved
- **After:** Link ID saved to user document and persists

### 5. **Permission Errors**
- **Before:** No security rules defined
- **After:** Comprehensive security rules for all collections

## Testing

### Test Firestore Rules Locally
```bash
firebase emulators:start
```

### Test Individual Features
1. **Image Upload:** Create a post with images and verify they appear in Firebase Storage
2. **Real-time Updates:** Open the app in two browsers and send a message - should appear instantly
3. **Anonymous Link:** Copy the anonymous link from Chats page and verify it persists after page refresh
4. **Permissions:** Try accessing another user's data - should be blocked by security rules

## Monitoring

### Firebase Console
- **Firestore:** Check document counts and query performance
- **Storage:** Monitor storage usage and file counts
- **Authentication:** View active users
- **Analytics:** Track user engagement

### Common Issues

1. **"Missing or insufficient permissions" error**
   - Solution: Deploy Firestore rules using `firebase deploy --only firestore:rules`

2. **"The query requires an index" error**
   - Solution: Deploy indexes using `firebase deploy --only firestore:indexes`
   - Or click the link in the error message to auto-create the index

3. **Images not uploading**
   - Solution: Deploy storage rules using `firebase deploy --only storage`
   - Check that file size is under 10MB

4. **Real-time updates not working**
   - Solution: Check browser console for connection errors
   - Verify Firestore security rules allow read access

## Performance Optimization

1. **Image Compression:** Consider adding client-side image compression before upload
2. **Pagination:** Implement infinite scroll for posts feed
3. **Caching:** Use Firebase's offline persistence for better UX
4. **Indexes:** Monitor query performance and add indexes as needed

## Security Best Practices

1. **Never expose Firebase credentials in client code** - Use environment variables
2. **Always validate data on the server side** - Security rules are the server
3. **Implement rate limiting** - Use Firebase App Check to prevent abuse
4. **Regular security audits** - Review security rules periodically
5. **Monitor usage** - Set up alerts for unusual activity

## Support

For Firebase-specific issues:
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com
- Stack Overflow: Tag questions with `firebase` and `firestore`
