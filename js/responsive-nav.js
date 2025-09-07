/**
 * Responsive Navigation JavaScript
 * Handles mobile menu functionality and navigation interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize responsive navigation
    initResponsiveNavigation();
});

function initResponsiveNavigation() {
    // Handle navigation link clicks
    const navLinks = document.querySelectorAll('.nav-link[data-event-bound="true"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            handleNavLinkClick(this, navLinks);
        });
    });
    
    // Handle logout confirmation
    window.confirmLogout = function() {
        handleLogout();
    };
    
    // Auto-hide mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        handleOutsideClick(e);
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        handleWindowResize();
    });
    
    // Handle escape key to close mobile menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });
}

function handleNavLinkClick(clickedLink, allNavLinks) {
    // Remove active class from all nav links
    allNavLinks.forEach(navLink => navLink.classList.remove('active'));
    
    // Add active class to clicked link
    clickedLink.classList.add('active');
    
    // Close mobile menu if open
    closeMobileMenu();
    
    // Add smooth scroll effect for anchor links
    const href = clickedLink.getAttribute('href');
    if (href && href.startsWith('#')) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}

function handleLogout() {
    // Show confirmation dialog
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        // Show loading state
        showLogoutLoading();
        
        // Call Firebase logout function
        if (window.authModule && typeof window.authModule.signOut === 'function') {
            window.authModule.signOut()
                .then(() => {
                    // Clear all localStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = '../../index.html';
                    }, 500);
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    // Still redirect even if logout fails
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '../../index.html';
                });
        } else {
            // Fallback if authModule is not available
            localStorage.clear();
            sessionStorage.clear();
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 500);
        }
    }
}

function showLogoutLoading() {
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'logout-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="logout-loading-content">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">กำลังออกจากระบบ...</span>
            </div>
            <p class="mt-3">กำลังออกจากระบบ...</p>
        </div>
    `;
    
    // Add styles
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    document.body.appendChild(loadingOverlay);
}

function handleOutsideClick(e) {
    const navbar = document.querySelector('.navbar');
    const navbarCollapse = document.getElementById('navbarNav');
    
    if (!navbar.contains(e.target) && navbarCollapse && navbarCollapse.classList.contains('show')) {
        closeMobileMenu();
    }
}

function handleWindowResize() {
    const navbarCollapse = document.getElementById('navbarNav');
    if (window.innerWidth > 991.98 && navbarCollapse && navbarCollapse.classList.contains('show')) {
        closeMobileMenu();
    }
}

function closeMobileMenu() {
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
            toggle: false
        });
        bsCollapse.hide();
    }
}

// Utility function to update active navigation based on current page
function updateActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link[data-event-bound="true"]');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href.replace('#', ''))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Export functions for external use
window.ResponsiveNav = {
    closeMobileMenu,
    updateActiveNavigation,
    handleLogout
};
