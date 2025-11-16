# 🔥 Firebase Error Handling Reference

## Overview
This document explains the comprehensive error handling system added to your Alvice Firebase app.

---

## Error Handler Function

### Location: `/app/client/src/lib/firebase.ts`

```javascript
import { handleFirebaseError } from './firebase';

// Usage in try-catch blocks:
try {
  await someFirebaseOperation();
} catch (error) {
  const userFriendlyMessage = handleFirebaseError(error);
  console.error('Error:', userFriendlyMessage);
  // Show to user in UI
}
```

---

## Authentication Errors

### Common Auth Error Codes & Messages

| Firebase Error Code | User-Friendly Message |
|-------------------|---------------------|
| `auth/user-not-found` | "No account found with this email." |
| `auth/wrong-password` | "Incorrect password." |
| `auth/email-already-in-use` | "This email is already registered." |
| `auth/weak-password` | "Password should be at least 6 characters." |
| `auth/invalid-email` | "Invalid email address." |
| `auth/operation-not-allowed` | "This sign-in method is not enabled." |
| `auth/unauthorized-domain` | "This domain is not authorized for OAuth operations. Please add it to Firebase Console." |
| `auth/popup-blocked` | "Sign-in popup was blocked by the browser." |
| `auth/popup-closed-by-user` | "Sign-in popup was closed before completion." |

### Example: Email Sign-In Error Handling

```javascript
const signInWithEmail = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    // errorMessage = "Incorrect password." or "No account found with this email."
    showToast(errorMessage); // Display to user
    throw new Error(errorMessage);
  }
};
```

---

## Firestore Errors

### Common Firestore Error Codes & Messages

| Firebase Error Code | User-Friendly Message |
|-------------------|---------------------|
| `firestore/permission-denied` | "You do not have permission to perform this action." |
| `firestore/unavailable` | "Firestore service is temporarily unavailable. Please try again." |
| `firestore/unauthenticated` | "You must be signed in to perform this action." |
| `firestore/failed-precondition` | "This operation requires an index. Please check the console for the index creation link." |

### Example: Creating a Post

```javascript
const createPost = async (postData) => {
  try {
    await addDoc(collection(db, "posts"), postData);
    return { success: true };
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    // errorMessage = "You do not have permission to perform this action."
    return { success: false, error: errorMessage };
  }
};
```

### Handling Missing Index Errors

When you see: **"This operation requires an index"**

```javascript
// The error will contain a link to create the index
// Example error message:
// "The query requires an index. You can create it here: https://console.firebase.google.com/..."

// Solution:
// 1. Click the link in the error message, OR
// 2. Deploy indexes: firebase deploy --only firestore:indexes
```

---

## Storage Errors

### Common Storage Error Codes & Messages

| Firebase Error Code | User-Friendly Message |
|-------------------|---------------------|
| `storage/unauthorized` | "You do not have permission to access this file." |
| `storage/unauthenticated` | "You must be signed in to upload files." |
| `storage/retry-limit-exceeded` | "Upload failed after multiple retries. Please check your connection." |
| `storage/invalid-checksum` | "File upload failed. Please try again." |
| `storage/canceled` | "Upload was cancelled." |
| `storage/unknown` | "An unknown error occurred during upload." |
| `storage/object-not-found` | "File not found." |
| `storage/quota-exceeded` | "Storage quota exceeded." |

### Example: Image Upload

```javascript
const uploadImage = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { success: true, url };
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    // errorMessage = "You must be signed in to upload files."
    return { success: false, error: errorMessage };
  }
};
```

---

## Generic Error Patterns

### Missing or Insufficient Permissions

```javascript
// Error pattern:
if (error.message?.includes('Missing or insufficient permissions')) {
  return 'Missing or insufficient permissions. Please check Firestore security rules.';
}

// Common causes:
// 1. Security rules not deployed
// 2. User not authenticated
// 3. User doesn't own the resource
```

### Index Required

```javascript
// Error pattern:
if (error.message?.includes('requires an index')) {
  return 'This query requires a database index. Please check the console for setup instructions.';
}

// Solution:
// Deploy indexes: firebase deploy --only firestore:indexes
```

---

## Error Handling in Components

### React Component Example

```javascript
import { useState } from 'react';
import { handleFirebaseError } from '@/lib/firebase';

function CreatePostComponent() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (postData) => {
    setLoading(true);
    setError(null);
    
    try {
      await createPost(postData);
      // Success - show success message
    } catch (error) {
      const errorMessage = handleFirebaseError(error);
      setError(errorMessage); // Display to user
      console.error('Post creation failed:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {/* Rest of component */}
    </div>
  );
}
```

---

## Debugging Tips

### 1. Enable Detailed Logging

The Firebase config already logs initialization:

```javascript
console.log('✅ Firebase Config Loaded:', {...});
console.log('✅ Firebase App initialized successfully');
console.log('✅ Firebase Analytics initialized');
console.log('🚀 Firebase SDK ready');
```

### 2. Check Browser Console

Look for these messages:
- `✅` Green checkmark = Success
- `❌` Red X = Error with details
- `⚠️` Warning = Non-critical issue

### 3. Common Development Issues

**Issue:** "Missing Firebase configuration keys"
```
Solution: Check that .env file is in /app/.env (not /app/client/.env)
```

**Issue:** WebSocket connection failed
```
Solution: This is normal in development. Doesn't affect Firebase.
```

**Issue:** Service Worker registration failed
```
Solution: Service workers only work in production builds. Ignore in dev.
```

---

## Security Rules Testing

### Test in Firebase Console

1. Go to Firestore → Rules → Playground
2. Test read/write operations with different users
3. Verify rules are working as expected

### Example Test Cases

```javascript
// Test: Can user read their own data?
match /users/{userId} {
  allow read: if request.auth.uid == userId;
}

// Test: Can user create a post?
match /posts/{postId} {
  allow create: if request.auth.uid == request.resource.data.authorId;
}

// Test: Can user edit someone else's post?
match /posts/{postId} {
  allow update: if request.auth.uid == resource.data.authorId;
  // Should FAIL if user is not the author
}
```

---

## Performance Monitoring

### Track Firebase Operations

```javascript
const measureOperation = async (operationName, operation) => {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    console.log(`✅ ${operationName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ ${operationName} failed after ${duration}ms:`, handleFirebaseError(error));
    throw error;
  }
};

// Usage:
await measureOperation('Create Post', () => createPost(postData));
```

---

## Error Recovery Strategies

### 1. Retry Logic for Transient Errors

```javascript
const retryOperation = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const errorMessage = handleFirebaseError(error);
      if (errorMessage.includes('unavailable') || errorMessage.includes('retry')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error; // Don't retry non-transient errors
    }
  }
};
```

### 2. Graceful Degradation

```javascript
const loadPosts = async () => {
  try {
    const posts = await fetchPosts();
    return posts;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Failed to load posts:', errorMessage);
    
    // Return cached data or empty array instead of crashing
    return getCachedPosts() || [];
  }
};
```

---

## Summary

✅ **Comprehensive error handling implemented**
✅ **User-friendly error messages**
✅ **Detailed logging for debugging**
✅ **Security rules validation**
✅ **Graceful error recovery**

**Key Files:**
- `/app/client/src/lib/firebase.ts` - Error handler
- `/app/client/src/lib/auth-context.tsx` - Auth error handling
- `/app/firestore.rules` - Security rules
- `/app/storage.rules` - Storage rules

**Testing:**
1. Test each auth method (email, Google)
2. Test CRUD operations on each collection
3. Test file uploads
4. Verify error messages are user-friendly
5. Check Firebase Console for any security issues

---

🔥 **Your Firebase error handling is production-ready!** 🔥
