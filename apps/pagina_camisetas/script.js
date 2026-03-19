
// AOS
AOS.init({ duration:800, once:true });

// Estilos de flecha select (inject styles to head)
const customSelectArrowStyles = `
    .custom-select-arrow {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%239ca3af'%3e%3cpath d='M8 11.293l-4.414-4.414a1 1 0 0 1 1.414-1.414L8 8.414l3.904-3.904a1 1 0 0 1 1.414 1.414L8.707 11.293a1 1 0 0 1-1.414 0z'/%3e%3c/svg%3e");
        background-repeat:no-repeat; background-position:right 10px center; background-size:1.5em 1.5em;
    }
    body.dark .custom-select-arrow {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%239ca3af'%3e%3cpath d='M8 11.293l-4.414-4.414a1 1 0 0 1 1.414-1.414L8 8.414l3.904-3.904a1 1 0 0 1 1.414 1.414L8.707 11.293a1 1 0 0 1-1.414 0z'/%3e%3c/svg%3e");
    }
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = customSelectArrowStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            mobileMenuButton.innerHTML = mobileMenu.classList.contains('hidden') ? '<i class="ri-menu-line ri-lg"></i>' : '<i class="ri-close-line ri-lg"></i>';
        });
        mobileMenuLinks.forEach(link => link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenuButton.innerHTML = '<i class="ri-menu-line ri-lg"></i>';
        }));
    }
    
    // Dark mode
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeToggleButtonMobile = document.getElementById('theme-toggle-mobile');
    const setDarkMode = (isDark) => {
        if (isDark) { document.documentElement.classList.add('dark'); localStorage.theme = 'dark'; }
        else { document.documentElement.classList.remove('dark'); localStorage.theme = 'light'; }
    };

    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
    } else {
        setDarkMode(false);
    }
    
    const toggleTheme = () => setDarkMode(!document.documentElement.classList.contains('dark'));
    if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
    if (themeToggleButtonMobile) themeToggleButtonMobile.addEventListener('click', toggleTheme);
    
    // Smooth scroll for on-page links
    document.querySelectorAll('a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href.length <= 1 && href.startsWith('#')) {
                e.preventDefault();
                return;
            }
            try {
                const url = new URL(href, window.location.href);
                if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
                    const targetElement = document.querySelector(url.hash);
                    if (targetElement) {
                        e.preventDefault();
                        const headerHeight = document.querySelector('header')?.offsetHeight || 0;
                        const y = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }
            } catch (error) {
                console.error("Invalid URL for anchor: ", href);
            }
        });
    });
    
    // Lightbox
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox) {
        const lightboxImage = document.getElementById('lightbox-img');
        const closeBtn = document.getElementById('close-lightbox');
        const serviceImages = document.querySelectorAll('.clickable-service-img');
        const openLightbox = (e) => {
            const imgSrc = e.target.src;
            if (lightboxImage) lightboxImage.setAttribute('src', imgSrc);
            lightbox.classList.remove('hidden');
            setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
        };
        const closeLightbox = () => {
            lightbox.classList.add('opacity-0');
            setTimeout(() => lightbox.classList.add('hidden'), 300);
        };
        serviceImages.forEach(img => img.addEventListener('click', openLightbox));
        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    }
    
    // Chat
    const chatBubble = document.getElementById('chat-bubble');
    const chatWindow = document.getElementById('chat-window');
    if (chatBubble && chatWindow) chatBubble.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    
    // Custom Select
    const customSelect = document.getElementById('custom-select');
    const customSelectOptions = document.getElementById('custom-select-options');
    const selectedOption = document.getElementById('selected-option');
    const selectArrow = document.querySelector('.select-arrow');
    const productSelect = document.getElementById('product-contacto');
    const options = document.querySelectorAll('.custom-select-option');
    
    if (customSelect && customSelectOptions && selectedOption && selectArrow && productSelect) {
        customSelect.addEventListener('click', function() {
            customSelectOptions.style.display = customSelectOptions.style.display === 'block' ? 'none' : 'block';
            selectArrow.classList.toggle('open');
        });
        
        options.forEach(option => {
            option.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                const text = this.textContent;
                
                selectedOption.textContent = text;
                if(productSelect instanceof HTMLSelectElement) {
                   productSelect.value = value || '';
                }
                
                options.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                customSelectOptions.style.display = 'none';
                selectArrow.classList.remove('open');
            });
        });
        
        document.addEventListener('click', function(event) {
            if (!customSelect.contains(event.target)) {
                customSelectOptions.style.display = 'none';
                selectArrow.classList.remove('open');
            }
        });
    }
});