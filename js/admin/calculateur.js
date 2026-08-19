/* =====================================================================
   MIRACLE — module Calculateur (calculateur.js)
   Calculateur de rentabilité de campagne : leads → confirmations →
   livraisons, marge, retours et TVA. Tout calculé côté client, pas de
   chargement de données. Voir .design/ADMIN-CONTRACT.md.
   ===================================================================== */
(function () {
  "use strict";

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<rect x="5" y="3.5" width="14" height="17" rx="2" stroke-linejoin="round"/>' +
    '<path d="M7.5 7h9" stroke-linecap="round"/>' +
    '<path d="M7.8 11h.01M12 11h.01M16.2 11h.01M7.8 14.3h.01M12 14.3h.01M16.2 14.3h.01M7.8 17.6h.01M12 17.6h.01M16.2 17.6h.01" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  var FIELDS = [
    { key: "coutLivraison", label: "Coût de livraison (TND)", def: 8 },
    { key: "coutRetour", label: "Coût de retour (TND)", def: 3 },
    { key: "coutTraitement", label: "Coût de traitement par confirmation (TND)", def: 0 },
    { key: "coutPiece", label: "Coût de la pièce (TND)", def: 60 },
    { key: "coutLead", label: "Coût du lead (TND)", def: 0 },
    { key: "tauxConfirmation", label: "Taux de confirmation (%)", def: 80, pct: true },
    { key: "prix", label: "Prix de vente TTC, livraison incluse (TND)", def: 149 },
    { key: "leads", label: "Total des leads reçus", def: 50 },
    { key: "tauxLivraison", label: "Taux de livraison (%)", def: 85, pct: true }
  ];

  /* ---------------- markup ---------------- */
  function formGridHtml() {
    var fields = FIELDS.map(function (f) {
      return (
        '<div class="a-field">' +
        '<label class="a-label" for="calc-' + f.key + '">' + ADMIN.esc(f.label) + '</label>' +
        '<input class="a-input" type="number" min="0" id="calc-' + f.key + '" value="' + f.def + '" />' +
        '</div>'
      );
    }).join("");
    return '<div class="a-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' + fields + '</div>';
  }

  function cardHtml() {
    return (
      '<div class="a-card">' +
      '<div class="a-card__head">' +
      '<div>' +
      '<h2 class="a-title">Calculateur de rentabilité</h2>' +
      '<p class="a-sub">Estimez la marge d’une campagne (leads → confirmations → livraisons), TVA et retours compris.</p>' +
      '</div>' +
      '</div>' +
      '<p class="a-hint">Un « lead » est une demande ou commande entrante — reçue par WhatsApp, Instagram ou la boutique en ligne — qu’elle soit confirmée ou non.</p>' +
      formGridHtml() +
      '<div class="a-actions" style="margin-top:.6rem">' +
      '<button class="a-btn a-btn--ghost a-btn--sm" type="button" data-reset>Réinitialiser</button>' +
      '<button class="a-btn" type="button" data-calc>Calculer</button>' +
      '</div>' +
      '</div>' +
      '<div id="calc-results" hidden></div>'
    );
  }

  function kpiCard(cls, num, lbl, sub, numStyle) {
    return (
      '<div class="a-kpi' + (cls ? " " + cls : "") + '">' +
      '<div class="a-kpi__num"' + (numStyle ? ' style="' + numStyle + '"' : "") + ">" + num + "</div>" +
      '<div class="a-kpi__lbl">' + lbl + "</div>" +
      (sub ? '<div class="a-kpi__sub">' + sub + "</div>" : "") +
      "</div>"
    );
  }

  function resultsHtml(r) {
    var rate = ADMIN.tvaRate();

    var cards =
      kpiCard("", r.confirmes.toFixed(1), "Leads confirmés") +
      kpiCard("", r.livres.toFixed(1), "Commandes livrées") +
      kpiCard("", ADMIN.money(r.profitParUnite), "Profit par pièce livrée") +
      kpiCard("a-kpi--hero", ADMIN.money(r.profit), "Profit total", "", r.profit < 0 ? "color:var(--err)" : "") +
      kpiCard("", ADMIN.money(r.cplParLivraison), "Coût du lead par livraison") +
      kpiCard("a-kpi--wine", ADMIN.money(r.cplEquilibre), "Coût de lead à l’équilibre", "Au-delà, la campagne perd de l’argent");

    if (rate > 0) {
      cards += kpiCard("", ADMIN.money(r.tvaDue), "TVA sur le CA livré");
    }

    return (
      '<div class="a-kpis" style="margin-top:1.2rem">' + cards + "</div>" +
      '<p class="a-hint">Les frais de livraison sont comptés uniquement sur les commandes livrées, et le coût de retour sur les colis revenus. ' +
      "Le coût du lead, lui, s’applique à l’ensemble des leads reçus, qu’ils aboutissent ou non à une livraison.</p>"
    );
  }

  /* ---------------- logic ---------------- */
  function readField(el, f) {
    var input = el.querySelector("#calc-" + f.key);
    var raw = parseFloat(input.value);
    if (isNaN(raw) || raw < 0) raw = 0;
    if (f.pct && raw > 100) raw = 100;
    input.value = raw;
    return raw;
  }

  function compute(el) {
    var v = {};
    FIELDS.forEach(function (f) { v[f.key] = readField(el, f); });

    var confPct = v.tauxConfirmation / 100;
    var livPct = v.tauxLivraison / 100;

    var confirmes = v.leads * confPct;
    var livres = confirmes * livPct;
    var retours = confirmes - livres;
    var margeUnitaire = v.prix - v.coutPiece - v.coutLivraison;
    var profit = livres * margeUnitaire - retours * v.coutRetour - v.leads * v.coutLead - confirmes * v.coutTraitement;
    var profitParUnite = livres > 0 ? profit / livres : 0;
    var cplParLivraison = livres > 0 ? (v.leads * v.coutLead) / livres : 0;
    var cplEquilibre = v.leads > 0 ? (livres * margeUnitaire - retours * v.coutRetour - confirmes * v.coutTraitement) / v.leads : 0;
    var tvaDue = ADMIN.tvaRate() > 0 ? ADMIN.tvaPart(livres * v.prix) : 0;

    return {
      confirmes: confirmes, livres: livres, retours: retours,
      profit: profit, profitParUnite: profitParUnite,
      cplParLivraison: cplParLivraison, cplEquilibre: cplEquilibre,
      tvaDue: tvaDue
    };
  }

  function onCalc(el) {
    var r = compute(el);
    var box = el.querySelector("#calc-results");
    box.innerHTML = resultsHtml(r);
    box.hidden = false;
    if (r.profit < 0) ADMIN.toast("Campagne à perte à ces paramètres.", "err");
  }

  function onReset(el) {
    FIELDS.forEach(function (f) {
      var input = el.querySelector("#calc-" + f.key);
      if (input) input.value = f.def;
    });
    var box = el.querySelector("#calc-results");
    if (box) { box.hidden = true; box.innerHTML = ""; }
  }

  /* ---------------- register ---------------- */
  ADMIN.register("calculateur", {
    title: "Calculateur",
    icon: ICON,
    order: 6,
    render: function (el) {
      el.innerHTML = cardHtml();
      el.addEventListener("click", function (e) {
        if (e.target.closest("[data-calc]")) { onCalc(el); return; }
        if (e.target.closest("[data-reset]")) { onReset(el); return; }
      });
    }
  });
})();
