/* =====================================================================
   MIRACLE — module Paramètres (mot de passe, infos boutique, guide rapide)
   ===================================================================== */
(function () {
  "use strict";

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>' +
    '</svg>';

  function passwordCardHtml() {
    return (
      '<div class="a-card">' +
        '<div class="a-card__head">' +
          '<h2 class="a-title">Mot de passe</h2>' +
        '</div>' +
        '<div class="a-form-grid">' +
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
            '<label class="a-label" for="pw-confirm">Confirmer</label>' +
            '<input class="a-input" type="password" id="pw-confirm" autocomplete="new-password" />' +
          '</div>' +
        '</div>' +
        '<div class="a-actions" style="margin-top:.4rem">' +
          '<button class="a-btn" type="button" id="pw-submit">Mettre à jour</button>' +
        '</div>' +
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
        '<p class="a-hint">Les modifications du catalogue apparaissent sur la boutique en moins d’une minute (cache). Les commandes passées via le bouton WhatsApp de la boutique arrivent automatiquement dans l’onglet Commandes.</p>' +
      '</div>'
    );
  }

  function guideCardHtml() {
    var items = [
      "Ajouter une pièce : Produits → Nouvelle pièce, puis renseignez les photos, les tailles et le stock.",
      "Suivre le stock : il se décompte automatiquement dès qu’une commande passe au statut Confirmée.",
      "Traiter une commande : faites-la avancer Nouvelle → Confirmée → Expédiée → Livrée.",
      "Assigner une livraison : choisissez la société et le livreur directement dans la commande.",
      "Le chiffre d’affaires : une commande compte dans le CA seulement lorsqu’elle est Livrée.",
      "Le Journal : les articles publiés y sont visibles sur la page Le Journal de la boutique."
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

  function bindPasswordForm(el) {
    var btn = el.querySelector("#pw-submit");
    var current = el.querySelector("#pw-current");
    var next = el.querySelector("#pw-new");
    var confirm = el.querySelector("#pw-confirm");

    btn.addEventListener("click", function () {
      var vCurrent = current.value;
      var vNext = next.value;
      var vConfirm = confirm.value;

      if (!vCurrent) { ADMIN.toast("Veuillez saisir votre mot de passe actuel.", "err"); return; }
      if (vNext.length < 8) { ADMIN.toast("Le nouveau mot de passe doit contenir au moins 8 caractères.", "err"); return; }
      if (vNext !== vConfirm) { ADMIN.toast("Les mots de passe ne correspondent pas.", "err"); return; }

      btn.disabled = true;
      ADMIN.api("/api/auth", { method: "POST", body: { action: "change", current: vCurrent, next: vNext } })
        .then(function () {
          current.value = "";
          next.value = "";
          confirm.value = "";
          ADMIN.toast("Mot de passe mis à jour. Utilisez-le dès votre prochaine connexion.", "ok");
        })
        .catch(function (e) { ADMIN.toast(e.message, "err"); })
        .finally(function () { btn.disabled = false; });
    });
  }

  ADMIN.register("parametres", {
    title: "Paramètres",
    icon: ICON,
    order: 6,
    render: function (el) {
      el.innerHTML = passwordCardHtml() + boutiqueCardHtml() + guideCardHtml();
      bindPasswordForm(el);
    }
  });
})();
