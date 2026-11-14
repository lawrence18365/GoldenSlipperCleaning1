/* Hide the fixed header on scroll down, show it on any scroll up or at the top.
   It stays visible while the mobile menu is open or focus is inside it. */
(function () {
    var header = document.querySelector('header');
    if (!header) return;
    var nav = header.querySelector('.nav-links');
    var lastY = Math.max(0, window.scrollY);
    var headerH = header.offsetHeight;
    var ticking = false;

    function menuOpen() {
        return !!(nav && nav.classList.contains('active'));
    }

    function update() {
        ticking = false;
        var y = Math.max(0, window.scrollY);
        var hide = header.classList.contains('is-hidden');
        if (y <= 0 || menuOpen() || header.contains(document.activeElement)) hide = false;
        else if (y < lastY) hide = false;
        else if (y > lastY && y > headerH + 10) hide = true;
        header.classList.toggle('is-hidden', hide);
        lastY = y;
    }

    window.addEventListener('scroll', function () {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }, { passive: true });

    window.addEventListener('resize', function () {
        headerH = header.offsetHeight;
    }, { passive: true });

    header.addEventListener('focusin', function () {
        header.classList.remove('is-hidden');
    });

    if (nav && 'MutationObserver' in window) {
        new MutationObserver(function () {
            if (menuOpen()) header.classList.remove('is-hidden');
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    }
})();
