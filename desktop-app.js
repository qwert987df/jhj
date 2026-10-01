/* =========================================================================
   desktop-app.js
   让子页面自己知道「我是被窗口化桌面打开的」，从而：
   1. 隐藏自带的蓝色标题栏（避免出现两个关闭键）
   2. 把「最小化 / 返回桌面」改成收起窗口，而不是在窗口里再套一层桌面
   3. 把页面标题告诉桌面窗口
   不依赖父页面访问子文档，因此 file:// 或跨域嵌入时同样有效。
   ========================================================================= */
(function () {
    'use strict';

    var IN_WINDOW = false;
    try { IN_WINDOW = window.self !== window.top; } catch (e) { IN_WINDOW = true; }

    function post(msg) {
        try { window.parent.postMessage(msg, '*'); } catch (e) {}
    }

    var WINDOW_CSS =
        '.win-titlebar{display:none !important;}' +
        'html,body{height:100% !important;}' +
        '.win-frame{height:100% !important;}' +
        '.wechat-wrap{height:100% !important;}' +
        '::-webkit-scrollbar{width:11px;height:11px;}' +
        '::-webkit-scrollbar-thumb{' +
            'background:rgba(122,148,190,.45);border-radius:9px;' +
            'border:3px solid transparent;background-clip:content-box;}' +
        '::-webkit-scrollbar-thumb:hover{background:rgba(140,175,230,.8);background-clip:content-box;}' +
        '::-webkit-scrollbar-track{background:transparent;}' +
        '::-webkit-scrollbar-corner{background:transparent;}';

    function injectStyle() {
        if (document.getElementById('arg-window-style')) return;
        var st = document.createElement('style');
        st.id = 'arg-window-style';
        st.textContent = WINDOW_CSS;
        (document.head || document.documentElement).appendChild(st);
    }

    /* 捕获阶段拦截，早于页面自身的 inline onclick 执行 */
    function intercept() {
        document.addEventListener('click', function (e) {
            var t = e.target;
            if (!t || !t.closest) return;

            var hit = t.closest('.win-btn-min') ||
                      t.closest('.win-btn-close') ||
                      t.closest('[data-arg-min]');

            if (!hit) {
                var back = t.closest('[onclick*="index.html"]');
                if (back && !t.closest('[data-arg-keep]')) hit = back;
            }
            if (!hit) return;

            e.preventDefault();
            e.stopPropagation();
            post({ type: 'arg-minimize' });
        }, true);
    }

    function reportTitle() {
        post({ type: 'arg-title', title: document.title || '' });
    }

    /* 让子页面知道窗口大致的可用高度，方便做自适应 */
    function reportSize() {
        post({ type: 'arg-size', w: window.innerWidth, h: window.innerHeight });
    }

    function boot() {
        if (!IN_WINDOW) return;
        document.documentElement.classList.add('arg-in-window');
        injectStyle();
        intercept();
        reportTitle();
        reportSize();
        window.addEventListener('load', function () {
            reportTitle();
            reportSize();
        });
        window.addEventListener('resize', reportSize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
