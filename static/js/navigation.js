class NavigationManager {
    constructor() {
        this.currentPath = window.location.pathname;
        this.initialized = false;
        this.navItems = [];
        this._boundHandleNewEventClick = null;
        this._boundClosePopup = this.closePopup.bind(this); // bound close

        if (window.navigationManager) {
            return window.navigationManager;
        }
        window.navigationManager = this;
    }

    init() {
        if (this.initialized) return;

        this.setupNavigation();

        const close = document.getElementById('close');
        if (close) {
            close.addEventListener('click', this._boundClosePopup);
        }

        this.initialized = true;
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length === 0) return;

        this.navItems.forEach(item => {
            item.removeEventListener('click', this.handleNavClick);
        });

        this.navItems = Array.from(navItems);
        this.navItems.forEach(item => {
            item.addEventListener('click', this.handleNavClick.bind(this));
        });

        this.updateActiveState();
    }

    handleNavClick(event) {
        const navItem = event.currentTarget;
        const page = navItem.getAttribute('data-page');

        this.setActiveNavItem(navItem);

        switch (page) {
            case 'home':
                window.location.href = '/app';
                break;
            case 'groups':
                window.location.href = '/mobile/groups';
                break;
            case 'profile':
                window.location.href = '/mobile/profile';
                break;
            case 'compass':
                window.location.href = '/mobile/explore';
                break;
            case 'create':
                this.handleCreateClick();
                break;
            default:
                break;
        }
    }

    handleCreateClick() {
        const dropdown = document.getElementById('dropdown-menu');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
            const new_event = document.getElementById('new_event');

            if (this._boundHandleNewEventClick) {
                new_event.removeEventListener('click', this._boundHandleNewEventClick);
            }

            this._boundHandleNewEventClick = this.handle_newevent_click.bind(this);
            new_event.addEventListener('click', this._boundHandleNewEventClick);
        }
    }

    async handle_newevent_click() {
        const popup = document.getElementById('groupslist');
        if (popup) {
            popup.classList.toggle('hidden');

            const dropdown = document.getElementById('dropdown-menu');
            dropdown?.classList.toggle('hidden');

            await this.loadUserGroups();
        }
    }

    closePopup() {
        const popup = document.getElementById('groupslist');
        if (popup && !popup.classList.contains('hidden')) {
            popup.classList.add('hidden');
        }
    }

    async loadUserGroups() {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.log('User not authenticated');
            this.showEmptyGroupsState();
            return;
        }

        const db = firebase.firestore();
        const groupsContainer = document.getElementById('popupgroupslist');
        const loadingElement = document.getElementById('loadingGroups');

        if (!groupsContainer) return;

        loadingElement?.style.setProperty('display', 'flex');

        try {
            const snapshot = await db.collection('groups')
                .where(`members.${currentUser.uid}`, '!=', null)
                .get();

            loadingElement?.style.setProperty('display', 'none');

            if (snapshot.empty) {
                this.showEmptyGroupsState();
                return;
            }

            groupsContainer.innerHTML = '';

            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            groups.sort((a, b) =>
                (b.lastActivity?.seconds || 0) - (a.lastActivity?.seconds || 0)
            );

            for (const group of groups) {
                const memberCount = Object.keys(group.members || {}).length;
                const lastActivity = group.lastActivity
                    ? this.formatLastActivity(group.lastActivity.toDate())
                    : 'Recently';

                const groupHTML = `
                    <a href="/mobile/group_chat?groupId=${group.id}" class="preload-link group-item">
                        <div class="group-avatar">
                            <img src="${group.avatar || '/static/images/group-placeholder.png'}" alt="Group">
                        </div>
                        <div class="group-details">
                            <h3 class="group-name">${this.escapeHtml(group.name)}</h3>
                            <p class="group-message">${memberCount} member${memberCount !== 1 ? 's' : ''}</p>
                            <p class="group-message-text">${this.escapeHtml(group.description || 'Tap to open chat')}</p>
                        </div>
                        <div class="group-meta">
                            <span class="invite-code">Code: ${group.inviteCode}</span>
                            <span class="member-count">${lastActivity}</span>
                        </div>
                    </a>
                `;

                groupsContainer.insertAdjacentHTML('beforeend', groupHTML);
            }

            console.log(`Successfully loaded ${groups.length} groups`);
        } catch (error) {
            console.error('Error loading groups:', error);
            alert('Error loading groups: ' + error.message);
            this.showEmptyGroupsState();
        }
    }

    setActiveNavItem(activeItem) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    updateActiveState() {
        const path = window.location.pathname;
        let activePage = 'home';

        if (path.includes('/groups')) activePage = 'groups';
        else if (path.includes('/profile')) activePage = 'profile';
        else if (path === '/app') activePage = 'home';
        else if (path === '/mobile/explore') activePage = 'compass';

        const activeNavItem = document.querySelector(`[data-page="${activePage}"]`);
        if (activeNavItem) {
            this.setActiveNavItem(activeNavItem);
        }
    }

    formatLastActivity(date) {
        return date.toLocaleString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEmptyGroupsState() {
        const container = document.getElementById('popupgroupsList') || document.querySelector('.group-list');
        if (container) {
            container.innerHTML = '<p class="empty-state">No groups found</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (!window.navigationManager) {
        const navManager = new NavigationManager();
        navManager.init();
    }
});