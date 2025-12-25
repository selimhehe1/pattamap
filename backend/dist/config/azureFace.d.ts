import { FaceClient } from '@azure-rest/ai-vision-face';
declare let faceClient: FaceClient | null;
/**
 * Compare two faces and return similarity score
 * Uses basic face detection only (no attributes - requires approval)
 * @param imageUrl1 - URL of first image (verification selfie)
 * @param imageUrl2 - URL of second image (profile photo)
 * @returns Similarity score (0-100) or null if error
 */
export declare function compareFaces(imageUrl1: string, imageUrl2: string): Promise<number | null>;
/**
 * Compare verification selfie against multiple profile photos
 * Returns the highest similarity score
 * @param selfieUrl - Verification selfie URL
 * @param profilePhotoUrls - Array of profile photo URLs
 * @returns Best match score (0-100) or null if error
 */
export declare function compareAgainstMultiplePhotos(selfieUrl: string, profilePhotoUrls: string[]): Promise<number | null>;
/**
 * Simple face detection - just check if a face exists in the image
 * Used for auto-approve verification (no comparison needed)
 * @param imageUrl - URL of image to check
 * @returns true if face detected, false otherwise
 */
export declare function detectFaceInImage(imageUrl: string): Promise<boolean>;
export default faceClient;
//# sourceMappingURL=azureFace.d.ts.map