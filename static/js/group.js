class GroupCreationManager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
    }

    /**
     * Create a new group and save to Firestore
     */
    async createGroup(groupData) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) throw new Error('User not authenticated');

            // Generate unique invite code
            const inviteCode = this.generateInviteCode();
            
            // Create group document
            const groupDoc = {
                name: groupData.name.trim(),
                description: groupData.description || '',
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Members object with creator as admin
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

            // Save to Firestore
            const groupRef = await this.db.collection('groups').add(groupDoc);
            console.log('Group created with ID:', groupRef.id);

            // Create initial system message
            await this.addSystemMessage(groupRef.id, `${currentUser.displayName || currentUser.email} created this group "${groupData.name}"`);

            return {
                success: true,
                groupId: groupRef.id,
                inviteCode: inviteCode,
                message: 'Group created successfully!'
            };

        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    }

    generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async addSystemMessage(groupId, messageText) {
        await this.db.collection('groups').doc(groupId)
            .collection('messages').add({
                text: messageText,
                type: 'system',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    }
}



function showCreateGroupModal(event){
    if (event) {
        event.stopPropagation(); // Prevent immediate propagation to document
    }
    
    const menu = document.getElementById('dropdown-menu');
    const text_bar = document.getElementById('text-bar');
    
    // Toggle visibility
    menu.classList.toggle('hidden');
    if (text_bar) {
        text_bar.classList.toggle('hidden');
    }
    
    // Add click-outside-to-close handler if menu is visible
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeCreateGroupModal);
        }, 10);
    } else {
        document.removeEventListener('click', closeCreateGroupModal);
    }
}

function closeCreateGroupModal(event) {
    const menu = document.getElementById('dropdown-menu');
    const text_bar = document.getElementById('text-bar');
    const createButton = document.querySelector('.nav-item[data-page="create"]');
    
    // If clicking outside the menu and not on the create button
    if (!menu.contains(event.target) && event.target !== createButton && !createButton.contains(event.target)) {
        menu.classList.add('hidden');
        text_bar.classList.add('hidden');
        document.removeEventListener('click', closeCreateGroupModal);
    }
}
