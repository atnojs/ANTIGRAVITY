
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    // --- Mobile Menu Toggle ---
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when a link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                 sidebar.classList.remove('open');
            });
        });
    }

    // --- Scroll-Spy with Intersection Observer ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        // Trigger when the section is in the vertical center of the viewport
        rootMargin: '-40% 0px -60% 0px',
        threshold: 0
    });

    sections.forEach(section => {
        observer.observe(section);
    });
});
