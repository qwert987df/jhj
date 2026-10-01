/* =========================================================================
   arg-ui.js —— 全站统一交互层
   1. 页面载入的浮入动画
   2. 按钮按下反馈（涟漪）
   3. 根据页面类型套用「里世界 / 故障」氛围
   4. 滚动进入视口的段落依次浮现
   5. 键盘可用性补充
   ========================================================================= */
(function () {
    'use strict';

    var reduceMotion = false;
    try {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    /* -------------------------------------------------- 页面类型识别 */
    // 注意：
    //   inside / ji / self / other / shencongliang / xueyue /
    //   zhennian / wangnian / enian / wuguanshangshen / lushen / kill
    //   这 12 个里世界页面交给 zhongshi.css 的中式恐怖主题，不再叠加 arg-noir；
    //   eye / yanguang 交给 horror.css。
    var NOIR = [
        'wenjian', 'black', 'heart', 'niantou', 'wangyu', 'linwan'
    ];
    // eye / yanguang 已经由 horror.css + horror.js 提供更完整的恐怖氛围层，这里不再叠加
    var GLITCH = ['god', 'wugan1', 'em'];

    function pageName() {
        var f = location.pathname.split('/').pop() || 'index.html';
        return f.replace(/\.html?$/i, '').toLowerCase();
    }

    function applyMood() {
        var name = pageName();
        if (NOIR.indexOf(name) >= 0) document.body.classList.add('arg-noir');
        if (GLITCH.indexOf(name) >= 0) { document.body.classList.add('arg-noir', 'arg-glitch'); }
    }

    /* -------------------------------------------------- 载入浮入 */
    function ready() {
        requestAnimationFrame(function () {
            document.body.classList.add('arg-ready');
        });
    }

    /* -------------------------------------------------- 按钮涟漪 */
    function ripple(e) {
        var el = e.currentTarget;
        if (!el || el.disabled) return;
        if (el.offsetWidth > 420 || el.offsetHeight > 200) return;

        var r = el.getBoundingClientRect();
        var size = Math.max(r.width, r.height) * 1.6;
        var span = document.createElement('span');
        span.className = 'arg-ripple';
        span.style.width = span.style.height = size + 'px';
        span.style.left = (e.clientX - r.left - size / 2) + 'px';
        span.style.top = (e.clientY - r.top - size / 2) + 'px';

        var pos = getComputedStyle(el).position;
        if (pos === 'static') el.style.position = 'relative';
        var overflow = getComputedStyle(el).overflow;
        if (overflow === 'visible') el.style.overflow = 'hidden';

        el.appendChild(span);
        setTimeout(function () { span.remove(); }, 620);
    }

    function bindRipples() {
        if (reduceMotion) return;
        var nodes = document.querySelectorAll(
            '.ji-btn, .self-btn, .jump-btn, .link-jump a, #search-btn, #callBtn, ' +
            '#submitBtn, #decryptBtn, #confirm-btn, #btnConfirm, #btnCancel, ' +
            '.modal-buttons button, .submit-btn'
        );
        Array.prototype.forEach.call(nodes, function (el) {
            el.addEventListener('pointerdown', ripple);
        });
    }

    /* -------------------------------------------------- 段落浮现 */
    function bindReveal() {
        if (reduceMotion || !('IntersectionObserver' in window)) return;
        var targets = document.querySelectorAll(
            '.content-wrap h2, .content-wrap h3, .article-body p, ' +
            '.section-block, .part-block, .info-block, .header-card'
        );
        if (!targets.length) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                en.target.classList.add('arg-visible');
                io.unobserve(en.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

        Array.prototype.forEach.call(targets, function (el) {
            // 已经在首屏且没有滚动空间的页面不做处理，避免内容“消失”
            el.classList.add('arg-reveal');
            io.observe(el);
        });

        // 兜底：无论如何 1.2 秒后全部显示
        setTimeout(function () {
            Array.prototype.forEach.call(targets, function (el) {
                el.classList.add('arg-visible');
            });
        }, 1200);
    }

    /* -------------------------------------------------- 问卷：整行可点 */
    function bindOptions() {
        Array.prototype.forEach.call(document.querySelectorAll('.option'), function (el) {
            var input = el.querySelector('input');
            if (!input) return;
            el.addEventListener('click', function (e) {
                if (e.target === input) return;
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }

    /* ==================================================================
       透镜页面的输入框修复
       ------------------------------------------------------------------
       里世界的页面都是「模糊层 + 透镜清晰层」两层 DOM：
       你实际打字的是模糊层里的输入框，而透镜里显示的是清晰层里那个
       **独立的、永远是空的** 输入框 —— 所以打进去的字根本看不见。
       这里做两件事：
         1. 把两层的输入框按顺序配对，实时互相镜像（含程序性清空）
         2. 输入框获得焦点时，临时把整个模糊层变清晰，打字全程可读
       ================================================================== */
    function bindLensInputs() {
        var PAIRS = [
            ['.text-blur', '.text-clear'],
            ['#base', '#blur-layer']
        ];
        var pairs = [];

        PAIRS.forEach(function (sel) {
            var a = document.querySelector(sel[0]);
            var b = document.querySelector(sel[1]);
            if (!a || !b) return;
            var ia = a.querySelectorAll('input, textarea');
            var ib = b.querySelectorAll('input, textarea');
            if (!ia.length || ia.length !== ib.length) return;
            Array.prototype.forEach.call(ia, function (el, i) {
                pairs.push([el, ib[i]]);
            });
        });

        if (!pairs.length) return;

        function copy(src, dst) {
            if (dst.value !== src.value) dst.value = src.value;
            if (dst.scrollLeft !== src.scrollLeft) dst.scrollLeft = src.scrollLeft;
        }
        function syncBoth() {
            pairs.forEach(function (p) { copy(p[0], p[1]); copy(p[1], p[0]); });
        }

        pairs.forEach(function (p) {
            p[0].addEventListener('input', syncBoth);
            p[1].addEventListener('input', syncBoth);
            p[0].addEventListener('scroll', syncBoth);
            p[1].addEventListener('scroll', syncBoth);

            // 聚焦打字时把画面变清晰，失焦后恢复朦胧
            p[0].addEventListener('focus', function () { document.body.classList.add('arg-typing'); });
            p[0].addEventListener('blur', function () { document.body.classList.remove('arg-typing'); });

            // 指针移到输入框上时先减半模糊，靠近就能看清要点的位置
            var near = p[0].parentElement;
            if (near && near !== document.body) {
                near.addEventListener('pointerenter', function () {
                    document.body.classList.add('arg-search-hot');
                });
                near.addEventListener('pointerleave', function () {
                    document.body.classList.remove('arg-search-hot');
                });
            }
        });

        // 有些页面会用代码直接清空输入框（不会触发 input 事件），这里做个兜底对齐
        setInterval(syncBoth, 300);
    }
    /* -------------------------------------------------- 键盘可用性 */

    /* ==================================================================
       全局提示：把阻塞式 alert 换成页内提示条
       ------------------------------------------------------------------
       原站有 21 个文件在用 alert()。在窗口化桌面里，系统弹窗会把整个
       页面冻住、还会盖住桌面窗口，体验很割裂。这里统一换成会自动消失、
       点一下就关的提示条。原生 alert 仍保留在 window.__argAlert。
       ================================================================== */
    function installAlert() {
        var nativeAlert = window.alert;
        window.__argAlert = nativeAlert;
        var current = null;

        function dismiss(wrap, timer) {
            if (timer) clearTimeout(timer);
            wrap.classList.remove('show');
            setTimeout(function () {
                wrap.remove();
                if (current === wrap) current = null;
            }, 340);
        }

        function show(msg) {
            if (current) { current.remove(); current = null; }

            var wrap = document.createElement('div');
            wrap.className = 'arg-alert-wrap';
            var box = document.createElement('div');
            box.className = 'arg-alert';
            var mark = document.createElement('span');
            mark.className = 'arg-alert-mark';
            mark.textContent = '!';
            var text = document.createElement('span');
            text.className = 'arg-alert-text';
            text.textContent = String(msg == null ? '' : msg);
            box.appendChild(mark);
            box.appendChild(text);
            wrap.appendChild(box);
            document.body.appendChild(wrap);

            requestAnimationFrame(function () { wrap.classList.add('show'); });
            current = wrap;

            var timer = setTimeout(function () { dismiss(wrap, timer); }, 2800);
            wrap.addEventListener('click', function () { dismiss(wrap, timer); });
        }

        window.alert = function (msg) {
            try { show(msg); }
            catch (e) { try { nativeAlert.call(window, msg); } catch (e2) {} }
            try { console.log('[alert]', msg); } catch (e3) {}
        };
    }

    /* 补一个内联 favicon，省掉每个页面都在控制台报的 /favicon.ico 404 */
    function installFavicon() {
        if (document.querySelector('link[rel~="icon"]')) return;
        var svg =
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
            "<rect width='64' height='64' rx='13' fill='#a8201a'/>" +
            "<rect x='17' y='17' width='30' height='30' rx='4' fill='none'" +
            " stroke='#f8efd8' stroke-width='5'/>" +
            "<circle cx='32' cy='32' r='4' fill='#f8efd8'/></svg>";
        var link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        document.head.appendChild(link);
    }

    /* 接收桌面托盘发来的静音指令：静掉页面里所有 <audio>/<video>，
       并把状态广播给本页的音效引擎（horror.js / zhongshi.js 会监听）。 */
    function installMuteBridge() {
        function apply(m) {
            document.documentElement.dataset.argMuted = m ? '1' : '';
            Array.prototype.forEach.call(document.querySelectorAll('audio, video'), function (el) {
                try { el.muted = !!m; } catch (e) {}
            });
            try {
                window.dispatchEvent(new CustomEvent('arg-mute', { detail: { muted: !!m } }));
            } catch (e) {}
        }
        window.addEventListener('message', function (e) {
            var d = e.data;
            if (!d || d.type !== 'arg-mute') return;
            apply(d.muted);
        });
        window.ARG_APPLY_MUTE = apply;
        if (document.documentElement.dataset.argMuted === '1') apply(true);
    }

    function bindKeyboard() {
        Array.prototype.forEach.call(document.querySelectorAll('.desktop-icon, .file-item, .hot-head'), function (el) {
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        });
    }

    function boot() {
        applyMood();
        installAlert();
        installFavicon();
        installMuteBridge();
        ready();
        bindRipples();
        bindReveal();
        bindOptions();
        bindLensInputs();
        bindKeyboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
