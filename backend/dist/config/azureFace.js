"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareFaces = compareFaces;
exports.compareAgainstMultiplePhotos = compareAgainstMultiplePhotos;
exports.detectFaceInImage = detectFaceInImage;
const ai_vision_face_1 = __importDefault(require("@azure-rest/ai-vision-face"));
const core_auth_1 = require("@azure/core-auth");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Azure Face API Configuration (New SDK - Basic Detection Only)
// Docs: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/quickstarts-sdk/identity-client-library
// NOTE: Using basic detection only (no attributes/verification) - no approval needed
// Face attributes (age, gender, emotion, etc.) require approval since 2022
const AZURE_FACE_KEY = process.env.AZURE_FACE_API_KEY;
const AZURE_FACE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT;
if (!AZURE_FACE_KEY || !AZURE_FACE_ENDPOINT) {
    console.warn('⚠️ Azure Face API credentials not configured. Verification feature will be disabled.');
}
// Create Azure Face API client (new SDK)
let faceClient = null;
if (AZURE_FACE_KEY && AZURE_FACE_ENDPOINT) {
    const credential = new core_auth_1.AzureKeyCredential(AZURE_FACE_KEY);
    faceClient = (0, ai_vision_face_1.default)(AZURE_FACE_ENDPOINT, credential);
    console.log('✅ Azure Face API client initialized (Basic detection - no approval required)');
}
/**
 * Calculate Euclidean distance between two points
 */
function euclideanDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
/**
 * Calculate similarity score between two faces based on landmarks and geometry
 * Limited to basic face detection (no attributes - they require approval)
 * @param face1 - First face detection result
 * @param face2 - Second face detection result
 * @returns Similarity score (0-100)
 */
function calculateFaceSimilarity(face1, face2) {
    let totalScore = 0;
    let totalWeight = 0;
    // 1. Face shape similarity (width/height ratio) - Weight: 4
    const rect1 = face1.faceRectangle;
    const rect2 = face2.faceRectangle;
    const ratio1 = rect1.width / rect1.height;
    const ratio2 = rect2.width / rect2.height;
    const ratioDiff = Math.abs(ratio1 - ratio2);
    const shapeScore = Math.max(0, 100 - (ratioDiff * 150)); // More tolerant
    totalScore += shapeScore * 4;
    totalWeight += 4;
    // 2. Face size similarity - Weight: 2
    const size1 = rect1.width * rect1.height;
    const size2 = rect2.width * rect2.height;
    const sizeDiff = Math.abs(size1 - size2) / Math.max(size1, size2);
    const sizeScore = Math.max(0, 100 - (sizeDiff * 100));
    totalScore += sizeScore * 2;
    totalWeight += 2;
    // 3. Landmark-based similarity (if available) - Weight: 4
    const landmarks1 = face1.faceLandmarks;
    const landmarks2 = face2.faceLandmarks;
    if (landmarks1 && landmarks2) {
        // Calculate inter-ocular distance (eye spacing) - important facial metric
        if (landmarks1.pupilLeft && landmarks1.pupilRight &&
            landmarks2.pupilLeft && landmarks2.pupilRight) {
            const iod1 = euclideanDistance(landmarks1.pupilLeft, landmarks1.pupilRight);
            const iod2 = euclideanDistance(landmarks2.pupilLeft, landmarks2.pupilRight);
            const iodDiff = Math.abs(iod1 - iod2) / Math.max(iod1, iod2);
            const iodScore = Math.max(0, 100 - (iodDiff * 200));
            totalScore += iodScore * 2;
            totalWeight += 2;
        }
        // Calculate nose-to-mouth distance ratio
        if (landmarks1.noseTip && landmarks1.upperLipTop &&
            landmarks2.noseTip && landmarks2.upperLipTop) {
            const ntm1 = euclideanDistance(landmarks1.noseTip, landmarks1.upperLipTop);
            const ntm2 = euclideanDistance(landmarks2.noseTip, landmarks2.upperLipTop);
            const ntmDiff = Math.abs(ntm1 - ntm2) / Math.max(ntm1, ntm2);
            const ntmScore = Math.max(0, 100 - (ntmDiff * 150));
            totalScore += ntmScore * 2;
            totalWeight += 2;
        }
    }
    // Calculate weighted average
    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 60;
    // Conservative baseline: if only basic detection, assume medium similarity
    // Real verification would require approval from Microsoft
    const baselineAdjusted = Math.max(50, finalScore); // Minimum 50 for detected faces
    console.log(`   📐 Shape score: ${shapeScore.toFixed(1)}, Size score: ${sizeScore.toFixed(1)}`);
    return Math.min(100, baselineAdjusted);
}
/**
 * Compare two faces and return similarity score
 * Uses basic face detection only (no attributes - requires approval)
 * @param imageUrl1 - URL of first image (verification selfie)
 * @param imageUrl2 - URL of second image (profile photo)
 * @returns Similarity score (0-100) or null if error
 */
async function compareFaces(imageUrl1, imageUrl2) {
    try {
        if (!faceClient || !AZURE_FACE_KEY || !AZURE_FACE_ENDPOINT) {
            throw new Error('Azure Face API not configured');
        }
        // Detect face in first image (basic detection only)
        const detectResponse1 = await faceClient.path('/detect').post({
            contentType: 'application/json',
            queryParameters: {
                detectionModel: 'detection_03',
                returnFaceId: false,
                returnFaceLandmarks: true,
                // NO returnFaceAttributes - requires approval
            },
            body: {
                url: imageUrl1
            }
        });
        if (detectResponse1.status !== '200') {
            console.error(`Face detection failed for image 1: ${detectResponse1.status}`, detectResponse1.body);
            return null;
        }
        const faces1 = detectResponse1.body;
        if (!faces1 || faces1.length === 0) {
            console.log(`No face detected in image 1: ${imageUrl1}`);
            return null;
        }
        // Detect face in second image (basic detection only)
        const detectResponse2 = await faceClient.path('/detect').post({
            contentType: 'application/json',
            queryParameters: {
                detectionModel: 'detection_03',
                returnFaceId: false,
                returnFaceLandmarks: true,
            },
            body: {
                url: imageUrl2
            }
        });
        if (detectResponse2.status !== '200') {
            console.error(`Face detection failed for image 2: ${detectResponse2.status}`, detectResponse2.body);
            return null;
        }
        const faces2 = detectResponse2.body;
        if (!faces2 || faces2.length === 0) {
            console.log(`No face detected in image 2: ${imageUrl2}`);
            return null;
        }
        // Compare faces based on geometry
        const score = calculateFaceSimilarity(faces1[0], faces2[0]);
        console.log(`✓ Face comparison (geometry-based): ${score}% similarity`);
        console.log(`   ⚠️  Limited accuracy - full verification requires Microsoft approval`);
        return score;
    }
    catch (error) {
        console.error('❌ Azure Face API error:', error.message);
        // Handle specific Azure errors
        const errorCode = error.code || error.response?.body?.error?.code;
        const errorMessage = error.message || error.response?.body?.error?.message;
        if (errorCode === 'InvalidImageSize' || errorMessage?.includes('image size')) {
            throw new Error('Image too small or too large. Please use a clear photo.');
        }
        if (errorCode === 'InvalidImage' || errorMessage?.includes('invalid image')) {
            throw new Error('Invalid image format. Please use JPG or PNG.');
        }
        if (errorCode === 'RateLimitExceeded' || error.response?.status === 429) {
            throw new Error('Too many verification attempts. Please try again later.');
        }
        throw new Error('Face comparison failed. Please try again.');
    }
}
/**
 * Compare verification selfie against multiple profile photos
 * Returns the highest similarity score
 * @param selfieUrl - Verification selfie URL
 * @param profilePhotoUrls - Array of profile photo URLs
 * @returns Best match score (0-100) or null if error
 */
async function compareAgainstMultiplePhotos(selfieUrl, profilePhotoUrls) {
    try {
        if (profilePhotoUrls.length === 0) {
            throw new Error('No profile photos to compare against');
        }
        console.log(`🔍 Comparing selfie against ${profilePhotoUrls.length} profile photos...`);
        console.log(`   ⚠️  Using basic face detection (limited accuracy)`);
        const scores = [];
        // Compare against each profile photo
        for (const profilePhotoUrl of profilePhotoUrls) {
            const score = await compareFaces(selfieUrl, profilePhotoUrl);
            if (score !== null) {
                scores.push(score);
            }
        }
        if (scores.length === 0) {
            console.log('❌ No valid face comparisons');
            return null;
        }
        // Return highest score
        const bestScore = Math.max(...scores);
        console.log(`✓ Best match: ${bestScore}% (from ${scores.length} comparisons)`);
        return bestScore;
    }
    catch (error) {
        console.error('❌ Multiple photo comparison error:', error.message);
        throw error;
    }
}
/**
 * Simple face detection - just check if a face exists in the image
 * Used for auto-approve verification (no comparison needed)
 * @param imageUrl - URL of image to check
 * @returns true if face detected, false otherwise
 */
async function detectFaceInImage(imageUrl) {
    try {
        if (!faceClient || !AZURE_FACE_KEY || !AZURE_FACE_ENDPOINT) {
            throw new Error('Azure Face API not configured');
        }
        console.log(`🔍 Detecting face in image: ${imageUrl.substring(0, 60)}...`);
        // Detect face (basic detection only)
        const detectResponse = await faceClient.path('/detect').post({
            contentType: 'application/json',
            queryParameters: {
                detectionModel: 'detection_03',
                returnFaceId: false,
                returnFaceLandmarks: false,
            },
            body: {
                url: imageUrl
            }
        });
        if (detectResponse.status !== '200') {
            console.error(`Face detection failed: ${detectResponse.status}`, detectResponse.body);
            return false;
        }
        const faces = detectResponse.body;
        const faceDetected = faces && faces.length > 0;
        if (faceDetected) {
            console.log(`✓ Face detected successfully (${faces.length} face(s))`);
        }
        else {
            console.log(`⚠️  No face detected in image`);
        }
        return faceDetected;
    }
    catch (error) {
        console.error('❌ Face detection error:', error.message);
        // Handle specific Azure errors
        const errorCode = error.code || error.response?.body?.error?.code;
        const errorMessage = error.message || error.response?.body?.error?.message;
        if (errorCode === 'InvalidImageSize' || errorMessage?.includes('image size')) {
            throw new Error('Image too small or too large. Please use a clear photo.');
        }
        if (errorCode === 'InvalidImage' || errorMessage?.includes('invalid image')) {
            throw new Error('Invalid image format. Please use JPG or PNG.');
        }
        if (errorCode === 'RateLimitExceeded' || error.response?.status === 429) {
            throw new Error('Too many verification attempts. Please try again later.');
        }
        throw new Error('Face detection failed. Please try again.');
    }
}
exports.default = faceClient;
//# sourceMappingURL=azureFace.js.map