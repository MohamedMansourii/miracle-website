/* =====================================================================
   MIRACLE — module Statistiques (statistiques.js)
   Rapports périodiques : CA, TVA, statuts, top produits/villes,
   performance des sociétés de livraison, export CSV.
   Voir .design/ADMIN-CONTRACT.md.
   ===================================================================== */
(function () {
  "use strict";

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M4 20V11" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M10.5 20V6.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M17 20v-8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3 20h18" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  var SOURCE_LABELS = {
    site: "Boutique en ligne",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    manuelle: "Manuelle"
  };
  function sourceLabel(s) { return SOURCE_LABELS[s] || (s || "—"); }

  var PERIOD_DAYS = { "7": 7, "30": 30, "90": 90, "365": 365 }; // "all" -> no cutoff

  /* ---------------- generic helpers ---------------- */
  function num(n) { var v = Number(n); return isNaN(v) ? 0 : v; }

  function periodCutoffMs(val) {
    var days = PERIOD_DAYS[val];
    if (!days) return null;
    return Date.now() - days * 86400000;
  }
  function filterByPeriod(orders, val) {
    var cutoff = periodCutoffMs(val);
    if (cutoff === null) return orders.slice();
    return orders.filter(function (o) {
      var d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      return d.getTime() >= cutoff;
    });
  }
  function normCity(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    s = s.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function itemsSummary(o) {
    return (o.items || []).map(function (it) {
      return num(it.qty) + "× " + (it.title || "—") + (it.size ? " (" + it.size + ")" : "");
    }).join(" | ");
  }

  /* ---------------- KPI row ---------------- */
  function buildKpis(orders) {
    var livree = orders.filter(function (o) { return o.status === "livree"; });
    var caLivree = 0, fraisLivraison = 0;
    livree.forEach(function (o) {
      caLivree += num(o.total);
      var d = o.delivery || {};
      fraisLivraison += num(d.fee);
    });

    var enCours = 0;
    orders.forEach(function (o) {
      if (o.status === "confirmee" || o.status === "en_preparation" || o.status === "expediee") {
        enCours += num(o.total);
      }
    });

    var panierMoyen = livree.length ? caLivree / livree.length : 0;
    var retours = orders.filter(function (o) { return o.status === "retour"; }).length;
    var terminees = livree.length + retours;
    var tauxLivraison = terminees ? Math.round((livree.length / terminees) * 100) : null;

    var rate = ADMIN.tvaRate();
    var fourthCard;
    if (rate > 0) {
      fourthCard =
        '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(ADMIN.tvaPart(caLivree)) + '</div>' +
        '<div class="a-kpi__lbl">TVA collectée</div></div>';
    } else {
      fourthCard =
        '<div class="a-kpi"><div class="a-kpi__num">' + orders.length + '</div>' +
        '<div class="a-kpi__lbl">Commandes</div></div>';
    }

    return (
      '<div class="a-kpis">' +
      '<div class="a-kpi a-kpi--hero"><div class="a-kpi__num">' + ADMIN.money(caLivree) + '</div>' +
      '<div class="a-kpi__lbl">CA livré</div><div class="a-kpi__sub">' + livree.length + ' livrée(s)</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(enCours) + '</div><div class="a-kpi__lbl">En cours</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(panierMoyen) + '</div><div class="a-kpi__lbl">Panier moyen</div></div>' +
      fourthCard +
      '<div class="a-kpi"><div class="a-kpi__num">' + ADMIN.money(fraisLivraison) + '</div><div class="a-kpi__lbl">Frais de livraison</div></div>' +
      '<div class="a-kpi"><div class="a-kpi__num">' + (tauxLivraison === null ? "—" : tauxLivraison + "<small>%</small>") + '</div>' +
      '<div class="a-kpi__lbl">Taux de livraison</div></div>' +
      '</div>'
    );
  }

  /* ---------------- Commandes par statut ---------------- */
  function buildStatusBars(orders) {
    var keys = Object.keys(ADMIN.STATUS);
    var counts = {};
    keys.forEach(function (k) { counts[k] = 0; });
    orders.forEach(function (o) { if (counts.hasOwnProperty(o.status)) counts[o.status]++; });

    var max = 0;
    keys.forEach(function (k) { if (counts[k] > max) max = counts[k]; });

    var bars = keys.map(function (k) {
      var h = max ? Math.round((counts[k] / max) * 100) : 0;
      return (
        '<div class="a-bar"><i style="--h:' + h + '"></i>' +
        '<b>' + ADMIN.esc(ADMIN.STATUS[k].label) + '</b>' +
        '<span>' + counts[k] + '</span></div>'
      );
    }).join("");

    return (
      '<div class="a-card">' +
      '<div class="a-card__head"><h2 class="a-title">Commandes par statut</h2></div>' +
      '<div class="a-bars">' + bars + '</div>' +
      '</div>'
    );
  }

  /* ---------------- Pièces les plus commandées ---------------- */
  function buildTopItemsCard(orders) {
    var map = {};
    orders.forEach(function (o) {
      if (o.status === "annulee") return;
      (o.items || []).forEach(function (it) {
        var key = it.id || it.title || "?";
        if (!map[key]) map[key] = { title: it.title || "—", qty: 0, valeur: 0 };
        map[key].qty += num(it.qty);
        map[key].valeur += num(it.qty) * num(it.price);
      });
    });

    var top = Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, 8);

    var body;
    if (!top.length) {
      body = '<div class="a-empty">Aucun article vendu sur cette période.</div>';
    } else {
      var rows = top.map(function (it) {
        return (
          '<tr><td class="a-strong">' + ADMIN.esc(it.title) + '</td>' +
          '<td class="num">' + it.qty + '</td>' +
          '<td class="num">' + ADMIN.money(it.valeur) + '</td></tr>'
        );
      }).join("");
      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th>Pièce</th><th class="num">Unités</th><th class="num">Valeur</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card"><div class="a-card__head"><h2 class="a-title">Pièces les plus commandées</h2></div>' + body + '</div>'
    );
  }

  /* ---------------- Meilleures villes ---------------- */
  function buildTopVillesCard(orders) {
    var map = {};
    orders.forEach(function (o) {
      var city = normCity(o.customer && o.customer.city);
      if (!city) return;
      if (!map[city]) map[city] = { city: city, count: 0, valeur: 0 };
      map[city].count++;
      map[city].valeur += num(o.total);
    });

    var top = Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.count - a.count || b.valeur - a.valeur; })
      .slice(0, 8);

    var body;
    if (!top.length) {
      body = '<div class="a-empty">Renseignez la ville des clientes dans leurs commandes pour voir ce rapport.</div>';
    } else {
      var rows = top.map(function (v) {
        return (
          '<tr><td class="a-strong">' + ADMIN.esc(v.city) + '</td>' +
          '<td class="num">' + v.count + '</td>' +
          '<td class="num">' + ADMIN.money(v.valeur) + '</td></tr>'
        );
      }).join("");
      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th>Ville</th><th class="num">Commandes</th><th class="num">Valeur</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card"><div class="a-card__head"><h2 class="a-title">Meilleures villes</h2></div>' + body + '</div>'
    );
  }

  /* ---------------- Performance des sociétés de livraison ---------------- */
  function buildCompanyPerfCard(orders, companies) {
    var byId = {};
    companies.forEach(function (c) { byId[c.id] = c; });

    var groups = {};
    orders.forEach(function (o) {
      var d = o.delivery || {};
      var cid = d.companyId;
      if (!cid) return; // unassigned orders excluded
      if (!groups[cid]) {
        var known = byId[cid];
        groups[cid] = {
          name: (known && known.name) || d.companyName || cid,
          enCours: 0, livrees: 0, retours: 0, valeurLivree: 0
        };
      }
      var g = groups[cid];
      if (o.status === "confirmee" || o.status === "en_preparation" || o.status === "expediee") g.enCours++;
      if (o.status === "livree") { g.livrees++; g.valeurLivree += num(o.total); }
      if (o.status === "retour") g.retours++;
    });

    var list = Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return b.valeurLivree - a.valeurLivree || b.livrees - a.livrees; });

    var body;
    if (!list.length) {
      body = '<div class="a-empty">Aucune commande n’a été confiée à une société de livraison sur cette période.</div>';
    } else {
      var rows = list.map(function (g) {
        return (
          '<tr><td class="a-strong">' + ADMIN.esc(g.name) + '</td>' +
          '<td class="num">' + g.enCours + '</td>' +
          '<td class="num">' + g.livrees + '</td>' +
          '<td class="num">' + g.retours + '</td>' +
          '<td class="num">' + ADMIN.money(g.valeurLivree) + '</td></tr>'
        );
      }).join("");
      body =
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
        '<th>Société</th><th class="num">En cours</th><th class="num">Livrées</th>' +
        '<th class="num">Retours</th><th class="num">Valeur livrée</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return (
      '<div class="a-card"><div class="a-card__head"><h2 class="a-title">Performance des sociétés de livraison</h2></div>' + body + '</div>'
    );
  }

  /* ---------------- CSV export ---------------- */
  function csvField(v) {
    var s = String(v === undefined || v === null ? "" : v);
    if (/[;"\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function csvRow(fields) { return fields.map(csvField).join(";"); }

  function exportCsv(orders, companies) {
    var byId = {};
    companies.forEach(function (c) { byId[c.id] = c; });

    var header = ["N°", "Date", "Statut", "Source", "Cliente", "Téléphone", "Ville", "Articles",
      "Total TND", "TVA TND", "Société", "Livreur", "Frais", "Payée"];

    var lines = [csvRow(header)];
    orders.forEach(function (o) {
      var customer = o.customer || {};
      var d = o.delivery || {};
      var known = d.companyId ? byId[d.companyId] : null;
      var companyName = d.companyId ? ((known && known.name) || d.companyName || "") : "";
      lines.push(csvRow([
        o.id,
        ADMIN.fmtDate(o.createdAt),
        (ADMIN.STATUS[o.status] && ADMIN.STATUS[o.status].label) || o.status || "",
        sourceLabel(o.source),
        customer.name || "",
        customer.phone || "",
        customer.city || "",
        itemsSummary(o),
        num(o.total).toFixed(2),
        ADMIN.tvaPart(o.total).toFixed(2),
        companyName,
        d.personName || "",
        d.fee === null || d.fee === undefined ? "" : num(d.fee).toFixed(2),
        o.paid ? "Oui" : "Non"
      ]));
    });

    var csv = "﻿" + lines.join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "miracle-commandes.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 200);
    ADMIN.toast("Export téléchargé.", "ok");
  }

  /* ---------------- register ---------------- */
  ADMIN.register("statistiques", {
    title: "Statistiques",
    icon: ICON,
    order: 4,
    render: function (el) {
      return Promise.all([ADMIN.loadOrders(), ADMIN.loadProducts(), ADMIN.loadCompanies()]).then(function (res) {
        var orders = res[0] || [];
        var companies = res[2] || [];

        el.innerHTML =
          '<div class="a-card">' +
          '<div class="a-card__head">' +
          '<div><h2 class="a-title">Statistiques</h2><p class="a-sub">Rapports de la boutique</p></div>' +
          '<div class="a-actions">' +
          '<select class="a-select" id="stat-period" style="width:auto;min-width:190px">' +
          '<option value="7">7 derniers jours</option>' +
          '<option value="30" selected>30 derniers jours</option>' +
          '<option value="90">3 derniers mois</option>' +
          '<option value="365">12 derniers mois</option>' +
          '<option value="all">Tout</option>' +
          '</select>' +
          '<button class="a-btn a-btn--ghost a-btn--sm" type="button" id="stat-export">Exporter CSV</button>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div id="stat-body"></div>';

        var periodSel = el.querySelector("#stat-period");
        var bodyEl = el.querySelector("#stat-body");
        var exportBtn = el.querySelector("#stat-export");

        function renderBody() {
          var periodOrders = filterByPeriod(orders, periodSel.value);
          bodyEl.innerHTML =
            buildKpis(periodOrders) +
            buildStatusBars(periodOrders) +
            '<div class="a-split">' + buildTopItemsCard(periodOrders) + buildTopVillesCard(periodOrders) + '</div>' +
            buildCompanyPerfCard(periodOrders, companies);
        }

        periodSel.addEventListener("change", renderBody);
        exportBtn.addEventListener("click", function () {
          exportCsv(filterByPeriod(orders, periodSel.value), companies);
        });

        renderBody();
      });
    }
  });
})();
