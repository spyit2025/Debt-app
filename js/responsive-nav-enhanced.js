/**
 * Enhanced Responsive Navigation JavaScript
 * Handles mobile menu functionality and navigation interactions
 * Supports both desktop and mobile navigation
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize responsive navigation
    initResponsiveNavigation();
    
    // Setting up immediate navigation handlers
    setupNavigationHandlers();
});

function initResponsiveNavigation() {
    // Handle mobile menu toggle
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    
    if (mobileMenuButton && mobileNavMenu) {
        // Handle mobile menu state changes
        mobileNavMenu.addEventListener('show.bs.collapse', function() {
            mobileMenuButton.setAttribute('aria-expanded', 'true');
            mobileMenuButton.classList.remove('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-times"></i>';
            // Add body class to prevent scrolling when menu is open
            document.body.classList.add('mobile-menu-open');
        });
        
        mobileNavMenu.addEventListener('hide.bs.collapse', function() {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
            // Remove body class to allow scrolling
            document.body.classList.remove('mobile-menu-open');
        });
    }
    
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
    
    // Handle clicks outside mobile menu
    document.addEventListener('click', function(e) {
        handleOutsideClick(e);
    });
    
    // Handle swipe gestures on mobile
    handleSwipeGestures();
}

function setupNavigationHandlers() {
    // Add click handlers to all navigation links (both desktop and mobile)
    const navLinks = document.querySelectorAll('.nav-link[data-event-bound="true"]');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Close mobile menu if open - immediate close
            closeMobileMenu();
            
            // Handle navigation
            const href = this.getAttribute('href');
            if (window.handleNavigation) {
                window.handleNavigation(href);
            }
        });
    });
}

function handleWindowResize() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    if (window.innerWidth >= 768 && mobileNavMenu && mobileNavMenu.classList.contains('show')) {
        closeMobileMenu();
    }
}

function handleOutsideClick(e) {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu && mobileMenuButton && 
        !mobileNavMenu.contains(e.target) && 
        !mobileMenuButton.contains(e.target) &&
        mobileNavMenu.classList.contains('show')) {
        closeMobileMenu();
    }
}

function closeMobileMenu() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu) {
        // Force close the menu regardless of current state
        if (mobileNavMenu.classList.contains('show')) {
            try {
                // Use Bootstrap's collapse instance if available
                const collapseInstance = bootstrap.Collapse.getInstance(mobileNavMenu);
                if (collapseInstance) {
                    // Dispose the instance first to avoid conflicts
                    collapseInstance.dispose();
                }
            } catch (e) {
                // Bootstrap collapse instance error - ignore
            }
            
            // Force close with direct CSS manipulation
            mobileNavMenu.classList.remove('show', 'collapsing');
            mobileNavMenu.classList.add('collapse');
            mobileNavMenu.style.display = 'none';
        }
        
        // Always update button state to ensure consistency
        if (mobileMenuButton) {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
        }
        
        // Remove body class
        document.body.classList.remove('mobile-menu-open');
        
        // Force remove show class if still present
        mobileNavMenu.classList.remove('show', 'collapsing');
        mobileNavMenu.classList.add('collapse');
    }
}

function handleSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', function(e) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
        
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Check if it's a horizontal swipe (not vertical scroll)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            const mobileNavMenu = document.getElementById('mobileNavMenu');
            
            // Swipe left to close menu
            if (diffX > 0 && mobileNavMenu && mobileNavMenu.classList.contains('show')) {
                closeMobileMenu();
            }
        }
    });
}

// Function to confirm logout with notification
function confirmLogout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        // Close mobile menu if open
        closeMobileMenu();
        
        // Show success notification before logout
        if (typeof showToast === 'function') {
            showToast('กำลังออกจากระบบ...', 'info');
        }
        
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

// Utility function to update active navigation based on current section
function updateActiveNavigation() {
    const currentHash = window.location.hash || '#dashboard';
    const navLinks = document.querySelectorAll('.nav-link[data-event-bound="true"]');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentHash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Function to sync user name between desktop and mobile
function syncUserName() {
    const userNameDesktop = document.getElementById('userName');
    const userNameMobile = document.getElementById('userNameMobile');
    
    if (userNameDesktop && userNameMobile) {
        userNameMobile.textContent = userNameDesktop.textContent;
    }
}

// Function to handle navigation with smooth scrolling
function handleNavigationWithSmoothScroll(href) {
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

// Initialize user name sync
document.addEventListener('DOMContentLoaded', function() {
    syncUserName();
    
    // Ensure mobile menu starts in correct state
    ensureMobileMenuInitialState();
});

// Function to ensure mobile menu starts in correct state
function ensureMobileMenuInitialState() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu && mobileMenuButton) {
        // Ensure menu starts collapsed
        if (!mobileNavMenu.classList.contains('show')) {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }
}

// Function to force close mobile menu (for emergency use)
function forceCloseMobileMenu() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu) {
        // Force remove show class and add collapse class
        mobileNavMenu.classList.remove('show');
        mobileNavMenu.classList.add('collapse');
        
        // Update button state to match the expected behavior
        if (mobileMenuButton) {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
        }
        
        // Remove body class
        document.body.classList.remove('mobile-menu-open');
    }
}

// Function to ensure mobile menu is closed (for debugging)
function ensureMobileMenuClosed() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu) {
        console.log('Force closing mobile menu...');
        
        // Force close
        mobileNavMenu.classList.remove('show');
        mobileNavMenu.classList.add('collapse');
        
        if (mobileMenuButton) {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
        }
        
        document.body.classList.remove('mobile-menu-open');
        
        console.log('Mobile menu force closed');
    }
}

// Function to force close mobile menu with multiple methods
function forceCloseMobileMenuMultiple() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu) {
        
        // Method 1: Force remove all show-related classes and attributes
        mobileNavMenu.classList.remove('show', 'collapsing');
        mobileNavMenu.classList.add('collapse');
        mobileNavMenu.removeAttribute('style');
        
        // Method 2: Update button state first
        if (mobileMenuButton) {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
        }
        
        // Method 3: Remove body class
        document.body.classList.remove('mobile-menu-open');
        
        // Method 4: Force hide with CSS
        mobileNavMenu.style.display = 'none !important';
        mobileNavMenu.style.height = '0 !important';
        mobileNavMenu.style.overflow = 'hidden !important';
        
        // Method 5: Bootstrap Collapse (as backup)
        try {
            const collapseInstance = bootstrap.Collapse.getInstance(mobileNavMenu);
            if (collapseInstance) {
                collapseInstance.dispose(); // Dispose existing instance
            }
        } catch (e) {
            // Bootstrap collapse dispose failed - ignore
        }
        
        // Method 6: Wait and restore normal state
        setTimeout(() => {
            mobileNavMenu.style.display = '';
            mobileNavMenu.style.height = '';
            mobileNavMenu.style.overflow = '';
        }, 200);
        
    }
}

// Function to completely reset mobile menu state
function resetMobileMenuState() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu) {
        // Remove all Bootstrap instances safely
        try {
            const collapseInstance = bootstrap.Collapse.getInstance(mobileNavMenu);
            if (collapseInstance) {
                collapseInstance.dispose();
            }
        } catch (e) {
            // Bootstrap dispose failed - ignore
        }
        
        // Wait a bit for Bootstrap to clean up
        setTimeout(() => {
            try {
                // Reset all classes and attributes
                mobileNavMenu.className = 'collapse d-lg-none';
                mobileNavMenu.removeAttribute('style');
                mobileNavMenu.removeAttribute('aria-expanded');
                
                // Reset button state
                if (mobileMenuButton) {
                    mobileMenuButton.setAttribute('aria-expanded', 'false');
                    mobileMenuButton.classList.add('collapsed');
                    mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
                }
                
                // Remove body class
                document.body.classList.remove('mobile-menu-open');
            } catch (e) {
                // Error during menu reset - ignore
            }
        }, 50);
    }
}

// Function to safely close mobile menu without Bootstrap conflicts
function safeCloseMobileMenu() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuButton = document.querySelector('[data-bs-target="#mobileNavMenu"]');
    
    if (mobileNavMenu) {
        // Method 1: Direct CSS manipulation (safest)
        mobileNavMenu.classList.remove('show', 'collapsing');
        mobileNavMenu.classList.add('collapse');
        mobileNavMenu.style.display = 'none';
        mobileNavMenu.style.height = '0';
        mobileNavMenu.style.overflow = 'hidden';
        
        // Method 2: Update button state
        if (mobileMenuButton) {
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.classList.add('collapsed');
            mobileMenuButton.innerHTML = '<i class="fas fa-bars"></i>';
        }
        
        // Method 3: Remove body class
        document.body.classList.remove('mobile-menu-open');
        
        // Method 4: Clean up Bootstrap instance after a delay
        setTimeout(() => {
            try {
                const collapseInstance = bootstrap.Collapse.getInstance(mobileNavMenu);
                if (collapseInstance) {
                    collapseInstance.dispose();
                }
            } catch (e) {
                // Bootstrap cleanup error (safe to ignore)
            }
        }, 100);
    }
}

// Export functions for external use
window.ResponsiveNav = {
    closeMobileMenu,
    forceCloseMobileMenu,
    ensureMobileMenuClosed,
    forceCloseMobileMenuMultiple,
    resetMobileMenuState,
    safeCloseMobileMenu,
    updateActiveNavigation,
    confirmLogout,
    syncUserName,
    handleNavigationWithSmoothScroll
};
