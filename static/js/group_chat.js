// Enhanced Group Chat System - Add this to your group_chat.js file
// This replaces and enhances your existing code

class GroupChatManager {
    constructor(groupId) {
        this.groupId = groupId;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.messagesListener = null;
        this.eventsListener = null;
        
        this.initializeChat();
    }

    async initializeChat() {
        await this.setupMessageListener();
        await this.setupEventListener();
        this.setupMessageInput();
        this.loadInitialData();
    }

    // =============================================================================
    // REAL-TIME MESSAGING SYSTEM
    // =============================================================================

    /**
     * Set up real-time listener for messages
     */
    async setupMessageListener() {
        const messagesRef = this.db.collection('groups').doc(this.groupId).collection('messages');
        
        this.messagesListener = messagesRef
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.displayMessage(change.doc.data(), change.doc.id);
                    }
                });
            }, (error) => {
                console.error('Error listening to messages:', error);
            });
    }

    /**
     * Send text message
     */
    async sendMessage(messageText) {
        if (!messageText.trim()) return;

        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.db.collection('groups').doc(this.groupId).collection('messages').add({
                type: 'text',
                text: messageText.trim(),
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                userPhotoURL: user.photoURL || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update group's last activity
            await this.db.collection('groups').doc(this.groupId).update({
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    /**
     * Display message in chat
     */
    displayMessage(messageData, messageId) {
        const chatContent = document.querySelector('.chat-content');
        if (!chatContent) return;

        const user = this.auth.currentUser;
        const isOwnMessage = messageData.userId === user?.uid;
        const timestamp = messageData.timestamp ? 
            new Date(messageData.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Now';

        let messageHTML = '';

        if (messageData.type === 'text') {
            messageHTML = `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}" data-message-id="${messageId}">
                    <div class="message-header">
                        <span class="message-author">${messageData.userName}</span>
                        <span class="message-time">${timestamp}</span>
                    </div>
                    <div class="message-content">
                        <p>${this.escapeHtml(messageData.text)}</p>
                    </div>
                </div>
            `;
        } else if (messageData.type === 'event') {
            messageHTML = this.createEventMessageHTML(messageData, messageId);
        } else if (messageData.type === 'system') {
            messageHTML = `
                <div class="system-message" data-message-id="${messageId}">
                    <p>${this.escapeHtml(messageData.text)}</p>
                </div>
            `;
        }

        // Insert message in chronological order
        this.insertMessageInOrder(chatContent, messageHTML, messageData.timestamp);
        this.scrollToBottom();
    }

    /**
     * Set up message input handlers
     */
    setupMessageInput() {
        const messageInput = document.querySelector('.message-input');
        const sendButton = document.querySelector('.send-button');

        if (!messageInput || !sendButton) return;

        // Send on button click
        sendButton.addEventListener('click', () => {
            this.sendMessage(messageInput.value);
            messageInput.value = '';
        });

        // Send on Enter key
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(messageInput.value);
                messageInput.value = '';
            }
        });
    }

    // =============================================================================
    // ENHANCED EVENTS SYSTEM
    // =============================================================================

    /**
     * Set up real-time listener for events
     */
    async setupEventListener() {
        const eventsRef = this.db.collection('groups').doc(this.groupId).collection('events');
        
        this.eventsListener = eventsRef
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.displayEvents(snapshot.docs);
            }, (error) => {
                console.error('Error listening to events:', error);
            });
    }

    /**
     * Create new event
     */
    async createEvent(eventData) {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            // Create event document
            const eventRef = await this.db.collection('groups').doc(this.groupId).collection('events').add({
                name: eventData.name,
                description: eventData.description,
                date: eventData.date,
                time: eventData.time,
                createdBy: user.uid,
                createdByName: user.displayName || user.email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                attendees: {},
                locations: {}
            });

            // Add event message to chat
            await this.sendEventMessage(eventRef.id, eventData);

            return { success: true, eventId: eventRef.id };

        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    /**
     * Send event message to chat
     */
    async sendEventMessage(eventId, eventData) {
        const user = this.auth.currentUser;
        
        await this.db.collection('groups').doc(this.groupId).collection('messages').add({
            type: 'event',
            eventId: eventId,
            eventName: eventData.name,
            eventDescription: eventData.description,
            eventDate: eventData.date,
            eventTime: eventData.time,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    /**
     * Create event message HTML
     */
    createEventMessageHTML(messageData, messageId) {
        const user = this.auth.currentUser;
        const timestamp = messageData.timestamp ? 
            new Date(messageData.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Now';

        return `
            <div class="event-message" data-message-id="${messageId}">
                <div class="event-header">
                    <span class="event-author">${messageData.userName} created an event</span>
                    <span class="event-time">${timestamp}</span>
                </div>
                <div class="event-card">
                    <h4 class="event-title">${this.escapeHtml(messageData.eventName)}</h4>
                    <p class="event-description">${this.escapeHtml(messageData.eventDescription)}</p>
                    <div class="event-details">
                        <span class="event-date">
                            <i class="fas fa-calendar"></i> ${messageData.eventDate}
                        </span>
                        <span class="event-time-detail">
                            <i class="fas fa-clock"></i> ${messageData.eventTime}
                        </span>
                    </div>
                    <div class="event-actions">
                        <button class="event-btn join-btn" onclick="joinEvent('${messageData.eventId}')">
                            <i class="fas fa-check"></i> Join
                        </button>
                        <button class="event-btn decline-btn" onclick="declineEvent('${messageData.eventId}')">
                            <i class="fas fa-times"></i> Can't Make It
                        </button>
                        <button class="event-btn details-btn" onclick="viewEventDetails('${messageData.eventId}')">
                            <i class="fas fa-info"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Join event
     */
    async joinEvent(eventId) {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.db.collection('groups').doc(this.groupId)
                .collection('events').doc(eventId).update({
                    [`attendees.${user.uid}`]: {
                        name: user.displayName || user.email.split('@')[0],
                        status: 'attending',
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                });
            
            alert('You joined the event!');
            
        } catch (error) {
            console.error('Error joining event:', error);
            alert('Failed to join event.');
        }
    }

    /**
     * Decline event
     */
    async declineEvent(eventId) {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.db.collection('groups').doc(this.groupId)
                .collection('events').doc(eventId).update({
                    [`attendees.${user.uid}`]: {
                        name: user.displayName || user.email.split('@')[0],
                        status: 'declined',
                        respondedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                });
            
            alert('You declined the event.');
            
        } catch (error) {
            console.error('Error declining event:', error);
            alert('Failed to decline event.');
        }
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    /**
     * Display events in the event container
     */
    displayEvents(eventDocs) {
        const eventContainer = document.getElementById('eventcardcontainer');
        if (!eventContainer) return;

        // Clear existing events
        eventContainer.innerHTML = '<div id="eventcard"></div>';

        eventDocs.forEach(doc => {
            const eventData = doc.data();
            const eventHTML = this.createEventCardHTML(eventData, doc.id);
            eventContainer.insertAdjacentHTML('beforeend', eventHTML);
        });
    }

    /**
     * Create event card HTML
     */
    createEventCardHTML(eventData, eventId) {
        const attendeeCount = Object.keys(eventData.attendees || {}).length;
        
        return `
            <div class="event-standalone-card" data-event-id="${eventId}">
                <h4>${this.escapeHtml(eventData.name)}</h4>
                <p>${this.escapeHtml(eventData.description)}</p>
                <div class="event-meta">
                    <span><i class="fas fa-calendar"></i> ${eventData.date}</span>
                    <span><i class="fas fa-clock"></i> ${eventData.time}</span>
                    <span><i class="fas fa-users"></i> ${attendeeCount} attending</span>
                </div>
                <div class="event-actions">
                    <button onclick="groupChatManager.joinEvent('${eventId}')">Join</button>
                    <button onclick="groupChatManager.declineEvent('${eventId}')">Decline</button>
                    <button onclick="viewEventDetails('${eventId}')">Details</button>
                </div>
            </div>
        `;
    }

    /**
     * Insert message in chronological order
     */
    insertMessageInOrder(container, messageHTML, timestamp) {
        // For simplicity, just append to end (since we're ordering by timestamp)
        // In a more complex implementation, you'd find the correct position
        container.insertAdjacentHTML('beforeend', messageHTML);
    }

    /**
     * Scroll to bottom of chat
     */
    scrollToBottom() {
        const chatContent = document.querySelector('.chat-content');
        if (chatContent) {
            chatContent.scrollTop = chatContent.scrollHeight;
        }
    }

    /**
     * Load initial data (group info, etc.)
     */

    async loadInitialData() {
        try {
            const groupDoc = await this.db.collection('groups').doc(this.groupId).get();
            if (groupDoc.exists) {
                const groupData = groupDoc.data();
                this.updateGroupUI(groupData);
                
                // Only show creation message once, not as a system message
                // The creation message is handled by the HTML template already
            }
        } catch (error) {
            console.error('Error loading group data:', error);
        }
    }

    /**
     * Update group UI elements
     */
    updateGroupUI(groupData) {
        // Update group title
        const titleElement = document.getElementById('groupTitle');
        if (titleElement) {
            titleElement.textContent = groupData.name;
        }
    
        // Update creation message (this should only set the text, not create duplicates)
        const creationElement = document.getElementById('creationMessage');
        if (creationElement && groupData.createdBy) {
            const creator = groupData.members[groupData.createdBy];
            const creatorName = creator ? creator.name : 'Someone';
            
            // Only set if it's currently showing "Loading..."
            if (creationElement.textContent.includes('Loading')) {
                creationElement.textContent = `${creatorName} created this group "${groupData.name}"`;
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup listeners when leaving chat
     */
    cleanup() {
        if (this.messagesListener) {
            this.messagesListener();
        }
        if (this.eventsListener) {
            this.eventsListener();
        }
    }
}

// =============================================================================
// GLOBAL FUNCTIONS AND INITIALIZATION
// =============================================================================

let groupChatManager = null;

// Enhanced initialization function
function initializeGroupChat(groupId) {
    if (groupChatManager) {
        groupChatManager.cleanup();
    }
    
    groupChatManager = new GroupChatManager(groupId);
    
    // Initialize existing UI functions
    initializeToolbar();
    initializeEventCreation();
}

// Initialize toolbar
function initializeToolbar() {
    const toggleBtn = document.getElementById("toggleButton");
    const toolbar = document.getElementById("toolbar");

    if (!toggleBtn || !toolbar) return;

    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toolbar.style.display = toolbar.style.display === "flex" ? "none" : "flex";
    });

    // Close toolbar when clicking outside
    document.addEventListener("click", (e) => {
        if (toolbar.style.display === "flex" && 
            !toolbar.contains(e.target) && 
            e.target !== toggleBtn) {
            toolbar.style.display = "none";
        }
    });
}

// Initialize event creation
function initializeEventCreation() {
    const eventBtn = document.getElementById("newevent");
    const eventPopup = document.getElementById("eventpop");
    const cancelBtn = document.getElementById("cancel");
    const saveBtn = document.getElementById("save");

    if (!eventBtn || !eventPopup) return;

    // Show event popup
    eventBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        eventPopup.style.display = "inherit";
        document.getElementById("toolbar").style.display = "none";
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("eventdate").value = today;
    });

    // Cancel event creation
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            eventPopup.style.display = "none";
            clearEventForm();
        });
    }

    // Save event
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            await saveEvent();
        });
    }
}

// Enhanced save event function
async function saveEvent() {
    const eventName = document.getElementById("eventname").value.trim();
    const eventDescription = document.getElementById("eventdescription").value.trim();
    const eventDate = document.getElementById("eventdate").value;
    const eventTime = document.getElementById("eventtime").value;

    // Validate inputs
    if (!eventName) {
        alert('Please enter an event name');
        return;
    }
    if (!eventDate) {
        alert('Please select a date');
        return;
    }
    if (!eventTime) {
        alert('Please select a time');
        return;
    }

    const saveBtn = document.getElementById("save");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Creating...';

    try {
        await groupChatManager.createEvent({
            name: eventName,
            description: eventDescription,
            date: eventDate,
            time: eventTime
        });

        // Close popup and clear form
        document.getElementById("eventpop").style.display = "none";
        clearEventForm();

    } catch (error) {
        console.error('Error creating event:', error);
        alert('Failed to create event. Please try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Clear event form
function clearEventForm() {
    document.getElementById("eventname").value = "";
    document.getElementById("eventdescription").value = "";
    document.getElementById("eventdate").value = "";
    document.getElementById("eventtime").value = "";
}

// Global event functions (called from HTML)
window.joinEvent = (eventId) => groupChatManager?.joinEvent(eventId);
window.declineEvent = (eventId) => groupChatManager?.declineEvent(eventId);
window.viewEventDetails = (eventId) => {
    // Implement event details view
    console.log('View details for event:', eventId);
    alert('Event details feature coming soon!');
};