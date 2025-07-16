/*this is for group page*/
function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            
            switch(page) {
                case 'home':
                    window.location.href = '/'
                    break;
                case 'groups':
                    window.location.href = '/groups';
                    break;
                case 'profile':
                    window.location.href = '/profile';
                    break;
                case 'compass':
                    break;
                case 'create':
                    showCreateGroupModal();
                    break;
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', function () {
    setupBottomNavigation();
});