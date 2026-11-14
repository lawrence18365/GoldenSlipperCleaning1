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
    var CAP_MS = 5300;   // exit starts by here; 750 ms pull-up ends by ~6.05 s
    var EXIT_MS = 750;
    var TAIL_S = 0.3;    // start the pull-up this close to the video's end

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
            video.removeEventListener('timeupdate', onTimeUpdate);
        }
    }

    function removeOverlay() {
        if (overlay && overlay.parentNode) overlay.remove();
        root.classList.remove('gs-intro');
        cleanup();
    }

    function onTransitionEnd(event) {
        if (event.target === overlay && event.propertyName === 'transform') removeOverlay();
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
        overlay.classList.add('is-leaving');
        overlay.addEventListener('transitionend', onTransitionEnd);
        removeTimer = window.setTimeout(removeOverlay, EXIT_MS + 60);
    }

    function onKeydown(event) {
        if (event.key === 'Escape') dismiss();
    }

    function onTimeUpdate() {
        if (video.duration && video.duration - video.currentTime <= TAIL_S) dismiss();
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
        video.addEventListener('timeupdate', onTimeUpdate);

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
        }, Math.max(0, Math.min(2500, CAP_MS - performance.now())));

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

    capTimer = window.setTimeout(dismiss, Math.max(0, CAP_MS - performance.now()));
    if (overlay) {
        initialize();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pollForOverlay, { once: true });
        pollForOverlay();
    } else {
        dismiss();
    }
})();
