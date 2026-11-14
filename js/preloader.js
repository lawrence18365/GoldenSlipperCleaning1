(function () {
    var root = document.documentElement;
    var overlay = document.getElementById('gs-preloader');

    if (!root.classList.contains('gs-intro')) {
        function removeOverlayIfPresent() {
            var currentOverlay = document.getElementById('gs-preloader');
            if (currentOverlay) currentOverlay.remove();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', removeOverlayIfPresent, { once: true });
        } else {
            removeOverlayIfPresent();
        }
        return;
    }

    var dismissed = false;
    var started = false;
    var guardTimer;
    var capTimer;
    var removeTimer;
    var pollTimer;
    var video;

    function cleanup() {
        window.clearTimeout(guardTimer);
        window.clearTimeout(capTimer);
        window.clearTimeout(removeTimer);
        document.removeEventListener('keydown', onKeydown);
        if (overlay) overlay.removeEventListener('click', dismiss);
        if (video) {
            video.removeEventListener('playing', markStarted);
            video.removeEventListener('loadeddata', markStarted);
            video.removeEventListener('ended', dismiss);
            video.removeEventListener('error', dismiss);
        }
    }

    function removeOverlay() {
        if (overlay && overlay.parentNode) overlay.remove();
        root.classList.remove('gs-intro');
        cleanup();
    }

    function onTransitionEnd(event) {
        if (event.target === overlay && event.propertyName === 'opacity') removeOverlay();
    }

    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        window.clearTimeout(guardTimer);
        window.clearTimeout(capTimer);
        if (!overlay) {
            root.classList.remove('gs-intro');
            return;
        }
        overlay.classList.add('is-fading');
        overlay.addEventListener('transitionend', onTransitionEnd, { once: true });
        removeTimer = window.setTimeout(removeOverlay, 600);
    }

    function onKeydown(event) {
        if (event.key === 'Escape') dismiss();
    }

    function markStarted() {
        if (video.readyState >= 2 || video.currentTime > 0) started = true;
    }

    function initialize() {
        overlay = document.getElementById('gs-preloader');
        if (!overlay) return;
        document.removeEventListener('DOMContentLoaded', pollForOverlay);
        window.clearTimeout(pollTimer);
        if (dismissed) {
            overlay.remove();
            return;
        }

        video = overlay.querySelector('video');
        if (!video) {
            dismiss();
            return;
        }

        overlay.addEventListener('click', dismiss);
        document.addEventListener('keydown', onKeydown);
        video.addEventListener('playing', markStarted);
        video.addEventListener('loadeddata', markStarted);
        video.addEventListener('ended', dismiss);
        video.addEventListener('error', dismiss);

        var webm = document.createElement('source');
        webm.type = 'video/webm';
        webm.src = '/images/brand/preloader/gs-intro.webm';
        var mp4 = document.createElement('source');
        mp4.type = 'video/mp4';
        mp4.src = '/images/brand/preloader/gs-intro.mp4';
        mp4.addEventListener('error', dismiss);
        video.appendChild(webm);
        video.appendChild(mp4);

        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        guardTimer = window.setTimeout(function () {
            if (!started && video.readyState < 2) dismiss();
        }, Math.max(0, Math.min(2500, 5500 - performance.now())));

        try {
            video.load();
            var playResult = video.play();
            if (playResult && typeof playResult.catch === 'function') playResult.catch(dismiss);
        } catch (error) {
            dismiss();
        }
    }

    function pollForOverlay() {
        if (document.getElementById('gs-preloader')) {
            initialize();
        } else {
            pollTimer = window.setTimeout(pollForOverlay, 50);
        }
    }

    capTimer = window.setTimeout(dismiss, Math.max(0, 5500 - performance.now()));
    if (overlay) {
        initialize();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pollForOverlay, { once: true });
        pollForOverlay();
    } else {
        dismiss();
    }
})();
