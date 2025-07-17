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

function showCreateGroupModal(){
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('hidden');
    const text_bar = document.getElementById('text-bar');
    text_bar.classList.toggle('hidden');
}
document.addEventListener('DOMContentLoaded', function () {
    setupBottomNavigation();
});