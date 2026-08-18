/* =====================================================================
   MIRACLE — module Tableau de bord (dashboard.js)
   KPIs, CA 6 derniers mois, stock faible, dernières commandes,
   pièces les plus commandées. Voir .design/ADMIN-CONTRACT.md.
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
  function isInMonth(iso, y, m) {
    var d = new Date(iso);
    if (isNaN(d)) return false;
    return d.getFullYear() === y && d.getMonth() === m;
  }

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
    var curY = now.getFullYear(), curM = now.getMonth();

    var caMonth = 0, enCours = 0, commandesMonth = 0, livreeMonthSum = 0, livreeMonthCount = 0, aTraiter = 0;

    orders.forEach(function (o) {
      var total = num(o.total);
      var inMonth = isInMonth(o.createdAt, curY, curM);

      if (o.status === "livree" && inMonth) {
        caMonth += total;
        livreeMonthSum += total;
        livreeMonthCount++;
      }
      if (o.status === "confirmee" || o.status === "en_preparation" || o.status === "expediee") {
        enCours += total;
      }
      if (inMonth) commandesMonth++;
      if (o.status === "nouvelle") aTraiter++;
    });

    var panierMoyen = livreeMonthCount ? (livreeMonthSum / livreeMonthCount) : 0;

    return (
      '<div class="a-kpis">' +
      '<div class="a-kpi a-kpi--wine"><div class="a-kpi__num">' + ADMIN.money(caMonth) + '</div><div class="a-kpi__lbl">CA du mois</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(enCours) + '</div><div class="a-kpi__lbl">En cours</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + commandesMonth + '</div><div class="a-kpi__lbl">Commandes du mois</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(panierMoyen) + '</div><div class="a-kpi__lbl">Panier moyen</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + aTraiter + '</div><div class="a-kpi__lbl">À traiter</div></div>' +
      '</div>'
    );
  }

  /* ---------------- CA 6 derniers mois ---------------- */
  function buildChart(orders) {
    var now = new Date();
    var curY = now.getFullYear(), curM = now.getMonth();

    var months = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(curY, curM - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("fr-FR", { month: "short" }) });
    }

    var sums = months.map(function (mo) {
      var sum = 0;
      orders.forEach(function (o) {
        if (o.status !== "livree") return;
        if (isInMonth(o.createdAt, mo.y, mo.m)) sum += num(o.total);
      });
      return sum;
    });

    var maxSum = 0;
    sums.forEach(function (s) { if (s > maxSum) maxSum = s; });

    var bars = months.map(function (mo, idx) {
      var h = maxSum ? Math.round((sums[idx] / maxSum) * 100) : 0;
      return (
        '<div class="a-bar"><i style="--h:' + h + '"></i>' +
        '<b>' + ADMIN.esc(mo.label) + '</b>' +
        '<span>' + Math.round(sums[idx]) + ' DT</span></div>'
      );
    }).join("");

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Chiffre d’affaires — 6 derniers mois</h2></div>' +
      '<div class="a-bars">' + bars + '</div>' +
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
      body = '<div class="a-empty">Aucune alerte de stock…</div>';
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
      '<div class="a-card" style="margin:0">' +
      '<div class="a-card__head"><h2 class="a-title">Stock faible</h2></div>' +
      body +
      '</div>'
    );
  }

  /* ---------------- Pièces les plus commandées ---------------- */
  function buildTopItemsCard(orders) {
    var qtyMap = {};
    orders.forEach(function (o) {
      if (o.status === "annulee") return;
      (o.items || []).forEach(function (it) {
        var key = it.id || it.title || "?";
        if (!qtyMap[key]) qtyMap[key] = { title: it.title || "—", qty: 0 };
        qtyMap[key].qty += num(it.qty);
      });
    });

    var topItems = Object.keys(qtyMap).map(function (k) { return qtyMap[k]; })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, 5);

    var body;
    if (!orders.length || !topItems.length) {
      body = '<div class="a-empty">Aucune commande enregistrée pour le moment.</div>';
    } else {
      var rows = topItems.map(function (it) {
        return (
          '<tr><td class="a-strong">' + ADMIN.esc(it.title) + '</td>' +
          '<td class="num">' + it.qty + '</td></tr>'
        );
      }).join("");
      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th>Pièce</th><th class="num">Quantité</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card" style="margin:0">' +
      '<div class="a-card__head"><h2 class="a-title">Pièces les plus commandées</h2></div>' +
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
        return (
          '<tr class="is-click" data-order-row>' +
          '<td class="a-strong">' + ADMIN.esc(o.id) + '</td>' +
          '<td>' + ADMIN.fmtDate(o.createdAt) + '</td>' +
          '<td>' + ADMIN.esc(clientLabel(o)) + '</td>' +
          '<td class="num">' + ADMIN.money(o.total) + '</td>' +
          '<td>' + ADMIN.statusBadge(o.status) + '</td>' +
          '</tr>'
        );
      }).join("");
      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th>Commande</th><th>Date</th><th>Client</th><th class="num">Total</th><th>Statut</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Dernières commandes</h2></div>' +
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
          buildChart(orders) +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.2rem">' +
          buildStockCard(products) +
          buildTopItemsCard(orders) +
          '</div>' +
          buildRecentOrdersCard(orders);

        el.addEventListener("click", function (e) {
          var manageBtn = e.target.closest("[data-manage-stock]");
          if (manageBtn) { ADMIN.navigate("produits"); return; }
          var orderRow = e.target.closest("tr.is-click[data-order-row]");
          if (orderRow) { ADMIN.navigate("commandes"); return; }
        });
      });
    }
  });
})();
