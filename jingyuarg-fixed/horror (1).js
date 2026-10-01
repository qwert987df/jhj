/* =========================================================================
   horror.js —— 「过场」恐怖氛围引擎
   职责：氛围层 DOM、心跳/低频轰鸣/静电/耳语/上升音等实时合成音效、
         屏幕抖动、故障、惊吓闪、透镜（视野）收缩、文字逐行揭示。
   用法：
     HORROR.init({ stage:'#hzStage', lines:'#box', hint:'▸ 点击继续' });
     HORROR.line('文本');   HORROR.dread(.6);   HORROR.setLens(24);
     HORROR.shake('heavy'); HORROR.glitch(.8);  HORROR.static(.35);
     HORROR.hit();          HORROR.riser(2.2);  HORROR.eyes(6);
   ========================================================================= */
(function (global) {
    'use strict';

    var reduceMotion = false;
    try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var cfg = {
        stage: '.hz-stage',
        lines: null,
        hint: '',
        heartbeat: 58,
        autoAudio: true
    };

    var dom = {};
    var stageEl = null;
    var linesEl = null;
    var started = false;

    /* ================================================================
       音效引擎
       ================================================================ */
    var Snd = (function () {
        var ctx = null, master = null, droneGain = null, noiseBed = null;
        var beatTimer = null, bpm = 58;
        var muted = false;
        var droneStarted = false;

        function ac() {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            if (!ctx) {
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.5;
                master.connect(ctx.destination);
            }
            if (ctx.state === 'suspended' && ctx.resume) {
                try { ctx.resume().catch(function () {}); } catch (e) {}
            }
            return ctx;
        }

        function noiseBuffer(seconds) {
            var len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
            var buf = ctx.createBuffer(1, len, ctx.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            return buf;
        }

        function env(node, t, attack, dur, peak) {
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
            g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
            node.connect(g);
            g.connect(master);
        }

        function thump(gain, freq, dur) {
            if (!ctx) return;
            var t = ctx.currentTime;
            var o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, t);
            o.frequency.exponentialRampToValueAtTime(Math.max(24, freq * 0.42), t + dur);
            env(o, t, 0.012, dur, gain);
            o.start(t);
            o.stop(t + dur + 0.2);
        }

        function pump() {
            if (muted || !ctx) return;
            thump(0.34, 62, 0.20);                       // lub
            setTimeout(function () {
                if (!muted && ctx) thump(0.22, 50, 0.26); // dub
            }, 165);
        }

        function schedule() {
            if (beatTimer) clearTimeout(beatTimer);
            var interval = Math.round(60000 / Math.max(36, Math.min(170, bpm)));
            beatTimer = setTimeout(function () {
                // 音频上下文还没被用户手势解锁时不空敲，等解锁了再开始
                if (ctx && ctx.state === 'running') pump();
                schedule();
            }, interval);
        }

        return {
            start: function (initialBpm) {
                var c = ac(); if (!c) return;
                if (droneStarted) return;
                droneStarted = true;
                bpm = initialBpm || 58;

                // 低频轰鸣底噪
                droneGain = c.createGain();
                droneGain.gain.value = 0;
                droneGain.connect(master);
                [41.2, 61.7, 82.4].forEach(function (f, i) {
                    var o = c.createOscillator();
                    o.type = i === 0 ? 'sine' : 'triangle';
                    o.frequency.value = f;
                    var g = c.createGain();
                    g.gain.value = i === 0 ? 0.55 : 0.16;
                    o.connect(g); g.connect(droneGain);
                    o.start();
                });
                // 极缓慢的起伏
                var lfo = c.createOscillator();
                lfo.frequency.value = 0.055;
                var lg = c.createGain();
                lg.gain.value = 0.05;
                lfo.connect(lg); lg.connect(droneGain.gain);
                lfo.start();
                droneGain.gain.linearRampToValueAtTime(0.12, c.currentTime + 5);

                // 空气般的噪声床
                var src = c.createBufferSource();
                src.buffer = noiseBuffer(4);
                src.loop = true;
                var bp = c.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = 420;
                bp.Q.value = 0.5;
                noiseBed = c.createGain();
                noiseBed.gain.value = 0;
                src.connect(bp); bp.connect(noiseBed); noiseBed.connect(master);
                src.start();
                noiseBed.gain.linearRampToValueAtTime(0.035, c.currentTime + 6);

                schedule();
            },
            setBpm: function (v) { bpm = v; },
            mute: function (m) {
                muted = m;
                if (!ctx) return;
                try {
                    master.gain.linearRampToValueAtTime(m ? 0 : 0.5, ctx.currentTime + 0.3);
                } catch (e) {}
            },
            tick: function () {
                var c = ac(); if (!c || muted) return;
                var t = c.currentTime;
                var o = c.createOscillator();
                o.type = 'square';
                o.frequency.value = 1500 + Math.random() * 900;
                env(o, t, 0.002, 0.016, 0.012);
                o.start(t); o.stop(t + 0.05);
            },
            breathe: function () {
                var c = ac(); if (!c || muted) return;
                var t = c.currentTime;
                var src = c.createBufferSource();
                src.buffer = noiseBuffer(1.4);
                var f = c.createBiquadFilter();
                f.type = 'bandpass';
                f.frequency.setValueAtTime(700, t);
                f.frequency.linearRampToValueAtTime(1500, t + 0.7);
                f.frequency.linearRampToValueAtTime(600, t + 1.4);
                f.Q.value = 1.6;
                src.connect(f);
                env(f, t, 0.5, 1.2, 0.05);
                src.start(t); src.stop(t + 1.6);
            },
            whisper: function () {
                var c = ac(); if (!c || muted) return;
                var t = c.currentTime;
                var src = c.createBufferSource();
                src.buffer = noiseBuffer(1.8);
                var f = c.createBiquadFilter();
                f.type = 'bandpass';
                f.Q.value = 4;
                f.frequency.setValueAtTime(1200, t);
                f.frequency.linearRampToValueAtTime(2400, t + 0.5);
                f.frequency.linearRampToValueAtTime(900, t + 1.4);
                var wob = c.createOscillator();
                wob.frequency.value = 6.5;
                var wg = c.createGain();
                wg.gain.value = 400;
                wob.connect(wg); wg.connect(f.frequency);
                wob.start(t); wob.stop(t + 1.8);
                src.connect(f);
                env(f, t, 0.35, 1.3, 0.06);
                src.start(t); src.stop(t + 1.9);
            },
            staticBurst: function (dur, gain) {
                var c = ac(); if (!c || muted) return;
                dur = dur || 0.3;
                var t = c.currentTime;
                var src = c.createBufferSource();
                src.buffer = noiseBuffer(dur);
                var f = c.createBiquadFilter();
                f.type = 'highpass';
                f.frequency.value = 900;
                src.connect(f);
                env(f, t, 0.004, dur, gain == null ? 0.16 : gain);
                src.start(t); src.stop(t + dur + 0.05);
            },
            hit: function () {
                var c = ac(); if (!c || muted) return;
                thump(0.5, 92, 0.55);
                var t = c.currentTime;
                var src = c.createBufferSource();
                src.buffer = noiseBuffer(0.5);
                var f = c.createBiquadFilter();
                f.type = 'lowpass';
                f.frequency.value = 1600;
                src.connect(f);
                env(f, t, 0.002, 0.45, 0.28);
                src.start(t); src.stop(t + 0.55);
            },
            riser: function (dur) {
                var c = ac(); if (!c || muted) return;
                dur = dur || 2;
                var t = c.currentTime;
                var o = c.createOscillator();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(120, t);
                o.frequency.exponentialRampToValueAtTime(1500, t + dur);
                var f = c.createBiquadFilter();
                f.type = 'lowpass';
                f.frequency.setValueAtTime(400, t);
                f.frequency.exponentialRampToValueAtTime(6000, t + dur);
                o.connect(f);
                var g = c.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.86);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
                f.connect(g); g.connect(master);
                o.start(t); o.stop(t + dur + 0.2);
                var src = c.createBufferSource();
                src.buffer = noiseBuffer(dur + 0.2);
                var hp = c.createBiquadFilter();
                hp.type = 'bandpass';
                hp.Q.value = 0.7;
                hp.frequency.setValueAtTime(600, t);
                hp.frequency.exponentialRampToValueAtTime(5200, t + dur);
                src.connect(hp);
                var g2 = c.createGain();
                g2.gain.setValueAtTime(0.0001, t);
                g2.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.9);
                g2.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
                hp.connect(g2); g2.connect(master);
                src.start(t); src.stop(t + dur + 0.25);
            },
            stopBeat: function () {
                if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
            },
            available: function () { return !!ac(); }
        };
    })();

    /* ================================================================
       氛围层 DOM
       ================================================================ */
    function buildLayers() {
        var frag = document.createDocumentFragment();

        ['hz-shape hz-shape-a', 'hz-shape hz-shape-b'].forEach(function (cls) {
            var d = document.createElement('div');
            d.className = cls;
            frag.appendChild(d);
        });

        var cursor = document.createElement('div');
        cursor.className = 'hz-cursor';
        frag.appendChild(cursor);
        dom.cursor = cursor;

        [['hz-layer hz-vignette'], ['hz-grain'], ['hz-scan'], ['hz-aberr'],
         ['hz-layer hz-iris'], ['hz-layer hz-flash'], ['hz-curtain']].forEach(function (c) {
            var d = document.createElement('div');
            d.className = c[0];
            frag.appendChild(d);
            if (c[0].indexOf('hz-iris') >= 0) dom.iris = d;
            if (c[0].indexOf('hz-flash') >= 0) dom.flash = d;
            if (c[0].indexOf('hz-curtain') >= 0) dom.curtain = d;
        });

        document.body.appendChild(frag);

        document.addEventListener('mousemove', function (e) {
            if (!dom.cursor) return;
            dom.cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
        });
    }

    /* ================================================================
       屏幕抖动
       ================================================================ */
    var shakeTimer = null;
    function shake(power) {
        if (!stageEl || reduceMotion) return;
        var p = power === 'heavy' ? 16 : power === 'medium' ? 9 : 4;
        var endAt = Date.now() + (power === 'heavy' ? 620 : power === 'medium' ? 420 : 240);
        if (shakeTimer) cancelAnimationFrame(shakeTimer);
        (function loop() {
            if (Date.now() > endAt) {
                stageEl.style.transform = 'translate3d(0,0,0)';
                shakeTimer = null;
                return;
            }
            var dx = (Math.random() - 0.5) * 2 * p;
            var dy = (Math.random() - 0.5) * 2 * p;
            var rot = (Math.random() - 0.5) * (p / 14);
            stageEl.style.transform =
                'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) rotate(' + rot.toFixed(3) + 'deg)';
            shakeTimer = requestAnimationFrame(loop);
        })();
    }

    /* ================================================================
       故障 / 闪 / 淡场
       ================================================================ */
    var glitchTimer = null;
    function glitch(strength, dur) {
        if (reduceMotion) return;
        var s = strength == null ? 0.6 : strength;
        document.documentElement.style.setProperty('--hz-glitch', String(s));
        shake(s > 0.75 ? 'medium' : 'light');
        clearTimeout(glitchTimer);
        glitchTimer = setTimeout(function () {
            document.documentElement.style.setProperty('--hz-glitch', '0');
        }, dur || 120);
    }

    function flash(color, dur) {
        if (!dom.flash || reduceMotion) return;
        dom.flash.className = 'hz-flash' + (color === 'red' ? ' hz-flash-red' : color === 'dark' ? ' hz-flash-dark' : '');
        dom.flash.style.transition = 'none';
        dom.flash.style.opacity = color === 'dark' ? '1' : '0.92';
        void dom.flash.offsetWidth;
        dom.flash.style.transition = 'opacity ' + (dur || 520) + 'ms cubic-bezier(.22,1,.36,1)';
        dom.flash.style.opacity = '0';
    }

    function fadeTo(color, dur, then) {
        if (!dom.curtain) { if (then) then(); return; }
        dom.curtain.style.background = color || '#000';
        dom.curtain.style.transition = 'opacity ' + (dur || 900) + 'ms cubic-bezier(.22,1,.36,1)';
        requestAnimationFrame(function () { dom.curtain.style.opacity = '1'; });
        if (then) setTimeout(then, (dur || 900) + 40);
    }

    /* ================================================================
       恐慌 / 透镜 / 眼睛
       ================================================================ */
    function dread(level) {
        var v = Math.max(0, Math.min(1, level));
        document.documentElement.style.setProperty('--hz-dread', String(v));
        Snd.setBpm(56 + v * 62);       // 心率 56 → 118
    }

    function setLens(px) {
        document.documentElement.style.setProperty('--hz-lens', px + 'px');
    }

    /* 视野像瞳孔一样收缩 / 张开 */
    var irisRaf = null;
    function irisTo(target, dur, visible) {
        if (!dom.iris) return;
        if (irisRaf) cancelAnimationFrame(irisRaf);
        if (visible !== undefined) dom.iris.style.opacity = String(visible);
        var root = document.documentElement;
        var from = parseFloat(getComputedStyle(root).getPropertyValue('--hz-iris')) || 0;
        var t0 = performance.now();
        (function step(now) {
            var p = Math.min(1, (now - t0) / Math.max(1, dur));
            var e = 1 - Math.pow(1 - p, 3);
            root.style.setProperty('--hz-iris', (from + (target - from) * e).toFixed(1) + 'px');
            if (p < 1) irisRaf = requestAnimationFrame(step);
            else irisRaf = null;
        })(t0);
    }

    function irisFull() {
        return Math.hypot(window.innerWidth, window.innerHeight) * 0.62;
    }

    function eyes(count) {
        if (reduceMotion) return;
        for (var i = 0; i < (count || 5); i++) {
            (function (i) {
                setTimeout(function () {
                    var img = document.createElement('img');
                    img.className = 'hz-eye';
                    img.src = 'eye_open.jpg';
                    img.alt = '';
                    var size = 90 + Math.random() * 150;
                    var x = Math.random() * (window.innerWidth - size);
                    var y = Math.random() * (window.innerHeight - size);
                    img.style.cssText =
                        'left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;' +
                        'transform:rotate(' + ((Math.random() - 0.5) * 34).toFixed(1) + 'deg);';
                    document.body.appendChild(img);
                    Snd.whisper();
                }, i * 380 + Math.random() * 220);
            })(i);
        }
    }

    /* ================================================================
       文字
       ================================================================ */
    function line(text, opt) {
        opt = opt || {};
        var el = document.createElement('div');
        el.className = 'text-line hz-line' + (opt.em ? ' hz-em' : '');
        el.textContent = text;
        if (linesEl) {
            // 旧句子沉下去
            Array.prototype.forEach.call(linesEl.children, function (c) {
                c.classList.add('hz-past');
            });
            linesEl.appendChild(el);
        } else {
            document.body.appendChild(el);
        }
        Snd.tick();
        return el;
    }

    /* ================================================================
       初始化
       ================================================================ */
    function init(options) {
        for (var k in options) if (options.hasOwnProperty(k)) cfg[k] = options[k];

        document.body.classList.add('hz-on');
        buildLayers();

        stageEl = document.querySelector(cfg.stage);
        linesEl = cfg.lines ? document.querySelector(cfg.lines) : null;

        if (cfg.hint) {
            var h = document.createElement('div');
            h.className = 'hz-hint';
            h.textContent = cfg.hint;
            document.body.appendChild(h);
            dom.hint = h;
        }

        // 把瞳孔遮罩的初始半径写成具体像素值，
        // 后面的 irisTo() 才能拿到可插值的数字（vmax 之类 parseFloat 会算错）
        document.documentElement.style.setProperty('--hz-iris', irisFull() + 'px');

        var startAudio = function () {
            if (started) return;
            started = true;
            Snd.start(cfg.heartbeat);
        };
        document.addEventListener('pointerdown', startAudio);
        document.addEventListener('keydown', startAudio);
        if (cfg.autoAudio) setTimeout(startAudio, 120);

        // 桌面托盘的静音开关
        window.addEventListener('arg-mute', function (e) {
            Snd.mute(!!(e.detail && e.detail.muted));
        });

        dread(0.06);
        return { Snd: Snd };
    }

    global.HORROR = {
        init: init,
        line: line,
        dread: dread,
        setLens: setLens,
        shake: shake,
        glitch: glitch,
        flash: flash,
        fadeTo: fadeTo,
        eyes: eyes,
        irisTo: irisTo,
        irisFull: irisFull,
        static: function (d, g) { Snd.staticBurst(d, g); },
        whisper: function () { Snd.whisper(); },
        breathe: function () { Snd.breathe(); },
        hit: function () { Snd.hit(); },
        riser: function (d) { Snd.riser(d); },
        tick: function () { Snd.tick(); },
        mute: function (m) { Snd.mute(m); },
        stopBeat: function () { Snd.stopBeat(); },
        hint: function (text) {
            if (!dom.hint) return;
            if (text) { dom.hint.textContent = text; dom.hint.classList.remove('hz-hide'); }
            else dom.hint.classList.add('hz-hide');
        }
    };
})(window);
