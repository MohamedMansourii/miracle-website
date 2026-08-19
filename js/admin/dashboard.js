/* =====================================================================
   MIRACLE — module Tableau de bord (dashboard.js)
   Converty-style KPIs (jour/semaine/mois/CA total hero), suivi
   livraisons, commandes des 10 derniers jours, trafic des commandes
   (donut), stock faible, dernières commandes. Voir .design/ADMIN-CONTRACT.md.
   ===================================================================== */
(function () {
  "use strict";

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M3.5 10.5L12 3.5l8.5 7" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M5.5 9v9.5a1 1 0 0 0 1 1H9.5v-5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5.5H17.5a1 1 0 0 0 1-1V9" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  var SOURCE_LABELS = {
    site: "Boutique en ligne",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    manuelle: "Manuelle"
  };

  /* ---------------- helpers ---------------- */
  function sourceLabel(s) { return SOURCE_LABELS[s] || (s || "—"); }
  function clientLabel(o) {
    if (o.customer && o.customer.name) return o.customer.name;
    return sourceLabel(o.source);
  }
  function num(n) { var v = Number(n); return isNaN(v) ? 0 : v; }
  function dayKey(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return null;
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  /* sizes of a product's stock object, ordered by product.sizes when possible */
  function stockSizes(p) {
    var keys = Object.keys(p.stock || {});
    if (Array.isArray(p.sizes) && p.sizes.length) {
      var ordered = p.sizes.filter(function (s) { return keys.indexOf(s) !== -1; });
      keys.forEach(function (k) { if (ordered.indexOf(k) === -1) ordered.push(k); });
      return ordered;
    }
    return keys;
  }

  /* ---------------- KPI row ---------------- */
  function buildKpis(orders) {
    var now = new Date();
    var today0 = startOfDay(now);
    var week0 = new Date(today0); week0.setDate(week0.getDate() - 6);
    var month0 = new Date(now.getFullYear(), now.getMonth(), 1);

    var todaySum = 0, todayCount = 0;
    var weekSum = 0, weekCount = 0;
    var monthSum = 0, monthCount = 0;
    var heroSum = 0, heroCount = 0;

    orders.forEach(function (o) {
      var total = num(o.total);
      var d = new Date(o.createdAt);
      var okDate = !isNaN(d);

      if (o.status === "livree") { heroSum += total; heroCount++; }

      if (o.status !== "annulee" && okDate) {
        if (d >= today0) { todaySum += total; todayCount++; }
        if (d >= week0) { weekSum += total; weekCount++; }
        if (d >= month0) { monthSum += total; monthCount++; }
      }
    });

    function plural(n) { return n + " commande" + (n === 1 ? "" : "s"); }

    return (
      '<div class="a-kpis">' +
      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(todaySum) + '</div>' +
      '<div class="a-kpi__lbl">Commandes aujourd’hui</div>' +
      '<div class="a-kpi__sub">' + plural(todayCount) + '</div></div>' +

      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(weekSum) + '</div>' +
      '<div class="a-kpi__lbl">Cette semaine</div>' +
      '<div class="a-kpi__sub">' + plural(weekCount) + '</div></div>' +

      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(monthSum) + '</div>' +
      '<div class="a-kpi__lbl">Ce mois-ci</div>' +
      '<div class="a-kpi__sub">' + plural(monthCount) + '</div></div>' +

      '<div class="a-kpi a-kpi--hero"><div class="a-kpi__num">' + ADMIN.money(heroSum) + '</div>' +
      '<div class="a-kpi__lbl">Revenus totaux</div>' +
      '<div class="a-kpi__sub">' + heroCount + ' commande' + (heroCount === 1 ? "" : "s") + ' livrée' + (heroCount === 1 ? "" : "s") + '</div></div>' +
      '</div>'
    );
  }

  /* ---------------- Suivi de commande (livrées vs retours) ---------------- */
  function buildTrackingCard(orders) {
    var livree = 0, retour = 0;
    orders.forEach(function (o) {
      if (o.status === "livree") livree++;
      else if (o.status === "retour") retour++;
    });
    var total = livree + retour;

    var body;
    if (!total) {
      body = '<div class="a-empty">Aucune donnée disponible pour le moment.</div>';
    } else {
      var pctLivree = Math.round((livree / total) * 100);
      var pctRetour = 100 - pctLivree;
      var segs = "";
      if (pctLivree > 0) segs += '<span class="a-track__seg a-track__seg--ok" style="--w:' + pctLivree + '">' + pctLivree + '%</span>';
      if (pctRetour > 0) segs += '<span class="a-track__seg a-track__seg--warn" style="--w:' + pctRetour + '">' + pctRetour + '%</span>';
      body =
        '<p style="margin-bottom:.7rem;font-size:.84rem">' +
        '<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--ok);margin-right:.4rem;vertical-align:-1px"></span>Livrées ' + pctLivree + '%' +
        '<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--rose);margin:0 .4rem 0 1.1rem;vertical-align:-1px"></span>Retournées ' + pctRetour + '%' +
        '</p>' +
        '<div class="a-track">' + segs + '</div>';
    }

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Suivi de commande</h2></div>' +
      body +
      '</div>'
    );
  }

  /* ---------------- Commandes — 10 derniers jours ---------------- */
  function buildLast10DaysCard(orders) {
    var now = new Date();
    var today0 = startOfDay(now);
    var days = [];
    for (var i = 9; i >= 0; i--) {
      var d = new Date(today0); d.setDate(d.getDate() - i);
      days.push({ key: d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(),
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) });
    }

    var counts = {};
    orders.forEach(function (o) {
      var k = dayKey(o.createdAt);
      if (k) counts[k] = (counts[k] || 0) + 1;
    });

    var maxCount = 0;
    days.forEach(function (dy) { var c = counts[dy.key] || 0; if (c > maxCount) maxCount = c; });

    var bars = days.map(function (dy) {
      var c = counts[dy.key] || 0;
      var h = maxCount ? Math.round((c / maxCount) * 100) : 0;
      return (
        '<div class="a-bar"><i style="--h:' + h + '"></i>' +
        '<b>' + ADMIN.esc(dy.label) + '</b>' +
        '<span>' + (c ? c : "") + '</span></div>'
      );
    }).join("");

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Commandes — 10 derniers jours</h2></div>' +
      '<div class="a-bars">' + bars + '</div>' +
      '<p class="a-sub" style="margin-top:.6rem">Nombre de commandes au cours des 10 derniers jours</p>' +
      '</div>'
    );
  }

  /* ---------------- Trafic des commandes (donut) ---------------- */
  function buildTrafficCard(orders) {
    var groups = [
      { key: "nouvelles", label: "Nouvelles", color: "var(--rose)", count: 0 },
      { key: "prep", label: "Confirmées / En préparation", color: "var(--gold)", count: 0 },
      { key: "expediee", label: "Expédiées", color: "var(--wine)", count: 0 },
      { key: "livree", label: "Livrées", color: "var(--ok)", count: 0 },
      { key: "annulees", label: "Annulées / Retours", color: "var(--sand)", count: 0 }
    ];
    var byKey = {};
    groups.forEach(function (g) { byKey[g.key] = g; });

    orders.forEach(function (o) {
      switch (o.status) {
        case "nouvelle": byKey.nouvelles.count++; break;
        case "confirmee": case "en_preparation": byKey.prep.count++; break;
        case "expediee": byKey.expediee.count++; break;
        case "livree": byKey.livree.count++; break;
        case "annulee": case "retour": byKey.annulees.count++; break;
      }
    });

    var total = orders.length;
    var body;
    if (!total) {
      body = '<div class="a-empty">Aucune commande pour le moment.</div>';
    } else {
      var acc = 0;
      var stops = groups.map(function (g) {
        var from = acc, deg = (g.count / total) * 360;
        acc += deg;
        return g.color + " " + from.toFixed(2) + "deg " + acc.toFixed(2) + "deg";
      }).join(", ");

      var legend = groups.map(function (g) {
        return '<div><i style="background:' + g.color + '"></i>' + ADMIN.esc(g.label) + '<em>' + g.count + '</em></div>';
      }).join("");

      body =
        '<div class="a-donut-wrap">' +
        '<div class="a-donut" style="background:conic-gradient(' + stops + ')">' +
        '<div class="a-donut__mid"><strong>' + total + '</strong><span>commandes</span></div>' +
        '</div>' +
        '<div class="a-legend">' + legend + '</div>' +
        '</div>';
    }

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Trafic des commandes</h2></div>' +
      body +
      '</div>'
    );
  }

  /* ---------------- Stock faible ---------------- */
  function buildStockCard(products) {
    var low = products.filter(function (p) {
      if (!p.stock || typeof p.stock !== "object" || Array.isArray(p.stock)) return false;
      return stockSizes(p).some(function (sz) { return num(p.stock[sz]) <= 2; });
    });

    var body;
    if (!low.length) {
      body = '<div class="a-empty">Aucune alerte de stock.</div>';
    } else {
      var rows = low.map(function (p) {
        var lowSizes = stockSizes(p).filter(function (sz) { return num(p.stock[sz]) <= 2; });
        var sizesHtml = lowSizes.map(function (sz) {
          var q = num(p.stock[sz]);
          var qHtml = q === 0 ? '<span style="color:var(--err)">0</span>' : String(q);
          return ADMIN.esc(sz) + " : " + qHtml;
        }).join(" · ");

        return (
          '<tr>' +
          '<td><img class="a-thumb" src="' + ADMIN.esc(p.img || "") + '" alt="" loading="lazy" /></td>' +
          '<td><span class="a-strong">' + ADMIN.esc(p.title || "") + '</span><br><span class="a-dim">' + ADMIN.esc(p.color || "") + '</span></td>' +
          '<td>' + sizesHtml + '</td>' +
          '<td class="num"><button class="a-btn a-btn--ghost a-btn--sm" type="button" data-manage-stock>Gérer</button></td>' +
          '</tr>'
        );
      }).join("");

      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th></th><th>Pièce</th><th>Tailles basses</th><th></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Stock faible</h2></div>' +
      body +
      '</div>'
    );
  }

  /* ---------------- Dernières commandes ---------------- */
  function buildRecentOrdersCard(orders) {
    var recent = orders.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, 6);

    var body;
    if (!recent.length) {
      body = '<div class="a-empty">Aucune commande pour le moment.</div>';
    } else {
      var rows = recent.map(function (o) {
        var customer = o.customer || {};
        return (
          '<tr class="is-click" data-order-row>' +
          '<td class="a-strong">' + ADMIN.esc(o.id) + '</td>' +
          '<td>' + ADMIN.fmtDate(o.createdAt) + '</td>' +
          '<td>' + ADMIN.esc(clientLabel(o)) + (customer.phone ? '<br><span class="a-dim">' + ADMIN.esc(customer.phone) + '</span>' : "") + '</td>' +
          '<td class="num">' + ADMIN.money(o.total) + '</td>' +
          '<td>' + ADMIN.statusBadge(o.status) + '</td>' +
          '</tr>'
        );
      }).join("");
      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th>N°</th><th>Date</th><th>Cliente</th><th class="num">Total</th><th>Statut</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Dernières commandes</h2>' +
      '<div class="a-actions"><button class="a-btn a-btn--ghost a-btn--sm" type="button" data-view-all>Voir tout</button></div>' +
      '</div>' +
      body +
      '</div>'
    );
  }

  /* ---------------- register ---------------- */
  ADMIN.register("dashboard", {
    title: "Tableau de bord",
    icon: ICON,
    order: 1,
    render: function (el) {
      return Promise.all([ADMIN.loadProducts(), ADMIN.loadOrders()]).then(function (res) {
        var products = res[0] || [];
        var orders = res[1] || [];

        el.innerHTML =
          buildKpis(orders) +
          buildTrackingCard(orders) +
          buildLast10DaysCard(orders) +
          '<div class="a-split">' +
          buildTrafficCard(orders) +
          buildStockCard(products) +
          '</div>' +
          buildRecentOrdersCard(orders);

        el.addEventListener("click", function (e) {
          if (e.target.closest("[data-manage-stock]")) { ADMIN.navigate("produits"); return; }
          if (e.target.closest("[data-view-all]")) { ADMIN.navigate("commandes"); return; }
          if (e.target.closest("tr.is-click[data-order-row]")) { ADMIN.navigate("commandes"); return; }
        });
      });
    }
  });
})();
