/* Endless testimonial strip.
   The card set is cloned once (hidden from assistive tech) and a
   requestAnimationFrame loop moves the track, wrapping at exactly one set
   width, so the glide never ends and never jumps.
   - Auto-glide eases toward a steady reading speed; hover or keyboard focus
     eases it down to a near-stop and back up again.
   - Prev/next glide exactly one card, then auto-glide eases back in.
   - Drag or swipe follows the pointer 1:1 and coasts with momentum on release.
   - Reduced motion: no auto-glide; arrows, keys and drag still work.
   Without JS the cards stay a normal horizontally scrollable row. */
(function () {
    var BASE_SPEED = 42;    // px/s, auto-glide
    var HOVER_SPEED = 5;    // px/s, near-stop while hovered or focused
    var EASE_TAU = 0.14;    // s, speed changes settle in ~0.4 s
    var COAST_TAU = 0.45;   // s, momentum after a fling fades more slowly
    var STEP_MS = 600;      // prev/next glide
    var MAX_FLING = 2400;   // px/s

    var ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
        '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function init() {
        var marquee = document.querySelector('.testimonial-marquee');
        if (!marquee || marquee.classList.contains('is-js')) return;
        var viewport = marquee.querySelector('.testimonial-viewport');
        var track = marquee.querySelector('.testimonial-track');
        var set = track && track.querySelector('.testimonial-set');
        if (!viewport || !set) return;

        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

        var clone = set.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('inert', '');
        track.appendChild(clone);
        marquee.classList.add('is-js');

        var controls = document.createElement('div');
        controls.className = 'testimonial-controls';
        controls.innerHTML =
            '<button type="button" class="tc-prev" aria-label="Previous testimonial">' + ARROW + '</button>' +
            '<button type="button" class="tc-next" aria-label="Next testimonial">' + ARROW + '</button>';
        marquee.parentNode.insertBefore(controls, marquee.nextSibling);

        var width = 0;          // one set including its trailing gap
        var step = 0;           // one card plus gap
        var x = 0;              // offset in px; rendered modulo width
        var v = 0;              // current auto-glide velocity, px/s
        var mode = 'auto';      // 'auto' | 'glide' | 'drag'
        var coasting = false;
        var hovering = false;
        var keyboardFocus = false;
        var glide = null;
        var last = null;
        var rendered = null;

        function measure() {
            var next = set.getBoundingClientRect().width;
            if (next <= 0) return;
            width = next;
            var card = set.querySelector('.testimonial-card');
            var gap = parseFloat(window.getComputedStyle(set).columnGap) || 0;
            step = card ? card.getBoundingClientRect().width + gap : 300;
            x = wrap(x);
            rendered = null;
        }

        function wrap(value) {
            return width > 0 ? ((value % width) + width) % width : 0;
        }

        function render() {
            var value = Math.round(-wrap(x) * 100) / 100;
            if (value === rendered) return;
            rendered = value;
            track.style.transform = 'translate3d(' + value + 'px, 0, 0)';
        }

        function easeInOut(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function move(direction) {
            var target = (glide ? glide.to : x) + direction * step;
            coasting = false;
            if (reduce.matches) {
                glide = null;
                mode = 'auto';
                v = 0;
                x = wrap(target);
                render();
                return;
            }
            glide = { from: x, to: target, start: performance.now() };
            mode = 'glide';
        }

        function frame(now) {
            var dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
            last = now;
            if (mode === 'glide' && glide) {
                var t = Math.min(1, (now - glide.start) / STEP_MS);
                x = glide.from + (glide.to - glide.from) * easeInOut(t);
                if (t >= 1) {
                    x = wrap(glide.to);
                    glide = null;
                    mode = 'auto';
                    v = 0;
                }
            } else if (mode === 'auto') {
                var target = reduce.matches ? 0 : (hovering || keyboardFocus ? HOVER_SPEED : BASE_SPEED);
                var tau = coasting ? COAST_TAU : EASE_TAU;
                v += (target - v) * (1 - Math.exp(-dt / tau));
                if (coasting && Math.abs(v - target) < 3) coasting = false;
                x = wrap(x + v * dt);
            }
            render();
            window.requestAnimationFrame(frame);
        }

        controls.querySelector('.tc-prev').addEventListener('click', function () { move(-1); });
        controls.querySelector('.tc-next').addEventListener('click', function () { move(1); });

        marquee.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
            else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        });

        marquee.addEventListener('pointerenter', function (event) {
            if (event.pointerType === 'mouse') hovering = true;
        });
        marquee.addEventListener('pointerleave', function (event) {
            if (event.pointerType === 'mouse') hovering = false;
        });
        marquee.addEventListener('focusin', function () {
            try { keyboardFocus = marquee.matches(':focus-visible'); } catch (error) { keyboardFocus = false; }
        });
        marquee.addEventListener('focusout', function () { keyboardFocus = false; });

        var pointerId = null;
        var startX = 0;
        var startPos = 0;
        var lastMoveX = 0;
        var lastMoveTime = 0;
        var flingV = 0;

        viewport.addEventListener('pointerdown', function (event) {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            pointerId = event.pointerId;
            mode = 'drag';
            glide = null;
            coasting = false;
            startX = lastMoveX = event.clientX;
            startPos = x;
            lastMoveTime = event.timeStamp;
            flingV = 0;
            try { viewport.setPointerCapture(event.pointerId); } catch (error) { /* not capturable */ }
            marquee.classList.add('is-dragging');
        });

        viewport.addEventListener('pointermove', function (event) {
            if (mode !== 'drag' || event.pointerId !== pointerId) return;
            var elapsed = event.timeStamp - lastMoveTime;
            if (elapsed > 0) {
                var instant = -(event.clientX - lastMoveX) / elapsed * 1000;
                flingV = flingV * 0.2 + instant * 0.8;
            }
            lastMoveX = event.clientX;
            lastMoveTime = event.timeStamp;
            x = startPos - (event.clientX - startX);
        });

        function endDrag(event) {
            if (mode !== 'drag' || event.pointerId !== pointerId) return;
            pointerId = null;
            mode = 'auto';
            x = wrap(x);
            marquee.classList.remove('is-dragging');
            if (event.timeStamp - lastMoveTime > 90) flingV = 0;   // finger rested before release
            if (reduce.matches) {
                v = 0;
            } else {
                v = Math.max(-MAX_FLING, Math.min(MAX_FLING, flingV));
                coasting = true;
            }
        }
        viewport.addEventListener('pointerup', endDrag);
        viewport.addEventListener('pointercancel', endDrag);
        viewport.addEventListener('dragstart', function (event) { event.preventDefault(); });

        window.addEventListener('resize', measure, { passive: true });
        window.addEventListener('load', measure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
        if ('ResizeObserver' in window) new ResizeObserver(measure).observe(set);

        measure();
        v = reduce.matches ? 0 : BASE_SPEED;
        render();
        window.requestAnimationFrame(frame);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
