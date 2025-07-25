// =============================================================================
// JavaScript: Group Invitation Functionality (group-invitation.js)
// Add this as a new JS file: static/js/group-invitation.js
// =============================================================================

/**
 * Group Invitation Manager
 */
class GroupInvitationManager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
    }

    /**
     * Join group using invite code (via Flask API)
     */
    async joinGroupByCode(inviteCode) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('Please log in to join a group');
            }

            // Get the user's ID token for authentication
            const idToken = await currentUser.getIdToken();

            // Call your Flask API endpoint
            const response = await fetch('/api/join-group-by-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                credentials: 'include', // Include cookies for session management
                body: JSON.stringify({
                    inviteCode: inviteCode.toUpperCase()
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to join group');
            }

            return result;

        } catch (error) {
            console.error('Error joining group:', error);
            throw error;
        }
    }

    /**
     * Fallback method: Join group using direct Firestore (original method)
     */
    async joinGroupByCodeFallback(inviteCode) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('Please log in to join a group');
            }

            // Find group by invite code
            const groupQuery = await this.db.collection('groups')
                .where('inviteCode', '==', inviteCode.toUpperCase())
                .limit(1)
                .get();

            if (groupQuery.empty) {
                throw new Error('Invalid invite code. Please check and try again.');
            }

            const groupDoc = groupQuery.docs[0];
            const groupData = groupDoc.data();
            const groupId = groupDoc.id;

            // Check if user is already a member
            if (groupData.members && groupData.members[currentUser.uid]) {
                return {
                    success: true,
                    alreadyMember: true,
                    groupId: groupId,
                    groupName: groupData.name,
                    message: `You're already a member of "${groupData.name}"`
                };
            }

            // Add user to group
            const memberData = {
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email,
                photoURL: currentUser.photoURL || null,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'member',
                status: 'active'
            };

            await this.db.collection('groups').doc(groupId).update({
                [`members.${currentUser.uid}`]: memberData,
                memberCount: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add system message
            await this.addSystemMessage(groupId, `${memberData.name} joined the group`);

            return {
                success: true,
                groupId: groupId,
                groupName: groupData.name,
                message: `Welcome to "${groupData.name}"!`
            };

        } catch (error) {
            console.error('Error joining group:', error);
            throw error;
        }
    }

    async addSystemMessage(groupId, messageText) {
        await this.db.collection('groups').doc(groupId)
            .collection('messages').add({
                text: messageText,
                type: 'system',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    }

    /**
     * Generate shareable invite link
     */
    generateInviteLink(inviteCode) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/join/${inviteCode}`;
    }

    /**
     * Share invite link using Web Share API or clipboard
     */
    async shareInvite(groupId) {
        try {
            // Get group data
            const groupDoc = await this.db.collection('groups').doc(groupId).get();
            if (!groupDoc.exists) {
                throw new Error('Group not found');
            }

            const groupData = groupDoc.data();
            const inviteLink = this.generateInviteLink(groupData.inviteCode);
            const shareText = `Join "${groupData.name}" on MidWhereAh!\n\nInvite Code: ${groupData.inviteCode}\nOr use this link: ${inviteLink}`;

            // Try Web Share API first (mobile)
            if (navigator.share) {
                await navigator.share({
                    title: `Join ${groupData.name}`,
                    text: shareText,
                    url: inviteLink
                });
                return { success: true, method: 'share' };
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(shareText);
                return { success: true, method: 'clipboard' };
            }

        } catch (error) {
            console.error('Error sharing invite:', error);
            throw error;
        }
    }
}

// Update the handleJoinGroup function to use Flask API with fallback
async function handleJoinGroup() {
    const input = document.getElementById('inviteCodeInput');
    const joinBtn = document.getElementById('submitJoinGroup');
    
    if (!input || !joinBtn) return;
    
    const inviteCode = input.value.trim().toUpperCase();
    
    if (!inviteCode) {
        alert('Please enter an invite code');
        input.focus();
        return;
    }
    
    if (inviteCode.length !== 6) {
        alert('Invite code must be 6 characters');
        input.focus();
        return;
    }
    
    const originalText = joinBtn.innerHTML;
    joinBtn.disabled = true;
    joinBtn.innerHTML = '<span class="spinner"></span>Joining...';
    
    try {
        console.log('Attempting to join group with code:', inviteCode);
        const inviteManager = new GroupInvitationManager();
        
        let result;
        try {
            // Try Flask API first
            result = await inviteManager.joinGroupByCode(inviteCode);
        } catch (apiError) {
            console.warn('Flask API failed, trying Firestore fallback:', apiError);
            // If Flask API fails, try direct Firestore approach
            result = await inviteManager.joinGroupByCodeFallback(inviteCode);
        }
        
        if (result.success) {
            if (result.alreadyMember) {
                alert(result.message);
            } else {
                alert(result.message);
            }
            
            closeJoinGroupModal();
            
            if (typeof loadUserGroups === 'function') {
                console.log('Refreshing groups list after join');
                await loadUserGroups();
            }
            
            setTimeout(() => {
                window.location.href = `/mobile/group_chat?groupId=${result.groupId}`;
            }, 1500);
        }
        
    } catch (error) {
        console.error('Error joining group:', error);
        
        // Better error messages based on error type
        let userMessage = 'Error joining group: ';
        if (error.message.includes('Missing or insufficient permissions')) {
            userMessage += 'Permission denied. Please check your Firestore security rules.';
        } else if (error.message.includes('Invalid invite code')) {
            userMessage += 'Invalid invite code. Please check the code and try again.';
        } else {
            userMessage += error.message;
        }
        
        alert(userMessage);
    } finally {
        joinBtn.disabled = false;
        joinBtn.innerHTML = originalText;
    }
}

// =============================================================================
// Join Group Modal Functions
// =============================================================================

/**
 * Show join group modal
 */
function showJoinGroupModal(event) {
    if (event) {
        event.stopPropagation();
    }
    
    const overlay = document.getElementById('joinGroupOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        
        // Clear previous input
        const input = document.getElementById('inviteCodeInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
        
        // Add event listener for join button
        const joinBtn = document.getElementById('submitJoinGroup');
        if (joinBtn) {
            joinBtn.onclick = handleJoinGroup;
        }
        
        // Handle enter key in input
        if (input) {
            input.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    handleJoinGroup();
                }
            };
        }
    }
}

/**
 * Close join group modal
 */
function closeJoinGroupModal() {
    const overlay = document.getElementById('joinGroupOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// =============================================================================
// Share Invite Functions (for existing group members)
// =============================================================================

/**
 * Copy group invite code to clipboard
 */
async function copyInviteCode(groupId) {
    try {
        const db = firebase.firestore();
        const groupDoc = await db.collection('groups').doc(groupId).get();
        
        if (!groupDoc.exists) {
            throw new Error('Group not found');
        }
        
        const groupData = groupDoc.data();
        const inviteText = `Join "${groupData.name}" on MidWhereAh!\n\nInvite Code: ${groupData.inviteCode}`;
        
        await navigator.clipboard.writeText(inviteText);
        showToast('Invite code copied to clipboard!', 'success');
        
    } catch (error) {
        console.error('Error copying invite code:', error);
        showToast('Error copying invite code', 'error');
    }
}

/**
 * Share group invite
 */
async function shareGroupInvite(groupId) {
    try {
        const inviteManager = new GroupInvitationManager();
        const result = await inviteManager.shareInvite(groupId);
        
        if (result.success) {
            if (result.method === 'clipboard') {
                showToast('Invite details copied to clipboard!', 'success');
            } else {
                showToast('Invite shared successfully!', 'success');
            }
        }
        
    } catch (error) {
        console.error('Error sharing invite:', error);
        showToast('Error sharing invite: ' + error.message, 'error');
    }
}

// =============================================================================
// URL-based Group Joining (for invite links)
// =============================================================================

/**
 * Handle joining group from URL parameter
 * Call this on page load if there's an invite code in the URL
 */
function handleInviteFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite') || urlParams.get('code');
    
    if (inviteCode) {
        // Auto-fill the join modal with the invite code
        const input = document.getElementById('inviteCodeInput');
        if (input) {
            input.value = inviteCode.toUpperCase();
        }
        
        // Show join modal
        showJoinGroupModal();
        
        // Clean up URL
        const newURL = window.location.pathname;
        window.history.replaceState({}, document.title, newURL);
    }
}

/**
 * Handle direct invite link (e.g., /join/ABC123)
 */
async function handleDirectInviteLink() {
    const path = window.location.pathname;
    const inviteMatch = path.match(/\/join\/([A-Z0-9]{6})/);
    
    if (inviteMatch) {
        const inviteCode = inviteMatch[1];
        
        // Check if user is logged in
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // Auto-join the group
                try {
                    showToast('Joining group...', 'info');
                    
                    const inviteManager = new GroupInvitationManager();
                    const result = await inviteManager.joinGroupByCode(inviteCode);
                    
                    if (result.success) {
                        showToast(result.message, 'success');
                        
                        // Redirect to group chat
                        setTimeout(() => {
                            window.location.href = `/mobile/group_chat?groupId=${result.groupId}`;
                        }, 2000);
                    }
                    
                } catch (error) {
                    console.error('Error auto-joining group:', error);
                    showToast('Error joining group: ' + error.message, 'error');
                    
                    // Redirect to groups page
                    setTimeout(() => {
                        window.location.href = '/groups';
                    }, 3000);
                }
            } else {
                // Redirect to login with invite code preserved
                window.location.href = `/login?invite=${inviteCode}`;
            }
        });
    }
}

// =============================================================================
// Group Chat Integration (for existing groups)
// =============================================================================

/**
 * Add invite button to group chat interface
 * Call this function in your group chat page
 */
function addInviteButtonToGroupChat(groupId) {
    // Check if user is admin or has invite permissions
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        
        try {
            const db = firebase.firestore();
            const groupDoc = await db.collection('groups').doc(groupId).get();
            
            if (!groupDoc.exists) return;
            
            const groupData = groupDoc.data();
            const userMember = groupData.members[user.uid];
            
            if (!userMember) return;
            
            // Add invite button to chat header or toolbar
            const inviteButtonHTML = `
                <button class="invite-btn" onclick="shareGroupInvite('${groupId}')" title="Invite friends">
                    <i class="fas fa-user-plus"></i>
                </button>
            `;
            
            // Find a suitable place to add the button (e.g., chat header)
            const chatHeader = document.querySelector('.chat-header');
            if (chatHeader) {
                chatHeader.insertAdjacentHTML('beforeend', inviteButtonHTML);
            }
            
        } catch (error) {
            console.error('Error adding invite button:', error);
        }
    });
}

// =============================================================================
// Initialization
// =============================================================================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Handle invite from URL parameters
    handleInviteFromURL();
    
    // Handle direct invite links
    handleDirectInviteLink();
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        const overlay = document.getElementById('joinGroupOverlay');
        const modal = document.querySelector('.join-group-modal');
        
        if (overlay && !overlay.classList.contains('hidden') && 
            e.target === overlay && !modal.contains(e.target)) {
            closeJoinGroupModal();
        }
    });
});

// Make functions globally available
window.showJoinGroupModal = showJoinGroupModal;
window.closeJoinGroupModal = closeJoinGroupModal;
window.copyInviteCode = copyInviteCode;
window.shareGroupInvite = shareGroupInvite;
window.addInviteButtonToGroupChat = addInviteButtonToGroupChat;