import { CacheManager } from '../utils/cacheManager.js';
import { firebase } from '../firebase.js';

export class GroupService {
    // Get group by ID with caching
    static async getGroup(groupId) {
        try {
            // Try to get from cache first
            const cacheKey = `group_${groupId}`;
            const cachedGroup = await CacheManager.get('GROUPS', cacheKey);
            
            if (cachedGroup) {
                console.log(`[Group] Using cached group ${groupId}`);
                return cachedGroup;
            }
            
            // If not in cache, fetch from Firebase
            console.log(`[Group] Fetching group ${groupId} from Firebase`);
            const groupDoc = await firebase.firestore()
                .collection('groups')
                .doc(groupId)
                .get();
                
            if (!groupDoc.exists) {
                console.log(`[Group] No group found with ID ${groupId}`);
                return null;
            }
            
            const groupData = {
                id: groupDoc.id,
                ...groupDoc.data()
            };
            
            // Cache the group data
            await CacheManager.set('GROUPS', cacheKey, groupData);
            
            return groupData;
        } catch (error) {
            console.error(`[Group] Error getting group ${groupId}:`, error);
            throw error;
        }
    }
    
    // Get groups for a user with caching
    static async getUserGroups(userId) {
        try {
            const cacheKey = `user_groups_${userId}`;
            const cachedGroups = await CacheManager.get('GROUPS', cacheKey);
            
            if (cachedGroups) {
                console.log(`[Group] Using cached groups for user ${userId}`);
                return cachedGroups;
            }
            
            // If not in cache, fetch from Firebase
            console.log(`[Group] Fetching groups for user ${userId} from Firebase`);
            const snapshot = await firebase.firestore()
                .collection('groups')
                .where('members', 'array-contains', userId)
                .get();
            
            const groups = [];
            const groupPromises = [];
            
            snapshot.docs.forEach(doc => {
                const groupData = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Cache each group individually
                groupPromises.push(
                    CacheManager.set('GROUPS', `group_${doc.id}`, groupData)
                );
                
                groups.push(groupData);
            });
            
            // Cache the list of groups for this user
            groupPromises.push(
                CacheManager.set('GROUPS', cacheKey, groups)
            );
            
            await Promise.all(groupPromises);
            
            return groups;
        } catch (error) {
            console.error(`[Group] Error getting groups for user ${userId}:`, error);
            throw error;
        }
    }
    
    // Create a new group with cache invalidation
    static async createGroup(groupData) {
        try {
            // Add to Firebase
            const groupRef = await firebase.firestore()
                .collection('groups')
                .add({
                    ...groupData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Get the created group to return
            const groupDoc = await groupRef.get();
            const newGroup = {
                id: groupDoc.id,
                ...groupDoc.data()
            };
            
            // Invalidate cache for all members' group lists
            const cachePromises = groupData.members.map(memberId => 
                CacheManager.remove('GROUPS', `user_groups_${memberId}`)
            );
            
            await Promise.all(cachePromises);
            
            return newGroup;
        } catch (error) {
            console.error('[Group] Error creating group:', error);
            throw error;
        }
    }
    
    // Update group with cache invalidation
    static async updateGroup(groupId, updates) {
        try {
            // Update in Firebase
            await firebase.firestore()
                .collection('groups')
                .doc(groupId)
                .update({
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Invalidate cache for this group
            await this.invalidateGroupCache(groupId);
            
            // Return updated group
            return this.getGroup(groupId);
        } catch (error) {
            console.error(`[Group] Error updating group ${groupId}:`, error);
            throw error;
        }
    }
    
    // Add member to group with cache invalidation
    static async addGroupMember(groupId, userId) {
        try {
            // Add to Firebase
            await firebase.firestore()
                .collection('groups')
                .doc(groupId)
                .update({
                    members: firebase.firestore.FieldValue.arrayUnion(userId),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Invalidate relevant caches
            await Promise.all([
                this.invalidateGroupCache(groupId),
                CacheManager.remove('GROUPS', `user_groups_${userId}`)
            ]);
            
            return true;
        } catch (error) {
            console.error(`[Group] Error adding member ${userId} to group ${groupId}:`, error);
            throw error;
        }
    }
    
    // Remove member from group with cache invalidation
    static async removeGroupMember(groupId, userId) {
        try {
            // Remove from Firebase
            await firebase.firestore()
                .collection('groups')
                .doc(groupId)
                .update({
                    members: firebase.firestore.FieldValue.arrayRemove(userId),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Invalidate relevant caches
            await Promise.all([
                this.invalidateGroupCache(groupId),
                CacheManager.remove('GROUPS', `user_groups_${userId}`)
            ]);
            
            return true;
        } catch (error) {
            console.error(`[Group] Error removing member ${userId} from group ${groupId}:`, error);
            throw error;
        }
    }
    
    // Invalidate all caches related to a group
    static async invalidateGroupCache(groupId) {
        try {
            // Invalidate the group itself
            await CacheManager.remove('GROUPS', `group_${groupId}`);
            
            // Get the group to invalidate all members' caches
            const group = await this.getGroup(groupId);
            if (!group) return;
            
            // Invalidate group list caches for all members
            const cachePromises = group.members.map(memberId => 
                CacheManager.remove('GROUPS', `user_groups_${memberId}`)
            );
            
            await Promise.all(cachePromises);
            
            return true;
        } catch (error) {
            console.error(`[Group] Error invalidating cache for group ${groupId}:`, error);
            return false;
        }
    }
    
    // Clear all group caches (useful on logout)
    static async clearGroupCache() {
        try {
            await CacheManager.clear('GROUPS');
            return true;
        } catch (error) {
            console.error('[Group] Error clearing group cache:', error);
            return false;
        }
    }
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GroupService };
}
