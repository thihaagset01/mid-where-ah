import { CacheManager } from '../utils/cacheManager.js';
import { firebase } from '../firebase.js';

export class ProfileService {
    // Get profile by user ID with caching
    static async getProfile(userId) {
        try {
            // Try to get from cache first
            const cacheKey = `user_${userId}`;
            const cachedProfile = await CacheManager.get('PROFILES', cacheKey);
            
            if (cachedProfile) {
                console.log(`[Profile] Using cached profile for user ${userId}`);
                return cachedProfile;
            }
            
            // If not in cache, fetch from Firebase
            console.log(`[Profile] Fetching profile for user ${userId} from Firebase`);
            const profileDoc = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .get();
                
            if (!profileDoc.exists) {
                console.log(`[Profile] No profile found for user ${userId}`);
                return null;
            }
            
            const profileData = {
                id: profileDoc.id,
                ...profileDoc.data()
            };
            
            // Cache the profile data
            await CacheManager.set('PROFILES', cacheKey, profileData);
            
            return profileData;
        } catch (error) {
            console.error(`[Profile] Error getting profile for user ${userId}:`, error);
            throw error;
        }
    }
    
    // Update profile with cache invalidation
    static async updateProfile(userId, profileData) {
        try {
            // Update in Firebase
            await firebase.firestore()
                .collection('users')
                .doc(userId)
                .update(profileData);
            
            // Invalidate cache
            const cacheKey = `user_${userId}`;
            await CacheManager.remove('PROFILES', cacheKey);
            
            // Get fresh data and update cache
            return this.getProfile(userId);
        } catch (error) {
            console.error(`[Profile] Error updating profile for user ${userId}:`, error);
            throw error;
        }
    }
    
    // Get multiple profiles by IDs with batch fetching and caching
    static async getProfiles(userIds) {
        try {
            if (!userIds || userIds.length === 0) return [];
            
            const profiles = [];
            const idsToFetch = [];
            
            // Check cache for each user
            for (const userId of [...new Set(userIds)]) { // Dedupe
                const cacheKey = `user_${userId}`;
                const cachedProfile = await CacheManager.get('PROFILES', cacheKey);
                
                if (cachedProfile) {
                    profiles.push(cachedProfile);
                } else {
                    idsToFetch.push(userId);
                }
            }
            
            // If all profiles were in cache, return them
            if (idsToFetch.length === 0) {
                console.log(`[Profile] All ${profiles.length} profiles found in cache`);
                return profiles;
            }
            
            // Fetch remaining profiles in batches (Firebase allows up to 10 in a batch)
            const BATCH_SIZE = 10;
            for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
                const batch = idsToFetch.slice(i, i + BATCH_SIZE);
                const profilesRef = firebase.firestore()
                    .collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', batch);
                    
                const snapshot = await profilesRef.get();
                
                snapshot.docs.forEach(doc => {
                    const profileData = {
                        id: doc.id,
                        ...doc.data()
                    };
                    
                    // Cache each profile
                    const cacheKey = `user_${doc.id}`;
                    CacheManager.set('PROFILES', cacheKey, profileData);
                    
                    profiles.push(profileData);
                });
            }
            
            return profiles;
        } catch (error) {
            console.error('[Profile] Error getting multiple profiles:', error);
            throw error;
        }
    }
    
    // Clear profile cache (useful on logout or when you know data is stale)
    static async clearProfileCache(userId = null) {
        try {
            if (userId) {
                const cacheKey = `user_${userId}`;
                await CacheManager.remove('PROFILES', cacheKey);
            } else {
                await CacheManager.clear('PROFILES');
            }
            return true;
        } catch (error) {
            console.error('[Profile] Error clearing profile cache:', error);
            return false;
        }
    }
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProfileService };
}
