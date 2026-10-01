/* =========================================================================
   end-cinema.js —— 结局演出引擎
   逐字推进 / 点击快进 / 结局卡片 / 星尘 / 实时合成音效
   用法：EC.init({ tone, code, title, subtitle, curio, speed })
   ========================================================================= */
(function (global) {
    'use strict';

    /* ------------------------------------------------------------------
       音效：全部用 WebAudio 实时合成，不引入外部音频
       ------------------------------------------------------------------ */
    var Sound = (function () {
        var ctx = null, master = null, drone = null, started = false;
        var muted = false;

        function ac() {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            if (!ctx) {
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.34;
                master.connect(ctx.destination);
            }
            if (ctx.state === 'suspended' && ctx.resume) {
                try { ctx.resume().catch(function () {}); } catch (e) {}
            }
            return ctx;
        }

        function tone(freq, opt) {
            if (muted) return;
            var c = ac(); if (!c) return;
            opt = opt || {};
            var dur = opt.dur == null ? 0.2 : opt.dur;
            var t = c.currentTime + (opt.at || 0);
            var o = c.createOscillator();
            o.type = opt.type || 'sine';
            o.frequency.setValueAtTime(freq, t);
            if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(24, opt.to), t + dur);
            var g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opt.gain == null ? 0.14 : opt.gain), t + (opt.attack || 0.01));
            g.gain.exponentialRampToValueAtTime(0.0001, t + (opt.attack || 0.01) + dur);
            o.connect(g); g.connect(master);
            o.start(t); o.stop(t + dur + 0.1);
        }

        function startDrone(tone_, bg) {
            var c = ac(); if (!c || drone) return;
            drone = c.createGain();
            drone.gain.value = 0;
            drone.connect(master);
            var base = tone_ === 'true' ? 110 : (tone_ === 'bad' ? 55 : 73.5);
            var ratios = [1, 1.5, 2.02];
            ratios.forEach(function (r, i) {
                var o = c.createOscillator();
                o.type = i === 0 ? 'sine' : 'triangle';
                o.frequency.value = base * r;
                var g = c.createGain();
                g.gain.value = i === 0 ? 0.5 : 0.16;
                o.connect(g); g.connect(drone);
                o.start();
            });
            // 缓慢起伏，制造呼吸感
            var lfo = c.createOscillator();
            lfo.frequency.value = 0.07;
            var lfoGain = c.createGain();
            lfoGain.gain.value = 0.05;
            lfo.connect(lfoGain); lfoGain.connect(drone.gain);
            lfo.start();
            drone.gain.linearRampToValueAtTime(0.11, c.currentTime + 4);
        }

        return {
            boot: function (tone_, bg) {
                if (started) return;
                started = true;
                startDrone(tone_, bg);
            },
            type: function () {
                if (muted) return;
                var c = ac(); if (!c) return;
                tone(1700 + Math.random() * 700, { type: 'square', dur: 0.012, gain: 0.012 });
            },
            lineBreak: function () {
                tone(520, { dur: 0.16, gain: 0.045, to: 300 });
            },
            reveal: function (tone_) {
                var notes = tone_ === 'bad'
                    ? [220, 174.61, 146.83, 110]
                    : [392, 523.25, 659.25, 987.77];
                notes.forEach(function (f, i) {
                    tone(f, { type: 'triangle', dur: 1.1, gain: 0.13, at: i * 0.16, attack: 0.05 });
                });
                if (tone_ === 'bad') {
                    tone(55, { dur: 2.6, gain: 0.1, at: 0.1, attack: 0.4 });
                }
            },
            start: function (tone_) {
                if (tone_ === 'bad') {
                    [82.4, 82.4].forEach(function (f, i) {
                        tone(f, { type: 'sine', dur: 0.42, gain: 0.16, at: i * 0.36, attack: 0.02 });
                        tone(f * 0.5, { type: 'sine', dur: 0.3, gain: 0.1, at: i * 0.36 + 0.16, attack: 0.02 });
                    });
                } else {
                    [523.25, 783.99].forEach(function (f, i) {
                        tone(f, { type: 'triangle', dur: 0.7, gain: 0.1, at: i * 0.12 });
                    });
                }
            },
            card: function () { tone(1046.5, { type: 'sine', dur: 0.9, gain: 0.09, attack: 0.02 }); },
            click: function () { tone(900, { type: 'square', dur: 0.04, gain: 0.05 }); },
            stop: function () {
                if (drone && ctx) {
                    try { drone.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2); } catch (e) {}
                }
            }
        };
    })();

    /* ------------------------------------------------------------------
       星尘背景
       ------------------------------------------------------------------ */
    function startDust(canvas, tone, reduce) {
        if (!canvas || reduce) return;
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0, parts = [];

        function resize() {
            W = canvas.width = Math.floor(window.innerWidth * dpr);
            H = canvas.height = Math.floor(window.innerHeight * dpr);
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            var count = Math.round(Math.min(90, window.innerWidth / 16));
            parts = [];
            for (var i = 0; i < count; i++) {
                parts.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: (Math.random() * 1.7 + 0.35) * dpr,
                    vx: (Math.random() - 0.5) * 0.16 * dpr,
                    vy: (-Math.random() * 0.28 - 0.05) * dpr,
                    a: Math.random() * 0.5 + 0.12,
                    tw: Math.random() * Math.PI * 2
                });
            }
        }

        function hue() {
            if (tone === 'bad') return 'rgba(255,110,110,';
            if (tone === 'true') return 'rgba(150,255,225,';
            return 'rgba(175,205,255,';
        }

        function frame() {
            ctx.clearRect(0, 0, W, H);
            var base = hue();
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                p.x += p.vx; p.y += p.vy; p.tw += 0.03;
                if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                if (p.x < -10) p.x = W + 10;
                if (p.x > W + 10) p.x = -10;
                var alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
                ctx.beginPath();
                ctx.fillStyle = base + alpha.toFixed(3) + ')';
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            requestAnimationFrame(frame);
        }

        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(frame);
    }

    /* ------------------------------------------------------------------
       主流程
       ------------------------------------------------------------------ */
    var state = {
        lines: [],
        index: 0,
        typing: false,
        finished: false,
        speed: 34,
        tone: 'normal',
        started: false,
        skipAll: false
    };

    // 每次开始新的一行都会 +1；旧行的异步回调发现序号变了就直接放弃，
    // 避免快速连点时出现“跳过一整句”的问题
    var lineSeq = 0;

    var els = {};

    function q(id) { return document.getElementById(id); }

    function buildDom(opt) {
        var stage = document.querySelector('.ec-stage');
        if (!stage) return;

        els.scroll = stage.querySelector('.ec-scroll');
        els.lines = stage.querySelector('.ec-lines');
        els.card = q('ecCard');
        els.progress = q('ecProgressBar');
        els.chapter = q('ecChapter');
        els.hint = q('ecHint');

        if (opt.code && els.chapter) els.chapter.textContent = opt.code;

        state.lines = Array.prototype.slice.call(els.lines.querySelectorAll('.ec-line'));
        state.lines.forEach(function (line) {
            line.dataset.raw = line.innerHTML;
            line.innerHTML = '';
        });
    }

    function scrollToBottom(smooth) {
        // 字幕容器已经用「绝对定位贴底」的方式堆叠，
        // 新的句子天然从下方往上顶，不需要再手动计算位移。
    }

    function setProgress() {
        if (!els.progress) return;
        var total = Math.max(1, state.lines.length);
        els.progress.style.width = Math.min(100, (state.index / total) * 100) + '%';
    }

    function typeLine(line, done) {
        var raw = line.dataset.raw;
        var isHtml = /<[a-z][\s\S]*>/i.test(raw);
        var mySeq = ++lineSeq;
        var completed = false;
        line.classList.add('in');

        function finishLine() {
            if (mySeq !== lineSeq) return;   // 已经切换到下一句，本次回调作废
            setTimeout(function () {
                if (mySeq === lineSeq) done();
            }, 620);
        }

        // 含 HTML 标签的行（如加了重音强调）直接整段淡入，避免破坏标签结构
        if (isHtml) {
            line.innerHTML = raw;
            Sound.lineBreak();
            state.completeNow = function () {
                if (completed) return;
                completed = true;
                finishLine();
            };
            setTimeout(function () {
                if (mySeq === lineSeq) state.completeNow();
            }, 1400);
            return;
        }

        var text = raw;
        var caret = document.createElement('span');
        caret.className = 'ec-caret';
        var textNode = document.createTextNode('');
        line.appendChild(textNode);
        line.appendChild(caret);

        var i = 0;
        var chPerTick = state.skipAll ? text.length : 1;

        // 点击快进时调用：立刻补全整句
        function complete() {
            if (completed) return;
            completed = true;
            textNode.nodeValue = text;
            if (caret.parentNode) caret.parentNode.removeChild(caret);
            state.typing = false;
            Sound.lineBreak();
            finishLine();
        }

        state.completeNow = complete;
        state.typing = true;

        function step() {
            if (mySeq !== lineSeq || completed) return;
            if (!state.typing) { complete(); return; }
            i += chPerTick;
            if (i >= text.length) {
                complete();
                return;
            }
            textNode.nodeValue = text.slice(0, i);
            if (i % 3 === 0) Sound.type();
            var delay = state.speed;
            var ch = text.charAt(i - 1);
            if ('。！？…'.indexOf(ch) >= 0) delay = 320;
            else if ('，、；：'.indexOf(ch) >= 0) delay = 150;
            setTimeout(step, delay);
        }
        step();
    }

    function next() {
        if (state.finished) return;
        if (state.typing) {
            // 正在打字 -> 立即补全
            state.typing = false;
            if (state.completeNow) state.completeNow();
            return;
        }
        if (state.index >= state.lines.length) { finish(); return; }

        if (state.index > 0) {
            var prev = state.lines[state.index - 1];
            if (prev) { prev.classList.remove('in'); prev.classList.add('done'); }
        }

        var line = state.lines[state.index];
        state.index++;
        setProgress();
        if (!line.textContent.trim() && !line.dataset.raw.trim()) {
            setTimeout(next, 260);
            return;
        }
        // 先把这一行放进布局（仍未播放的行完全不占高度），
        // 强制重排后再加 .in，淡入动画才会真正播放
        line.style.display = 'block';
        void line.offsetWidth;
        typeLine(line, next);
    }

    function finish() {
        if (state.finished) return;
        state.finished = true;
        recordEnding();
        setProgress();
        if (els.scroll) els.scroll.classList.add('faded');
        if (els.hint) els.hint.classList.add('hide');
        Sound.reveal(state.tone);
        setTimeout(function () {
            if (els.card) els.card.classList.add('show');
            Sound.card();
        }, 520);
    }

    /* 记录已看过的结局，桌面开始菜单会显示收集进度 */
    function recordEnding() {
        try {
            var id = (location.pathname.split('/').pop() || 'ending').replace(/\.html?$/i, '').toLowerCase();
            var arr = [];
            try { arr = JSON.parse(localStorage.getItem('arg.endings') || '[]') || []; } catch (e) { arr = []; }
            if (arr.indexOf(id) >= 0) return;
            arr.push(id);
            localStorage.setItem('arg.endings', JSON.stringify(arr));
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'arg-ending', id: id, count: arr.length }, '*');
                }
            } catch (e) {}
        } catch (e) {}
    }

    function firstInteract() {
        if (state.started) return;
        state.started = true;
        if (state.tone === 'bad') {
            Sound.start('bad');
        } else {
            Sound.start(state.tone);
        }
        Sound.boot(state.tone);
    }

    function bindActions() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.ec-btn');
            if (btn) {
                Sound.click();
                var act = btn.dataset.act;
                if (act === 'replay') { location.reload(); return; }
                if (act === 'desktop') {
                    if (window.parent && window.parent !== window) {
                        try { window.parent.postMessage({ type: 'arg-desktop' }, '*'); } catch (err) {}
                        return;
                    }
                    location.href = 'index.html';
                    return;
                }
                return;
            }
            if (els.card && els.card.classList.contains('show')) return;
            firstInteract();
            next();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                firstInteract();
                if (els.card && els.card.classList.contains('show')) return;
                next();
            }
            if (e.key === 'Escape') {
                state.skipAll = true;
                state.typing = false;
            }
        });
    }

    global.EC = {
        init: function (opt) {
            opt = opt || {};
            state.tone = opt.tone || 'normal';
            state.speed = opt.speed || 34;
            document.body.dataset.tone = state.tone;

            buildDom(opt);
            bindActions();
            startDust(q('ecDust'), state.tone, window.matchMedia('(prefers-reduced-motion: reduce)').matches);

            setTimeout(function () {
                if (els.chapter) els.chapter.classList.add('show');
                var mark = q('ecMark');
                if (mark) mark.classList.add('show');
                firstInteract();
                Sound.lineBreak();
                next();
            }, 900);
        }
    };
})(window);
