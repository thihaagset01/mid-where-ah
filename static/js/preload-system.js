// Enhanced preloading system for "no loading" experience
class PreloadManager {
    constructor() {
        this.preloadedData = new Map();
        this.preloadQueue = new Set();
        this.isPreloading = false;
    }

    // Preload critical data based on current page
    async preloadForCurrentPage() {
        const currentPath = window.location.pathname;
        
        switch (currentPath) {
            case '/mobile/home':
                await this.preloadHomePageData();
                break;
            case '/mobile/groups':
                await this.preloadGroupsData();
                break;
            case '/mobile/group_chat':
                await this.preloadChatData();
                break;
        }
    }

    // Preload home page data
    async preloadHomePageData() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Preload user's groups
        this.preloadQueue.add('user_groups');
        // Preload recent venues
        this.preloadQueue.add('recent_venues');
        // Preload user profile
        this.preloadQueue.add('user_profile');

        await this.processPreloadQueue();
    }

    // Preload groups page data
    async preloadGroupsData() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Preload all group details
        const groups = await CacheManager.get('GROUPS', `user_groups_${user.uid}`);
        if (groups) {
            groups.forEach(group => {
                this.preloadQueue.add(`group_${group.id}`);
                this.preloadQueue.add(`group_members_${group.id}`);
            });
        }

        await this.processPreloadQueue();
    }

    // Preload chat data
    async preloadChatData() {
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('groupId');
        
        if (groupId) {
            // Preload group info
            this.preloadQueue.add(`group_${groupId}`);
            // Preload recent messages (cache last 50)
            this.preloadQueue.add(`messages_${groupId}`);
            // Preload group events
            this.preloadQueue.add(`events_${groupId}`);
        }

        await this.processPreloadQueue();
    }

    // Process the preload queue
    async processPreloadQueue() {
        if (this.isPreloading) return;
        this.isPreloading = true;

        const promises = Array.from(this.preloadQueue).map(async (item) => {
            try {
                await this.preloadItem(item);
            } catch (error) {
                console.warn(`Failed to preload ${item}:`, error);
            }
        });

        await Promise.allSettled(promises);
        this.preloadQueue.clear();
        this.isPreloading = false;
    }

    // Preload individual items
    async preloadItem(item) {
        const user = firebase.auth().currentUser;
        if (!user) return;

        if (item.startsWith('group_')) {
            const groupId = item.replace('group_', '');
            const group = await GroupService.getGroup(groupId);
            this.preloadedData.set(item, group);
        }
        else if (item.startsWith('messages_')) {
            const groupId = item.replace('messages_', '');
            await this.preloadMessages(groupId);
        }
        else if (item.startsWith('events_')) {
            const groupId = item.replace('events_', '');
            await this.preloadEvents(groupId);
        }
        else if (item === 'user_groups') {
            const groups = await GroupService.getUserGroups(user.uid);
            this.preloadedData.set(item, groups);
        }
    }

    // Preload recent messages
    async preloadMessages(groupId) {
        try {
            const messages = await firebase.firestore()
                .collection('groups')
                .doc(groupId)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            const messageData = messages.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            await CacheManager.set('MESSAGES', `recent_${groupId}`, messageData, 2 * 60 * 1000); // 2 min cache
            this.preloadedData.set(`messages_${groupId}`, messageData);
        } catch (error) {
            console.warn(`Failed to preload messages for ${groupId}:`, error);
        }
    }

    // Preload events
    async preloadEvents(groupId) {
        try {
            const events = await firebase.firestore()
                .collection('groups')
                .doc(groupId)
                .collection('events')
                .where('date', '>=', new Date().toISOString().split('T')[0])
                .orderBy('date', 'asc')
                .get();

            const eventData = events.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            await CacheManager.set('EVENTS', `upcoming_${groupId}`, eventData, 10 * 60 * 1000); // 10 min cache
            this.preloadedData.set(`events_${groupId}`, eventData);
        } catch (error) {
            console.warn(`Failed to preload events for ${groupId}:`, error);
        }
    }

    // Get preloaded data
    getPreloadedData(key) {
        return this.preloadedData.get(key);
    }
}

// Enhanced Navigation with preloading
class FastNavigation {
    constructor() {
        this.preloadManager = new PreloadManager();
        this.setupLinkPreloading();
    }

    // Setup link hover preloading
    setupLinkPreloading() {
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                this.preloadForPage(link.href);
            }
        });

        // Also preload on touch start for mobile
        document.addEventListener('touchstart', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                this.preloadForPage(link.href);
            }
        });
    }

    // Check if link is internal
    isInternalLink(href) {
        return href.startsWith(window.location.origin) || href.startsWith('/');
    }

    // Preload data for a specific page
    async preloadForPage(href) {
        const url = new URL(href, window.location.origin);
        const path = url.pathname;

        if (path.includes('/group_chat')) {
            const groupId = url.searchParams.get('groupId');
            if (groupId) {
                await this.preloadManager.preloadItem(`group_${groupId}`);
                await this.preloadManager.preloadItem(`messages_${groupId}`);
            }
        }
        else if (path.includes('/groups')) {
            const user = firebase.auth().currentUser;
            if (user) {
                await this.preloadManager.preloadItem('user_groups');
            }
        }
    }

    // Fast navigation with preloaded data
    async navigateTo(href) {
        // Show instant loading state
        this.showInstantLoader();

        // Get preloaded data if available
        const url = new URL(href, window.location.origin);
        const preloadedData = this.getRelevantPreloadedData(url);

        // Navigate immediately
        window.location.href = href;

        // If we have preloaded data, inject it immediately on the new page
        if (preloadedData) {
            this.injectPreloadedData(preloadedData);
        }
    }

    // Show instant minimal loader
    showInstantLoader() {
        const loader = document.createElement('div');
        loader.id = 'instant-loader';
        loader.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #8B5DB8 0%, #E91E63 100%); z-index: 9999; animation: loading 1s ease-in-out infinite;">
            </div>
        `;
        document.body.appendChild(loader);
    }

    // Get relevant preloaded data for URL
    getRelevantPreloadedData(url) {
        const path = url.pathname;
        
        if (path.includes('/group_chat')) {
            const groupId = url.searchParams.get('groupId');
            return {
                group: this.preloadManager.getPreloadedData(`group_${groupId}`),
                messages: this.preloadManager.getPreloadedData(`messages_${groupId}`)
            };
        }
        
        return null;
    }
}

// Enhanced Page Loading
class InstantPageLoader {
    constructor() {
        this.fastNav = new FastNavigation();
        this.setupInstantLoading();
    }

    setupInstantLoading() {
        // Override page initialization to use cached data first
        const originalDOMContentLoaded = window.addEventListener;
        
        window.addEventListener = function(event, handler, ...args) {
            if (event === 'DOMContentLoaded') {
                const enhancedHandler = async () => {
                    // Check for cached data first
                    await this.loadFromCache();
                    // Then run original handler
                    handler();
                    // Preload for current page
                    await this.fastNav.preloadManager.preloadForCurrentPage();
                };
                originalDOMContentLoaded.call(window, event, enhancedHandler, ...args);
            } else {
                originalDOMContentLoaded.call(window, event, handler, ...args);
            }
        }.bind(this);
    }

    // Load from cache immediately
    async loadFromCache() {
        const path = window.location.pathname;
        
        if (path.includes('/group_chat')) {
            await this.loadChatFromCache();
        }
        else if (path.includes('/groups')) {
            await this.loadGroupsFromCache();
        }
    }

    // Load chat from cache
    async loadChatFromCache() {
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('groupId');
        
        if (groupId) {
            // Load cached messages immediately
            const cachedMessages = await CacheManager.get('MESSAGES', `recent_${groupId}`);
            if (cachedMessages && window.groupChatManager) {
                this.renderCachedMessages(cachedMessages);
            }
        }
    }

    // Render cached messages immediately
    renderCachedMessages(messages) {
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) return;

        // Clear loading state
        chatContent.innerHTML = '';

        // Render cached messages
        messages.reverse().forEach(message => {
            if (window.groupChatManager) {
                window.groupChatManager.displayMessage(message, message.id);
            }
        });

        // Add indicator that real-time is loading
        const indicator = document.createElement('div');
        indicator.className = 'real-time-loading';
        indicator.innerHTML = '<small style="opacity: 0.7;">Connecting to live chat...</small>';
        chatContent.appendChild(indicator);

        // Remove indicator when real-time connects
        setTimeout(() => {
            const indicator = document.querySelector('.real-time-loading');
            if (indicator) indicator.remove();
        }, 1000);
    }
}

// Initialize the instant loading system
const instantLoader = new InstantPageLoader();

// Export for use in other modules
window.PreloadManager = PreloadManager;
window.FastNavigation = FastNavigation;