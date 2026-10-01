/* =========================================================================
   keywords.js —— 把「可以搜索的关键词」在正文里标出来并加深

   关键词来自两处搜索逻辑：
     jingyu.html 的 doSearch()   —— 医院官网搜索框
     inside.html 的 searchMap    —— 里世界搜索框
   凡是正文里出现这些词，就用 <mark class="arg-kw"> 圈出来，
   玩家一眼就能看出「这个词是可以拿去搜的」。

   另外用 MutationObserver 兜住动态插入的内容（微信聊天记录、损坏病历的滚动日志等）。
   ========================================================================= */
(function () {
    'use strict';

    var KEYWORDS = [
        /* ---- jingyu.html 搜索框 ---- */
        '静心疗愈，守护心灵',
        '18305564297806',
        '静心科',
        '抑郁障碍',
        '思维循环',
        '视觉干扰',
        '深度治疗',
        '心理修复',
        '沈从良',
        '抑郁',
        '念头',
        '思维',
        '静心',
        '王羽',
        '林晚',
        '五感',
        'research',
        'heart',
        'god',
        /* ---- inside.html 里世界搜索框 ---- */
        '无官上神',
        '白鹿山',
        '献祭',
        '血约',
        '祭讫',
        '真念',
        '妄念',
        '恶念',
        '山神',
        '鹿神',
        '白鹿'
    ];

    // 去重 + 按长度降序（长的优先匹配，避免「抑郁障碍」被拆成「抑郁」+「障碍」）
    var WORDS = KEYWORDS
        .filter(function (w, i, a) { return w && a.indexOf(w) === i; })
        .sort(function (a, b) { return b.length - a.length; });

    var RE = new RegExp(WORDS.map(function (w) {
        return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|'), 'g');

    var SKIP_TAGS = {
        SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1,
        SELECT: 1, OPTION: 1, TITLE: 1, MARK: 1, CODE: 1
    };

    // 单页上限：防止极端的重复文本页（例如满屏重复字的演出页）
    // 生成上万个节点把浏览器拖死
    var MAX_MARKS = 400;
    var markCount = 0;
    var markedOnce = {};   // 记录哪些词已经出现过（用于「首次圈点」样式）

    function shouldSkip(el) {
        if (!el || el.nodeType !== 1) return false;
        if (SKIP_TAGS[el.tagName]) return true;
        if (el.classList && el.classList.contains('arg-kw')) return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function collectTextNodes(root, out) {
        if (!root) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                for (var p = node.parentNode; p && p !== root; p = p.parentNode) {
                    if (shouldSkip(p)) return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var n;
        while ((n = walker.nextNode())) out.push(n);
    }

    function markTextNode(node) {
        if (markCount >= MAX_MARKS) return 0;
        var text = node.nodeValue;
        RE.lastIndex = 0;
        if (!RE.test(text)) return 0;
        RE.lastIndex = 0;

        var frag = document.createDocumentFragment();
        var last = 0, m, count = 0;
        while ((m = RE.exec(text))) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            var mk = document.createElement('mark');
            // 第一次出现给底纹（朱笔圈点），之后只加粗 + 下划线，避免整页花掉
            mk.className = markedOnce[m[0]] ? 'arg-kw' : 'arg-kw arg-kw-first';
            markedOnce[m[0]] = true;
            mk.textContent = m[0];
            frag.appendChild(mk);
            last = m.index + m[0].length;
            count++;
            markCount++;
            if (markCount >= MAX_MARKS) break;
            if (m[0] === '') RE.lastIndex++;   // 防御：空匹配
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        if (count) node.parentNode.replaceChild(frag, node);
        return count;
    }

    function mark(root) {
        var nodes = [];
        collectTextNodes(root || document.body, nodes);
        var total = 0;
        for (var i = 0; i < nodes.length; i++) {
            try { total += markTextNode(nodes[i]); } catch (e) {}
        }
        return total;
    }

    /* ---------------- 动态内容兜底 ---------------- */
    var pending = [];
    var scheduled = false;

    function flush() {
        scheduled = false;
        var list = pending;
        pending = [];
        for (var i = 0; i < list.length; i++) {
            var n = list[i];
            if (!n.isConnected) continue;
            if (n.nodeType === 1) {
                if (shouldSkip(n)) continue;
                if (n.classList && n.classList.contains('arg-kw')) continue;
                mark(n);
            } else if (n.nodeType === 3 && n.parentNode) {
                markTextNode(n);
            }
        }
    }

    function observe() {
        if (!('MutationObserver' in window)) return;
        var mo = new MutationObserver(function (records) {
            for (var i = 0; i < records.length; i++) {
                var added = records[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType === 1 && n.classList && n.classList.contains('arg-kw')) continue;
                    pending.push(n);
                }
            }
            if (!scheduled && pending.length) {
                scheduled = true;
                setTimeout(flush, 60);
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    function boot() {
        mark(document.body);
        observe();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.ARG_KEYWORDS = { list: WORDS.slice(), scan: mark };
})();
