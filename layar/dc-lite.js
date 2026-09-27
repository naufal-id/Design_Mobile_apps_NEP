/*
 * dc-lite: runtime kecil untuk layar prototipe NEP hasil ekspor kanvas.
 * - Merender layar dinamis (<template id="dc-template"> + <script id="dc-logic">):
 *   {{ path }}, <sc-for list as>, <sc-if value>, onClick, setState.
 * - Menangani tautan: "#" belum punya tujuan; di halaman ringkasan, tautan antarlayar
 *   dikirim ke halaman induk supaya kolom tujuan yang disorot.
 * - Melaporkan tinggi layar ke halaman induk untuk mode "Coba sebagai HP".
 */
(function () {
  'use strict';

  // Hosting seperti Netlify bisa menyajikan halaman tanpa akhiran .html; samakan namanya.
  function screenName(path) {
    var name = decodeURIComponent((path || '').split(/[?#]/)[0].split('/').pop() || '');
    return name && !/\.html$/.test(name) ? name + '.html' : name;
  }
  var here = screenName(location.pathname);
  var inRingkasan = window.name === 'nep-ringkas';

  function post(msg) {
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
    } catch (e) { /* halaman dibuka sendiri */ }
  }

  var toastEl = null;
  var toastTimer = 0;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);max-width:300px;' +
        'padding:10px 16px;border-radius:999px;background:rgba(0,0,0,0.82);color:#FFFFFF;font:600 14px/1.35 system-ui,sans-serif;' +
        'text-align:center;z-index:9999;pointer-events:none;opacity:0;transition:opacity .2s';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; }, 1600);
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href === '#' || href === '') {
      e.preventDefault();
      toast('Belum ada di prototipe ini');
      return;
    }
    if (inRingkasan && !/^[a-z]+:/i.test(href)) {
      e.preventDefault();
      post({ nep: 'nav', to: screenName(href), from: here });
    }
  });

  function reportSize() {
    var root = document.getElementById('dc-root');
    var el = root && root.firstElementChild;
    post({ nep: 'size', file: here, h: el ? el.offsetHeight : document.documentElement.scrollHeight });
  }

  var tpl = document.getElementById('dc-template');
  var logicEl = document.getElementById('dc-logic');
  var mount = document.getElementById('dc-root');
  if (!tpl || !logicEl || !mount) {
    window.addEventListener('load', reportSize);
    return;
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render(); });
  }

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = null; }
    setState(patch) {
      var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state || {}, next);
      schedule();
    }
    forceUpdate() { schedule(); }
  }

  var Component = new Function('DCLogic', logicEl.textContent + '\n;return Component;')(DCLogic);
  var inst = new Component({});

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }

  function kids(node, scope, out) {
    var list = node.childNodes;
    for (var i = 0; i < list.length; i++) build(list[i], scope, out);
  }

  function build(node, scope, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      out.push(document.createTextNode(t.indexOf('{{') >= 0 ? interp(t, scope) : t));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var lm = WHOLE.exec(node.getAttribute('list') || '');
      var items = lm ? lookup(lm[1], scope) : null;
      var as = node.getAttribute('as') || 'item';
      (items || []).forEach(function (item, idx) {
        var s = Object.create(scope);
        s[as] = item;
        s.$index = idx;
        kids(node, s, out);
      });
      return;
    }
    if (tag === 'sc-if') {
      var vm = WHOLE.exec(node.getAttribute('value') || '');
      if (vm && lookup(vm[1], scope)) kids(node, scope, out);
      return;
    }
    var el = document.createElementNS(node.namespaceURI, tag);
    for (var i = 0; i < node.attributes.length; i++) {
      var at = node.attributes[i];
      var name = at.name;
      var val = at.value;
      if (name.indexOf('hint-') === 0) continue;
      if (/^on[a-z]+$/.test(name)) {
        var hm = WHOLE.exec(val);
        var fn = hm ? lookup(hm[1], scope) : null;
        if (typeof fn === 'function') {
          el.__dcHandlers = el.__dcHandlers || {};
          el.__dcHandlers[name.slice(2)] = fn;
        }
        continue;
      }
      if (val.indexOf('{{') >= 0) {
        var wm = WHOLE.exec(val);
        var v = wm ? lookup(wm[1], scope) : interp(val, scope);
        if (v === false || v == null) continue;
        val = v === true ? '' : String(v);
      }
      el.setAttribute(name, val);
    }
    var sub = [];
    kids(node, scope, sub);
    for (var j = 0; j < sub.length; j++) el.appendChild(sub[j]);
    out.push(el);
  }

  function morph(parent, next) {
    var prev = Array.prototype.slice.call(parent.childNodes);
    for (var i = 0; i < next.length; i++) {
      var n = next[i];
      var o = prev[i];
      if (!o) { parent.appendChild(n); continue; }
      if (o.nodeType !== n.nodeType || (o.nodeType === 1 && (o.namespaceURI !== n.namespaceURI || o.localName !== n.localName))) {
        parent.replaceChild(n, o);
        continue;
      }
      if (o.nodeType === 3) {
        if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
        continue;
      }
      if (o.nodeType !== 1) continue;
      for (var a = o.attributes.length - 1; a >= 0; a--) {
        var oa = o.attributes[a];
        if (!n.hasAttribute(oa.name)) o.removeAttribute(oa.name);
      }
      for (var b = 0; b < n.attributes.length; b++) {
        var na = n.attributes[b];
        if (o.getAttribute(na.name) !== na.value) o.setAttribute(na.name, na.value);
      }
      o.__dcHandlers = n.__dcHandlers;
      morph(o, Array.prototype.slice.call(n.childNodes));
    }
    for (var k = prev.length - 1; k >= next.length; k--) parent.removeChild(prev[k]);
  }

  ['click', 'input', 'change'].forEach(function (type) {
    mount.addEventListener(type, function (e) {
      for (var node = e.target; node && node !== mount; node = node.parentNode) {
        if (node.__dcHandlers && node.__dcHandlers[type]) {
          node.__dcHandlers[type].call(inst, e);
          return;
        }
      }
    });
  });

  function render() {
    var vals = (inst.renderVals && inst.renderVals()) || {};
    var out = [];
    kids(tpl.content, vals, out);
    morph(mount, out);
  }

  render();
  if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
  window.addEventListener('beforeunload', function () {
    if (typeof inst.componentWillUnmount === 'function') inst.componentWillUnmount();
  });
  window.addEventListener('load', reportSize);
})();
