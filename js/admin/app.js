/* =====================================================================
   MIRACLE — admin shell. Auth, hash router, API client, shared UI.
   Modules self-register via ADMIN.register(route, def) — see
   .design/ADMIN-CONTRACT.md for the full contract.
   ===================================================================== */
(function () {
  "use strict";
  var TOKEN_KEY = "miracle_admin_token";
  var token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}

  var modules = {};
  var currentRoute = "";
  var state = { products: null, orders: null, companies: null, journal: null };
  var loadedAt = { products: 0, orders: 0, companies: 0, journal: 0 };
  var CACHE_MS = 30000;

  /* ---------------- api ---------------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = {};
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) { logout(); throw new Error(j.error || "Session expirée — reconnectez-vous."); }
        if (!r.ok) throw new Error(j.error || "Erreur serveur (" + r.status + ").");
        return j;
      });
    });
  }

  function makeLoader(key, path, prop) {
    return function (force) {
      if (!force && state[key] && Date.now() - loadedAt[key] < CACHE_MS) {
        return Promise.resolve(state[key]);
      }
      return api(path).then(function (j) {
        state[key] = j[prop] || [];
        loadedAt[key] = Date.now();
        return state[key];
      });
    };
  }
  var loadProducts = makeLoader("products", "/api/products", "products");
  var loadOrders = makeLoader("orders", "/api/orders", "orders");
  var loadCompanies = makeLoader("companies", "/api/companies", "companies");
  var loadJournal = makeLoader("journal", "/api/journal?all=1", "articles");

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return (Math.round((Number(n) || 0) * 100) / 100) + " DT"; }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
      + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function uid() { return Math.random().toString(36).slice(2, 8); }

  var STATUS = {
    nouvelle:       { label: "Nouvelle",       cls: "nouvelle" },
    confirmee:      { label: "Confirmée",      cls: "confirmee" },
    en_preparation: { label: "En préparation", cls: "prep" },
    expediee:       { label: "Expédiée",       cls: "expediee" },
    livree:         { label: "Livrée",         cls: "livree" },
    annulee:        { label: "Annulée",        cls: "annulee" },
    retour:         { label: "Retour",         cls: "retour" }
  };
  function statusBadge(key) {
    var s = STATUS[key] || { label: key || "—", cls: "" };
    return '<span class="a-badge a-badge--' + s.cls + '">' + esc(s.label) + '</span>';
  }

  /* ---------------- toasts ---------------- */
  function toast(msg, type) {
    var box = document.getElementById("toasts");
    if (!box) return;
    var t = document.createElement("div");
    t.className = "a-toast" + (type === "err" ? " a-toast--err" : type === "ok" ? " a-toast--ok" : "");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .4s"; }, 3600);
    setTimeout(function () { t.remove(); }, 4100);
  }

  /* ---------------- modal ---------------- */
  function modal(cfg) {
    cfg = cfg || {};
    var root = document.createElement("div");
    root.className = "a-modal";
    root.innerHTML =
      '<div class="a-modal__scrim"></div>' +
      '<div class="a-modal__box' + (cfg.wide ? " a-modal__box--wide" : "") + '" role="dialog" aria-modal="true">' +
      '<div class="a-modal__head"><h2 class="a-modal__title">' + esc(cfg.title || "") + '</h2>' +
      '<button class="a-modal__x" aria-label="Fermer" type="button">✕</button></div>' +
      '<div class="a-modal__body">' + (cfg.body || "") + '</div>' +
      (cfg.footer ? '<div class="a-modal__foot">' + cfg.footer + '</div>' : "") +
      '</div>';
    function close() {
      document.removeEventListener("keydown", onKey);
      root.remove();
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    root.querySelector(".a-modal__scrim").addEventListener("click", close);
    root.querySelector(".a-modal__x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(root);
    var first = root.querySelector("input, select, textarea, button:not(.a-modal__x)");
    if (first) setTimeout(function () { first.focus(); }, 60);
    return { el: root, close: close };
  }

  function confirmDlg(msg) {
    return new Promise(function (resolve) {
      var m = modal({
        title: "Confirmer",
        body: '<p style="font-size:.95rem">' + esc(msg) + '</p>',
        footer: '<button class="a-btn a-btn--ghost a-btn--sm" data-no type="button">Annuler</button>' +
                '<button class="a-btn a-btn--sm" data-yes type="button">Confirmer</button>'
      });
      m.el.querySelector("[data-no]").addEventListener("click", function () { m.close(); resolve(false); });
      m.el.querySelector("[data-yes]").addEventListener("click", function () { m.close(); resolve(true); });
    });
  }

  /* ---------------- image upload (canvas resize -> POST) ---------------- */
  function uploadImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("Choisissez une image (JPEG, PNG ou WebP)."));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1400, w = img.naturalWidth, h = img.naturalHeight;
        if (w > max || h > max) {
          if (w >= h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Image illisible."));
          fetch("/api/upload?name=" + encodeURIComponent(file.name), {
            method: "POST",
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/octet-stream" },
            body: blob
          }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) {
              if (!r.ok) throw new Error(j.error || "Échec de l'envoi de l'image.");
              resolve(j.url);
            });
          }).catch(reject);
        }, "image/jpeg", 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Image illisible.")); };
      img.src = url;
    });
  }

  /* ---------------- router ---------------- */
  function register(route, def) { modules[route] = def; }
  function navigate(route) { location.hash = "#/" + route; }
  function routeFromHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    return modules[h] ? h : "dashboard";
  }
  function rerender() { renderRoute(currentRoute || routeFromHash()); }

  function renderRoute(route) {
    var def = modules[route];
    if (!def) return;
    currentRoute = route;
    document.getElementById("page-title").textContent = def.title;
    document.title = def.title + " — MIRACLE Admin";
    document.querySelectorAll(".side__item").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-route") === route);
    });
    closeSide();
    var view = document.getElementById("view");
    view.innerHTML = '<div class="a-loading">Chargement…</div>';
    Promise.resolve().then(function () { return def.render(view); }).catch(function (e) {
      view.innerHTML = '<div class="a-empty"><strong>Une erreur est survenue</strong>' + esc(e.message || "") +
        '<p style="margin-top:1rem"><button class="a-btn a-btn--ghost a-btn--sm" onclick="ADMIN.rerender()">Réessayer</button></p></div>';
    });
  }

  function buildNav() {
    var nav = document.getElementById("side-nav");
    var keys = Object.keys(modules).sort(function (a, b) { return (modules[a].order || 99) - (modules[b].order || 99); });
    nav.innerHTML = keys.map(function (k) {
      var d = modules[k];
      return '<button class="side__item" type="button" data-route="' + k + '">' + (d.icon || "") +
        '<span>' + esc(d.title) + '</span><span class="side__count" data-count="' + k + '" hidden></span></button>';
    }).join("");
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("[data-route]");
      if (b) navigate(b.getAttribute("data-route"));
    });
  }

  /* pending-orders bubble in the sidebar */
  function refreshCounts() {
    if (!token) return;
    loadOrders().then(function (orders) {
      var n = orders.filter(function (o) { return o.status === "nouvelle"; }).length;
      var b = document.querySelector('[data-count="commandes"]');
      if (b) { b.textContent = n; b.hidden = !n; }
    }).catch(function () {});
  }

  /* ---------------- auth flow ---------------- */
  function showLogin() {
    document.getElementById("app").hidden = true;
    document.getElementById("login").hidden = false;
    setTimeout(function () { var i = document.getElementById("login-pw"); if (i) i.focus(); }, 50);
  }
  function showApp() {
    document.getElementById("login").hidden = true;
    document.getElementById("app").hidden = false;
    renderRoute(routeFromHash());
    refreshCounts();
  }
  function logout() {
    token = "";
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    state = { products: null, orders: null, companies: null, journal: null };
    showLogin();
  }

  /* ---------------- sidebar (mobile) ---------------- */
  function closeSide() {
    var s = document.getElementById("side");
    if (s) { s.classList.remove("is-open"); document.getElementById("side-scrim").classList.remove("is-open"); }
  }

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildNav();

    document.getElementById("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var user = document.getElementById("login-user").value.trim();
      var pw = document.getElementById("login-pw").value;
      var btn = document.getElementById("login-btn"), msg = document.getElementById("login-msg");
      btn.disabled = true; msg.textContent = "";
      api("/api/auth", { method: "POST", body: { action: "login", username: user, password: pw } }).then(function (j) {
        token = j.token;
        try { localStorage.setItem(TOKEN_KEY, token); } catch (e2) {}
        document.getElementById("login-pw").value = "";
        showApp();
      }).catch(function (err) {
        msg.textContent = err.message || "Connexion impossible.";
      }).finally(function () { btn.disabled = false; });
    });

    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("refresh-btn").addEventListener("click", function () {
      loadedAt = { products: 0, orders: 0, companies: 0, journal: 0 };
      rerender(); refreshCounts();
      toast("Données actualisées.", "ok");
    });
    document.getElementById("side-open").addEventListener("click", function () {
      document.getElementById("side").classList.add("is-open");
      document.getElementById("side-scrim").classList.add("is-open");
    });
    document.getElementById("side-scrim").addEventListener("click", closeSide);
    window.addEventListener("hashchange", function () { if (token) renderRoute(routeFromHash()); });

    if (token) showApp(); else showLogin();
    setInterval(refreshCounts, 90000);
  });

  /* ---------------- public surface ---------------- */
  window.ADMIN = {
    api: api, state: state,
    loadProducts: loadProducts, loadOrders: loadOrders,
    loadCompanies: loadCompanies, loadJournal: loadJournal,
    register: register, navigate: navigate, rerender: rerender,
    toast: toast, modal: modal, confirm: confirmDlg,
    money: money, esc: esc, fmtDate: fmtDate, uid: uid,
    STATUS: STATUS, statusBadge: statusBadge,
    uploadImage: uploadImage, refreshCounts: refreshCounts
  };
})();
