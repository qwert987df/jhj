/* =========================================================================
   zhongshi.js —— 里世界「中式恐怖」装饰与音效
   装饰：白灯笼 / 竖排挽联 / 香炉三炷香 / 纸灰飘落 / 朱砂印
   音效：木鱼、铜铃、水滴、远处低吟（全部实时合成，不引入音频文件）
   所有装饰层 pointer-events:none，不影响任何点击与输入。
   ========================================================================= */
(function () {
    'use strict';

    var reduceMotion = false;
    try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    /* ================================================================
       音效：中式丧仪里最典型的几种声音
       ================================================================ */
    var Snd = (function () {
        var ctx = null, master = null, started = false, muted = false;

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

        function noiseBuf(sec) {
            var len = Math.max(1, Math.floor(ctx.sampleRate * sec));
            var b = ctx.createBuffer(1, len, ctx.sampleRate);
            var d = b.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            return b;
        }

        function env(node, t, attack, dur, peak) {
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
            g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
            node.connect(g);
            g.connect(master);
            return g;
        }

        /* 木鱼：一记闷响 */
        function woodblock() {
            var c = ac(); if (!c || muted) return;
            var t = c.currentTime;
            var o = c.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(230, t);
            o.frequency.exponentialRampToValueAtTime(120, t + 0.14);
            env(o, t, 0.003, 0.16, 0.22);
            o.start(t); o.stop(t + 0.36);

            var src = c.createBufferSource();
            src.buffer = noiseBuf(0.12);
            var f = c.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = 900;
            f.Q.value = 1.2;
            src.connect(f);
            env(f, t, 0.002, 0.1, 0.1);
            src.start(t); src.stop(t + 0.16);
        }

        /* 铜铃：几个不成谐波关系的泛音，衰减很长 */
        function bell() {
            var c = ac(); if (!c || muted) return;
            var t = c.currentTime;
            [1180, 1770, 2380, 3240, 4720].forEach(function (f, i) {
                var o = c.createOscillator();
                o.type = 'sine';
                o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
                env(o, t + i * 0.004, 0.004, 2.2 - i * 0.28, 0.1 / (1 + i * 0.7));
                o.start(t + i * 0.004);
                o.stop(t + 2.6);
            });
        }

        /* 水滴：一声空响 */
        function drop() {
            var c = ac(); if (!c || muted) return;
            var t = c.currentTime;
            var o = c.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(1400 + Math.random() * 500, t);
            o.frequency.exponentialRampToValueAtTime(420, t + 0.1);
            env(o, t, 0.002, 0.14, 0.13);
            o.start(t); o.stop(t + 0.3);
        }

        /* 远处的低吟：极低的三层正弦 + 缓慢起伏 */
        function drone() {
            var c = ac(); if (!c) return;
            var g = c.createGain();
            g.gain.value = 0;
            g.connect(master);
            [58.3, 87.3, 116.5].forEach(function (f, i) {
                var o = c.createOscillator();
                o.type = i === 0 ? 'sine' : 'triangle';
                o.frequency.value = f;
                var og = c.createGain();
                og.gain.value = i === 0 ? 0.5 : 0.14;
                o.connect(og); og.connect(g);
                o.start();
            });
            var lfo = c.createOscillator();
            lfo.frequency.value = 0.04;
            var lg = c.createGain();
            lg.gain.value = 0.035;
            lfo.connect(lg); lg.connect(g.gain);
            lfo.start();
            g.gain.linearRampToValueAtTime(0.07, c.currentTime + 8);
        }

        /* 一串纸钱被风吹动 */
        function rustle() {
            var c = ac(); if (!c || muted) return;
            var t = c.currentTime;
            var src = c.createBufferSource();
            src.buffer = noiseBuf(0.9);
            var f = c.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.value = 2600;
            src.connect(f);
            var g = env(f, t, 0.25, 0.7, 0.05);
            try {
                var lfo = c.createOscillator();
                lfo.frequency.value = 11;
                var lg = c.createGain();
                lg.gain.value = 0.04;
                lfo.connect(lg); lg.connect(g.gain);
                lfo.start(t); lfo.stop(t + 1);
            } catch (e) {}
            src.start(t); src.stop(t + 1);
        }

        function at(fn, min, max) {
            var wait = min + Math.random() * (max - min);
            return setTimeout(function () {
                fn();
                at(fn, min, max);
            }, wait);
        }

        return {
            start: function () {
                if (started) return;
                started = true;
                if (!ac()) return;
                drone();
                at(woodblock, 3800, 9000);   // 木鱼：慢
                at(bell, 11000, 24000);      // 铃：很久才响一次
                at(drop, 6000, 15000);       // 水滴
                at(rustle, 14000, 30000);    // 纸钱
            },
            woodblock: woodblock,
            bell: bell,
            drop: drop,
            rustle: rustle,
            mute: function (m) {
                muted = m;
                if (ctx) {
                    try { master.gain.linearRampToValueAtTime(m ? 0 : 0.34, ctx.currentTime + 0.3); } catch (e) {}
                }
            }
        };
    })();

    /* ================================================================
       装饰
       ================================================================ */
    function make(tag, cls, html) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (html) d.innerHTML = html;
        return d;
    }

    function buildLanterns() {
        ['is-left', 'is-right'].forEach(function (side, i) {
            var html =
                '<span class="zs-lantern-rope"></span>' +
                '<span class="zs-lantern-body"><em>' + (i === 0 ? '静' : '愈') + '</em></span>' +
                '<span class="zs-lantern-tail"></span>';
            document.body.appendChild(make('div', 'zs-lantern ' + side, html));
        });
    }

    /* 烛光呼吸层：用叠加暖光代替给根元素加 filter，
       避免 position:fixed 的装饰层被改成相对整个文档定位 */
    function buildCandle() {
        document.body.appendChild(make('div', 'zs-candle'));
    }

    function buildCouplets() {
        document.body.appendChild(make('div', 'zs-couplet is-left', '五感奉于神明'));
        document.body.appendChild(make('div', 'zs-couplet is-right', '恶念终为真念'));
    }

    function buildCenser() {
        var censer = make('div', 'zs-censer',
            '<span class="zs-sticks"><i></i><i></i><i></i></span><span class="zs-bowl"></span>');
        document.body.appendChild(censer);

        if (reduceMotion) return;
        // 三缕烟，各自错开上升
        var tops = [0.28, 0.5, 0.72];
        for (var s = 0; s < 3; s++) {
            for (var k = 0; k < 3; k++) {
                var smoke = make('span', 'zs-smoke');
                smoke.style.left = 'calc(50% + ' + ((tops[s] - 0.5) * 118).toFixed(0) + 'px)';
                smoke.style.animationDelay = (-(k * 2.5 + s * 0.8)).toFixed(1) + 's';
                document.body.appendChild(smoke);
            }
        }
    }

    function buildSeal() {
        var name = document.querySelector('.hospital-name');
        if (!name || name.querySelector('.zs-seal')) return;
        name.appendChild(make('span', 'zs-seal', '静愈'));
    }

    /* 里世界的这几个页面（enian / wangnian / kill / wuguanshangshen / xueyue / zhennian）
       是被搜索打开的资料页，自己不产生任何跳转；
       作者原本指望玩家用浏览器「后退」，但站点里的反作弊脚本把后退禁掉了。
       这里补一个返回入口 —— 但**只回到里世界的首页 inside.html**：
       god 之后的流程是单向的，不能从这里回到桌面或正常医院页面。 */
    function buildExit() {
        if (document.querySelector('.back-index, .back-home, #backHome, .zs-exit')) return;
        // inside.html 本身就是里世界首页，不用给自己加一个「回到里世界」
        if (/\/inside\.html?$/i.test(location.pathname) || location.pathname === '') return;
        var a = make('div', 'zs-exit', '回到里世界');
        a.setAttribute('role', 'link');
        a.setAttribute('tabindex', '0');
        a.addEventListener('click', function () { location.href = 'inside.html'; });
        a.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                location.href = 'inside.html';
            }
        });
        document.body.appendChild(a);
    }

    /* 灯笼靠近鼠标时淡出，避免挡住正文和关键词 */
    function bindLanternFade() {
        var lanterns = Array.prototype.slice.call(document.querySelectorAll('.zs-lantern'));
        if (!lanterns.length) return;

        var ticking = false;
        var lastX = -9999, lastY = -9999;

        function update() {
            ticking = false;
            lanterns.forEach(function (el) {
                var r = el.getBoundingClientRect();
                var cx = r.left + r.width / 2;
                var cy = r.top + r.height / 2;
                var d = Math.hypot(lastX - cx, lastY - cy);
                // 近处完全淡出（几乎看不见），远处恢复
                var near = 150, far = 340;
                var t = Math.max(0, Math.min(1, (d - near) / (far - near)));
                el.style.opacity = (0.08 + 0.92 * t).toFixed(3);
            });
        }

        document.addEventListener('pointermove', function (e) {
            lastX = e.clientX;
            lastY = e.clientY;
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        // 鼠标离开页面时恢复
        document.addEventListener('pointerleave', function () {
            lanterns.forEach(function (el) { el.style.opacity = '1'; });
        });
    }

    /* 纸灰：缓慢飘落的灰白碎片 */
    function buildAsh() {
        if (reduceMotion) return;
        var cv = make('canvas');
        cv.id = 'zsAsh';
        document.body.appendChild(cv);
        var ctx2 = cv.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0, parts = [];
        // 纸底上飘的是深色的纸灰 / 香灰；夜色版反过来用浅灰
        var ashColor = document.body.classList.contains('zs-night')
            ? 'rgba(214, 206, 190, '
            : 'rgba(62, 50, 38, ';
        var ashAlpha = document.body.classList.contains('zs-night') ? 1 : 0.9;

        function resize() {
            W = cv.width = Math.floor(window.innerWidth * dpr);
            H = cv.height = Math.floor(window.innerHeight * dpr);
            cv.style.width = window.innerWidth + 'px';
            cv.style.height = window.innerHeight + 'px';
            var n = Math.round(Math.min(56, window.innerWidth / 26));
            parts = [];
            for (var i = 0; i < n; i++) {
                parts.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: (Math.random() * 2.4 + 0.7) * dpr,
                    vy: (Math.random() * 0.28 + 0.10) * dpr,
                    sway: Math.random() * Math.PI * 2,
                    swaySpd: 0.008 + Math.random() * 0.012,
                    amp: (8 + Math.random() * 22) * dpr,
                    a: 0.16 + Math.random() * 0.34,
                    rot: Math.random() * Math.PI,
                    vr: (Math.random() - 0.5) * 0.02
                });
            }
        }

        function frame() {
            ctx2.clearRect(0, 0, W, H);
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                p.y += p.vy;
                p.sway += p.swaySpd;
                p.rot += p.vr;
                if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
                var x = p.x + Math.sin(p.sway) * p.amp;
                ctx2.save();
                ctx2.translate(x, p.y);
                ctx2.rotate(p.rot);
                ctx2.fillStyle = ashColor + (p.a * ashAlpha).toFixed(3) + ')';
                ctx2.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
                ctx2.restore();
            }
            requestAnimationFrame(frame);
        }

        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(frame);
    }

    /* 偶发的「闹鬼」瞬间：画面轻微错位 + 纸钱声 */
    function hauntLoop() {
        var wait = 22000 + Math.random() * 40000;
        setTimeout(function () {
            document.body.classList.add('zs-haunt');
            Snd.rustle();
            setTimeout(function () { document.body.classList.remove('zs-haunt'); }, 460);
            if (Math.random() < 0.4) setTimeout(function () { Snd.bell(); }, 220);
            hauntLoop();
        }, wait);
    }

    function boot() {
        document.body.classList.add('zs-page');
        buildCandle();
        buildLanterns();
        bindLanternFade();
        buildCouplets();
        buildCenser();
        buildSeal();
        buildExit();
        buildAsh();
        if (!reduceMotion) hauntLoop();

        var kick = function () { Snd.start(); };
        document.addEventListener('pointerdown', kick);
        document.addEventListener('keydown', kick);
        setTimeout(Snd.start, 200);

        // 桌面托盘的静音开关
        window.addEventListener('arg-mute', function (e) {
            Snd.mute(!!(e.detail && e.detail.muted));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.ZHONGSHI = { sound: Snd };
})();
