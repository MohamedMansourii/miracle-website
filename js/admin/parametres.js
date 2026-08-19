/* =====================================================================
   MIRACLE — module Paramètres (identifiants, TVA, infos boutique, guide)
   Suit .design/ADMIN-CONTRACT.md — voir js/admin/app.js pour les helpers.
   ===================================================================== */
(function () {
  "use strict";

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>' +
    '</svg>';

  /* ---------------- cards ---------------- */

  function credsCardHtml(s) {
    var username = ADMIN.esc(s.username || "");
    return (
      '<div class="a-card">' +
        '<div class="a-card__head">' +
          '<h2 class="a-title">Identifiants de connexion</h2>' +
        '</div>' +
        '<div class="a-form-grid">' +
          '<div class="a-field a-field--full">' +
            '<label class="a-label" for="set-username">Nom d\'utilisateur</label>' +
            '<input class="a-input" type="text" id="set-username" autocomplete="username" value="' + username + '" />' +
            '<p class="a-hint">3 caractères minimum — insensible aux majuscules</p>' +
          '</div>' +
          '<div class="a-field a-field--full">' +
            '<label class="a-label" for="pw-current">Mot de passe actuel</label>' +
            '<input class="a-input" type="password" id="pw-current" autocomplete="current-password" />' +
          '</div>' +
          '<div class="a-field">' +
            '<label class="a-label" for="pw-new">Nouveau mot de passe</label>' +
            '<input class="a-input" type="password" id="pw-new" autocomplete="new-password" />' +
            '<p class="a-hint">8 caractères minimum</p>' +
          '</div>' +
          '<div class="a-field">' +
            '<label class="a-label" for="pw-confirm">Confirmer le nouveau mot de passe</label>' +
            '<input class="a-input" type="password" id="pw-confirm" autocomplete="new-password" />' +
          '</div>' +
        '</div>' +
        '<div class="a-actions" style="margin-top:.4rem">' +
          '<button class="a-btn" type="button" id="creds-submit">Mettre à jour</button>' +
        '</div>' +
      '</div>'
    );
  }

  function tvaCardHtml(s) {
    var pct = Math.round(((s.tvaRate) || 0) * 1000) / 10;
    return (
      '<div class="a-card">' +
        '<div class="a-card__head">' +
          '<h2 class="a-title">TVA</h2>' +
        '</div>' +
        '<div class="a-field">' +
          '<label class="a-label" for="set-tva">Taux de TVA (%)</label>' +
          '<input class="a-input" type="number" id="set-tva" min="0" max="50" step="0.1" value="' + pct + '" />' +
        '</div>' +
        '<div class="a-actions" style="margin-top:.4rem">' +
          '<button class="a-btn a-btn--ghost a-btn--sm" type="button" id="tva-submit">Enregistrer</button>' +
        '</div>' +
        '<p class="a-hint">19 % en Tunisie pour les assujetties. Laissez 0 si la boutique n\'est pas assujettie (régime forfaitaire) — les montants TVA disparaissent alors du tableau de bord. Les prix restent TTC.</p>' +
      '</div>'
    );
  }

  function boutiqueCardHtml() {
    return (
      '<div class="a-card">' +
        '<div class="a-card__head">' +
          '<h2 class="a-title">La boutique</h2>' +
        '</div>' +
        '<div class="a-field">' +
          '<p class="a-label">Boutique en ligne</p>' +
          '<p><a href="index.html" target="_blank" rel="noopener" style="text-decoration:underline">Ouvrir la boutique ↗</a></p>' +
        '</div>' +
        '<div class="a-field">' +
          '<p class="a-label">Instagram</p>' +
          '<p><a href="https://www.instagram.com/miracle_collection_feminine/" target="_blank" rel="noopener" style="text-decoration:underline">@miracle_collection_feminine ↗</a></p>' +
        '</div>' +
        '<div class="a-field">' +
          '<p class="a-label">WhatsApp commandes</p>' +
          '<p><a href="https://wa.me/21692970596" target="_blank" rel="noopener" style="text-decoration:underline">+216 92 970 596 ↗</a></p>' +
        '</div>' +
        '<p class="a-hint">Les modifications du catalogue apparaissent sur la boutique en moins d\'une minute. Les commandes passées via le bouton WhatsApp de la boutique arrivent automatiquement dans Commandes — une alerte s\'affiche ici dès qu\'une nouvelle commande arrive.</p>' +
      '</div>'
    );
  }

  function guideCardHtml() {
    var items = [
      "Ajouter une pièce : Produits → Nouvelle pièce — renseignez les photos, les tailles et le stock.",
      "Créer une promo : indiquez un Prix avant remise, il s’affichera en prix barré sur la boutique.",
      "Le stock se décompte automatiquement dès qu’une commande passe au statut Confirmée.",
      "Traiter une commande : faites-la avancer Nouvelle → Confirmée → Expédiée → Livrée.",
      "Chaque commande propose des messages WhatsApp prêts à envoyer au client.",
      "Livraison : assignez une société, un livreur et un numéro de suivi à chaque commande.",
      "Statistiques : consultez des rapports par période et exportez-les en CSV.",
      "Calculateur : estimez la rentabilité d’une campagne avant de la lancer."
    ];
    var lis = items.map(function (t) { return "<li>" + ADMIN.esc(t) + "</li>"; }).join("");
    return (
      '<div class="a-card">' +
        '<div class="a-card__head">' +
          '<h2 class="a-title">Guide rapide</h2>' +
        '</div>' +
        '<ul style="list-style:disc;padding-left:1.2rem;font-size:.9rem">' + lis + '</ul>' +
      '</div>'
    );
  }

  /* ---------------- bindings ---------------- */

  function bindCredsForm(el, s) {
    var btn = el.querySelector("#creds-submit");
    var usernameInput = el.querySelector("#set-username");
    var current = el.querySelector("#pw-current");
    var next = el.querySelector("#pw-new");
    var confirm = el.querySelector("#pw-confirm");
    var originalUsername = s.username || "";

    btn.addEventListener("click", function () {
      var vUsername = usernameInput.value.trim();
      var vCurrent = current.value;
      var vNext = next.value;
      var vConfirm = confirm.value;
      var usernameChanged = vUsername !== originalUsername;

      if (!vCurrent) { ADMIN.toast("Veuillez saisir votre mot de passe actuel.", "err"); return; }
      if (vNext.length < 8) { ADMIN.toast("Le nouveau mot de passe doit contenir au moins 8 caractères.", "err"); return; }
      if (vNext !== vConfirm) { ADMIN.toast("Les mots de passe ne correspondent pas.", "err"); return; }
      if (usernameChanged && vUsername.length < 3) { ADMIN.toast("Le nom d'utilisateur doit contenir au moins 3 caractères.", "err"); return; }

      var body = { action: "change", current: vCurrent, next: vNext };
      if (usernameChanged) body.newUsername = vUsername;

      btn.disabled = true;
      ADMIN.api("/api/auth", { method: "POST", body: body })
        .then(function () {
          current.value = "";
          next.value = "";
          confirm.value = "";
          return ADMIN.loadSettings(true);
        })
        .then(function () {
          ADMIN.toast("Identifiants mis à jour. Utilisez-les dès votre prochaine connexion.", "ok");
        })
        .catch(function (e) { ADMIN.toast(e.message, "err"); })
        .finally(function () { btn.disabled = false; });
    });
  }

  function bindTvaForm(el) {
    var btn = el.querySelector("#tva-submit");
    var input = el.querySelector("#set-tva");

    btn.addEventListener("click", function () {
      var v = parseFloat(input.value);
      if (isNaN(v) || v < 0 || v > 50) { ADMIN.toast("Veuillez saisir un taux compris entre 0 et 50 %.", "err"); return; }

      btn.disabled = true;
      ADMIN.api("/api/settings", { method: "PUT", body: { tvaRate: v / 100 } })
        .then(function () { return ADMIN.loadSettings(true); })
        .then(function () { ADMIN.toast("Taux de TVA mis à jour.", "ok"); })
        .catch(function (e) { ADMIN.toast(e.message, "err"); })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ---------------- module ---------------- */

  ADMIN.register("parametres", {
    title: "Paramètres",
    icon: ICON,
    order: 8,
    render: function (el) {
      return ADMIN.loadSettings().then(function () {
        var s = ADMIN.state.settings || {};
        el.innerHTML = credsCardHtml(s) + tvaCardHtml(s) + boutiqueCardHtml() + guideCardHtml();
        bindCredsForm(el, s);
        bindTvaForm(el);
      });
    }
  });
})();
