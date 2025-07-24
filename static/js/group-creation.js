// =============================================================================
// Group Creation Functionality
// File: static/js/group-creation.js
// =============================================================================

/**
 * Group Creation Manager
 */
class GroupCreationManager {
    constructor() {
        // Enhanced Firebase initialization checks
        if (!window.firebase) {
            console.error('Firebase not loaded. Make sure Firebase scripts are loaded before this script.');
            throw new Error('Firebase not available');
        }
        
        try {
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            console.log('GroupCreationManager initialized successfully');
        } catch (error) {
            console.error('Error initializing GroupCreationManager:', error);
            throw error;
        }
    }

    async createGroup(groupData) {
        console.log('Starting group creation with data:', groupData);
        
        try {
            // Enhanced user authentication check
            const currentUser = this.auth.currentUser;
            console.log('Current user:', currentUser ? currentUser.email : 'No user');
            
            if (!currentUser) {
                console.error('No authenticated user found');
                throw new Error('User not authenticated. Please log in and try again.');
            }

            // Enhanced user data validation
            if (!currentUser.email) {
                console.error('User email not available');
                throw new Error('User email not available. Please log out and log in again.');
            }

            // Generate invite code
            const inviteCode = this.generateInviteCode();
            console.log('Generated invite code:', inviteCode);
            
            // Enhanced group document creation
            const groupDoc = {
                name: groupData.name.trim(),
                description: groupData.description || '',
                category: groupData.category || 'general',
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                
                members: {
                    [currentUser.uid]: {
                        name: currentUser.displayName || currentUser.email.split('@')[0],
                        email: currentUser.email,
                        photoURL: currentUser.photoURL || null,
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        role: 'admin',
                        status: 'active'
                    }
                },
                
                inviteCode: inviteCode,
                status: 'active',
                memberCount: 1,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('Attempting to create group document:', groupDoc);

            // Enhanced Firestore write with better error handling
            let groupRef;
            try {
                groupRef = await this.db.collection('groups').add(groupDoc);
                console.log('Group document created successfully with ID:', groupRef.id);
            } catch (firestoreError) {
                console.error('Firestore write error:', firestoreError);
                console.error('Error code:', firestoreError.code);
                console.error('Error message:', firestoreError.message);
                
                // Provide user-friendly error messages
                if (firestoreError.code === 'permission-denied') {
                    throw new Error('Permission denied. Please check your Firestore security rules.');
                } else if (firestoreError.code === 'unavailable') {
                    throw new Error('Database temporarily unavailable. Please try again.');
                } else if (firestoreError.code === 'invalid-argument') {
                    throw new Error('Invalid data provided. Please check your input.');
                } else {
                    throw new Error(`Database error: ${firestoreError.message}`);
                }
            }

            // Enhanced system message creation
            try {
                await this.addSystemMessage(groupRef.id, `${currentUser.displayName || currentUser.email} created this group "${groupData.name}"`);
                console.log('System message added successfully');
            } catch (messageError) {
                console.warn('Failed to add system message:', messageError);
                // Don't fail the entire operation for this
            }

            const result = {
                success: true,
                groupId: groupRef.id,
                inviteCode: inviteCode,
                message: 'Group created successfully!'
            };
            
            console.log('Group creation completed successfully:', result);
            return result;

        } catch (error) {
            console.error('Group creation failed:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        console.log('Generated invite code:', code);
        return code;
    }

    async addSystemMessage(groupId, messageText) {
        try {
            console.log('Adding system message to group:', groupId, messageText);
            await this.db.collection('groups').doc(groupId)
                .collection('messages').add({
                    text: messageText,
                    type: 'system',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            console.log('System message added successfully');
        } catch (error) {
            console.error('Error adding system message:', error);
            throw error;
        }
    }
}

// =============================================================================
// Modal Functions
// =============================================================================

function showCreateGroupModal(event) {
    if (event) {
        event.stopPropagation();
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="createGroupOverlay">
            <div class="create-group-modal">
                <div class="modal-header">
                    <h2>Create New Group</h2>
                    <button class="close-btn" onclick="closeCreateGroupModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="createGroupForm">
                        <div class="form-group">
                            <label>Group Name *</label>
                            <input type="text" id="groupNameInput" placeholder="e.g., The Biceps" 
                                   maxlength="50" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="groupDescInput" placeholder="What's this group about?" 
                                      rows="3" maxlength="200"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <select id="groupCategoryInput">
                                <option value="general">General</option>
                                <option value="food">Food & Dining</option>
                                <option value="entertainment">Entertainment</option>
                                <option value="sports">Sports & Fitness</option>
                                <option value="work">Work & Business</option>
                                <option value="social">Social Hangout</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" onclick="closeCreateGroupModal()">Cancel</button>
                    <button class="create-btn" id="submitCreateGroup">Create Group</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('createGroupModalContainer') || document.body;
    container.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('submitCreateGroup').addEventListener('click', handleCreateGroup);
    document.getElementById('createGroupOverlay').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('groupNameInput').focus();
    }, 100);
}

function closeCreateGroupModal() {
    const overlay = document.getElementById('createGroupOverlay');
    if (overlay) {
        overlay.remove();
    }
}

async function handleCreateGroup() {
    console.log('handleCreateGroup called');
    
    const nameInput = document.getElementById('groupNameInput');
    const descInput = document.getElementById('groupDescInput');
    const categoryInput = document.getElementById('groupCategoryInput');
    const submitBtn = document.getElementById('submitCreateGroup');
    
    // Enhanced input validation
    if (!nameInput) {
        console.error('Group name input not found');
        alert('Form error: Group name input not found');
        return;
    }
    
    if (!nameInput.value.trim()) {
        console.log('Empty group name provided');
        alert('Please enter a group name');
        nameInput.focus();
        return;
    }
    
    if (nameInput.value.trim().length < 2) {
        console.log('Group name too short:', nameInput.value.trim());
        alert('Group name must be at least 2 characters');
        nameInput.focus();
        return;
    }
    
    // Enhanced Firebase availability check
    if (!window.firebase) {
        console.error('Firebase not available');
        alert('Firebase not loaded. Please refresh the page and try again.');
        return;
    }
    
    if (!firebase.auth().currentUser) {
        console.error('No authenticated user');
        alert('You must be logged in to create a group. Please log in and try again.');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>Creating...';
    
    try {
        console.log('Attempting to create GroupCreationManager');
        const groupManager = new GroupCreationManager();
        
        const groupData = {
            name: nameInput.value.trim(),
            description: descInput.value.trim(),
            category: categoryInput.value
        };
        
        console.log('Calling createGroup with data:', groupData);
        const result = await groupManager.createGroup(groupData);
        
        if (result.success) {
            console.log('Group creation successful:', result);
            
            // Show success message
            alert(`Group "${nameInput.value}" created successfully!\n\nInvite Code: ${result.inviteCode}\n\nShare this code with friends!`);
            
            // Close modal
            closeCreateGroupModal();
            
            // Try to refresh groups list if available
            try {
                if (typeof loadUserGroups === 'function') {
                    console.log('Refreshing groups list');
                    await loadUserGroups();
                }
            } catch (refreshError) {
                console.warn('Could not refresh groups list:', refreshError);
            }
            
            // Enhanced redirect with fallback
            console.log('Redirecting to group chat:', result.groupId);
            
            // Option 1: Direct redirect (immediate)
            // window.location.href = `/group_chat?groupId=${result.groupId}`;
            
            // Option 2: If you prefer a delay, use this instead:
            setTimeout(() => {
                window.location.href = `/mobile/group_chat?groupId=${result.groupId}`;
            }, 1000);
        }
        
    } catch (error) {
        console.error('Detailed error in handleCreateGroup:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Show user-friendly error message
        let userMessage = 'Error creating group: ';
        if (error.message.includes('permission-denied')) {
            userMessage += 'You don\'t have permission to create groups. Please contact support.';
        } else if (error.message.includes('unavailable')) {
            userMessage += 'Service temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('not authenticated')) {
            userMessage += 'Please log out and log back in, then try again.';
        } else {
            userMessage += error.message;
        }
        
        alert(userMessage);
    } finally {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// =============================================================================
// Load User Groups
// =============================================================================

async function loadUserGroups() {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.log('User not authenticated');
            showEmptyGroupsState();
            return;
        }

        const db = firebase.firestore();
        const groupsContainer = document.getElementById('groupsList') || document.querySelector('.group-list');
        const loadingElement = document.getElementById('loadingGroups');
        
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        // FIXED QUERY: Remove the orderBy to avoid index requirement
        // We'll sort in JavaScript instead
        const groupsSnapshot = await db.collection('groups')
            .where(`members.${currentUser.uid}`, '!=', null)
            .get();

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (!groupsContainer) return;

        if (groupsSnapshot.empty) {
            showEmptyGroupsState();
            return;
        }

        groupsContainer.innerHTML = '';

        // Convert to array and sort by lastActivity in JavaScript
        const groups = [];
        groupsSnapshot.forEach(doc => {
            const group = doc.data();
            group.id = doc.id;
            groups.push(group);
        });

        // Sort by lastActivity (most recent first)
        groups.sort((a, b) => {
            const aTime = a.lastActivity ? a.lastActivity.seconds : 0;
            const bTime = b.lastActivity ? b.lastActivity.seconds : 0;
            return bTime - aTime;
        });

        // Render sorted groups
        groups.forEach(group => {
            const memberCount = Object.keys(group.members || {}).length;
            const lastActivity = group.lastActivity ? 
                formatLastActivity(group.lastActivity.toDate()) : 
                'Recently';
            
            const groupHTML = `
                <a href="/mobile/group_chat?groupId=${group.id}" class="group-item">
                    <div class="group-avatar">
                        <img src="${group.avatar || '/static/images/group-placeholder.png'}" alt="Group">
                    </div>
                    <div class="group-details">
                        <h3 class="group-name">${escapeHtml(group.name)}</h3>
                        <p class="group-message">${memberCount} member${memberCount !== 1 ? 's' : ''}</p>
                        <p class="group-message-text">${escapeHtml(group.description || 'Tap to open chat')}</p>
                    </div>
                    <div class="group-meta">
                        <span class="invite-code">Code: ${group.inviteCode}</span>
                        <span class="member-count">${lastActivity}</span>
                    </div>
                </a>
            `;
            
            groupsContainer.insertAdjacentHTML('beforeend', groupHTML);
        });

        console.log(`Successfully loaded ${groups.length} groups`);

    } catch (error) {
        console.error('Error loading groups:', error);
        alert('Error loading groups: ' + error.message);
        showEmptyGroupsState();
    }
}

function showEmptyGroupsState() {
    const groupsContainer = document.getElementById('groupsList') || document.querySelector('.group-list');
    const loadingElement = document.getElementById('loadingGroups');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    if (!groupsContainer) return;
    
    groupsContainer.innerHTML = `
        <div class="empty-groups">
            <div class="empty-groups-icon">
                <i class="fas fa-comments"></i>
            </div>
            <p class="empty-groups-text">
                No groups yet! Create your first group to start planning amazing meetups with friends.
            </p>
            <button class="start-group-btn" onclick="showCreateGroupModal()">
                <i class="fas fa-plus"></i> Create Your First Group
            </button>
        </div>
    `;
}

// =============================================================================
// Utility Functions
// =============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatLastActivity(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Group creation script loaded, current path:', window.location.pathname);
    
    // Wait for Firebase Auth to be ready
    firebase.auth().onAuthStateChanged((user) => {
        const currentPath = window.location.pathname;
        console.log('Auth state changed, user:', user ? user.email : 'no user', 'path:', currentPath);
        
        // FIXED: Check for both /groups and /mobile/groups paths
        if (user && (currentPath === '/groups' || currentPath === '/mobile/groups')) {
            console.log('Loading groups for authenticated user on groups page');
            loadUserGroups();
        } else if (!user && (currentPath === '/groups' || currentPath === '/mobile/groups')) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/login';
        }
    });
    
    // Add some debugging
    console.log('Available elements:');
    console.log('- groupsList:', !!document.getElementById('groupsList'));
    console.log('- group-list class:', !!document.querySelector('.group-list'));
    console.log('- loadingGroups:', !!document.getElementById('loadingGroups'));
});

// Make functions globally available
window.showCreateGroupModal = showCreateGroupModal;
window.closeCreateGroupModal = closeCreateGroupModal;
window.loadUserGroups = loadUserGroups;