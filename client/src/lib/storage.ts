import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload an image file to Firebase Storage
 * @param file - The image file to upload
 * @param path - Storage path (e.g., 'post-images/userId/postId')
 * @param fileName - Optional custom file name
 * @returns Promise with the download URL
 */
export async function uploadImage(
  file: File,
  path: string,
  fileName?: string
): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 10MB");
    }

    // Create file name if not provided
    const name = fileName || `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${name}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error: any) {
    console.error("Error uploading image:", error);
    throw new Error(error.message || "Failed to upload image");
  }
}

/**
 * Upload multiple images to Firebase Storage
 * @param files - Array of image files to upload
 * @param basePath - Base storage path
 * @returns Promise with array of download URLs
 */
export async function uploadMultipleImages(
  files: File[],
  basePath: string
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file, index) =>
      uploadImage(file, basePath, `image_${index}_${Date.now()}_${file.name}`)
    );

    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error: any) {
    console.error("Error uploading multiple images:", error);
    throw new Error(error.message || "Failed to upload images");
  }
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The full download URL of the image
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the URL
    const url = new URL(imageUrl);
    const pathStart = url.pathname.indexOf("/o/") + 3;
    const pathEnd = url.pathname.indexOf("?");
    const filePath = decodeURIComponent(
      url.pathname.substring(pathStart, pathEnd !== -1 ? pathEnd : undefined)
    );

    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error("Error deleting image:", error);
    throw new Error(error.message || "Failed to delete image");
  }
}

/**
 * Convert file to data URL for preview
 * @param file - The file to convert
 * @returns Promise with data URL string
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload profile image for a user
 * @param file - The profile image file
 * @param userId - The user's ID
 * @returns Promise with the download URL
 */
export async function uploadProfileImage(
  file: File,
  userId: string
): Promise<string> {
  return uploadImage(file, `profile-images/${userId}`, "profile.jpg");
}

/**
 * Upload post images
 * @param files - Array of image files
 * @param userId - The user's ID
 * @param postId - The post's ID (can use timestamp if creating new post)
 * @returns Promise with array of download URLs
 */
export async function uploadPostImages(
  files: File[],
  userId: string,
  postId: string
): Promise<string[]> {
  return uploadMultipleImages(files, `post-images/${userId}/${postId}`);
}

/**
 * Upload tribe cover image
 * @param file - The cover image file
 * @param tribeId - The tribe's ID
 * @returns Promise with the download URL
 */
export async function uploadTribeCoverImage(
  file: File,
  tribeId: string
): Promise<string> {
  return uploadImage(file, `tribe-images/${tribeId}`, "cover.jpg");
}
