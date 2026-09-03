/* =====================================================================
   MIRACLE — module Équipe (sous-admins). SUPER ADMIN UNIQUEMENT.
   Crée des comptes limités (vendeuse, caissier…) : e-mail + mot de passe.
   Ils voient et traitent les commandes, gèrent les produits et le stock,
   mais ne peuvent JAMAIS supprimer une commande ni toucher aux réglages.
   ===================================================================== */
(function () {
  "use strict";
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">'
    + '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/>'
    + '<circle cx="17" cy="9.5" r="2.4"/><path d="M15.4 14.6a4.6 4.6 0 0 1 5.1 4.4"/></svg>';

  function loadTeam() {
    return ADMIN.api("/api/team").then(function (j) { return j.team || []; });
  }

  function memberModal(m, onDone) {
    var isNew = !m;
    m = m || {};
    var modal = ADMIN.modal({
      title: isNew ? "Nouveau compte équipe" : "Modifier — " + (m.name || m.email),
      body:
        '<div class="a-form-grid">' +
        '<div class="a-field"><label class="a-label">Nom</label>' +
        '<input class="a-input" id="tm-name" value="' + ADMIN.esc(m.name || "") + '" placeholder="Ex. Salma (boutique)" /></div>' +
        '<div class="a-field"><label class="a-label">E-mail (identifiant de connexion)</label>' +
        '<input class="a-input" id="tm-email" type="email" value="' + ADMIN.esc(m.email || "") + '"' + (isNew ? "" : " disabled") + ' /></div>' +
        '<div class="a-field a-field--full"><label class="a-label">' + (isNew ? "Mot de passe" : "Nouveau mot de passe (laisser vide pour ne pas changer)") + '</label>' +
        '<input class="a-input" id="tm-pw" type="text" autocomplete="off" placeholder="8 caractères minimum" />' +
        '<p class="a-hint">C\'est vous qui choisissez le mot de passe et le communiquez à la personne. Elle se connecte sur /admin avec son e-mail.</p></div>' +
        '</div>' +
        (isNew ? "" :
          '<label class="a-check" style="margin-top:.3rem"><input type="checkbox" id="tm-active"' + (m.active !== false ? " checked" : "") + '> Compte actif (décocher pour bloquer l\'accès)</label>') +
        '<p class="a-hint" style="margin-top:.9rem">Droits d\'un compte équipe : voir et traiter les commandes (statuts, clientes, notes), gérer les produits et le stock, le Journal. ' +
        '<strong>Impossible pour lui :</strong> supprimer une commande, modifier les réglages (TVA, frais, identifiants), gérer l\'équipe.</p>',
      footer:
        '<button class="a-btn a-btn--ghost a-btn--sm" data-cancel type="button">Annuler</button>' +
        '<button class="a-btn a-btn--sm" data-save type="button">' + (isNew ? "Créer le compte" : "Enregistrer") + '</button>'
    });
    modal.el.querySelector("[data-cancel]").addEventListener("click", modal.close);
    modal.el.querySelector("[data-save]").addEventListener("click", function () {
      var name = modal.el.querySelector("#tm-name").value.trim();
      var email = modal.el.querySelector("#tm-email").value.trim();
      var pw = modal.el.querySelector("#tm-pw").value;
      if (isNew && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ADMIN.toast("Adresse e-mail invalide.", "err"); return; }
      if ((isNew || pw) && pw.length < 8) { ADMIN.toast("Le mot de passe doit faire au moins 8 caractères.", "err"); return; }
      var btn = this; btn.disabled = true;
      var req = isNew
        ? ADMIN.api("/api/team", { method: "POST", body: { name: name, email: email, password: pw } })
        : ADMIN.api("/api/team", { method: "PUT", body: { id: m.id, name: name, password: pw || undefined, active: modal.el.querySelector("#tm-active").checked } });
      req.then(function () {
        modal.close();
        ADMIN.toast(isNew ? "Compte créé. Communiquez l'e-mail et le mot de passe à la personne." : "Compte mis à jour.", "ok");
        onDone();
      }).catch(function (e) { ADMIN.toast(e.message, "err"); btn.disabled = false; });
    });
  }

  ADMIN.register("equipe", {
    title: "Équipe",
    icon: ICON,
    order: 7,
    superOnly: true,
    render: function (el) {
      return loadTeam().then(function (team) {
        var rows = team.map(function (m) {
          return '<tr>' +
            '<td class="a-strong">' + ADMIN.esc(m.name || "—") + '</td>' +
            '<td>' + ADMIN.esc(m.email) + '</td>' +
            '<td>' + (m.active !== false ? '<span class="a-badge a-badge--on">Actif</span>' : '<span class="a-badge a-badge--off">Bloqué</span>') + '</td>' +
            '<td class="a-dim">' + ADMIN.fmtDate(m.createdAt) + '</td>' +
            '<td><div class="a-actions">' +
            '<button class="a-btn a-btn--ghost a-btn--sm" data-edit="' + ADMIN.esc(m.id) + '" type="button">Modifier</button>' +
            '<button class="a-btn a-btn--danger a-btn--sm" data-del="' + ADMIN.esc(m.id) + '" type="button">Suppr.</button>' +
            '</div></td></tr>';
        }).join("");

        el.innerHTML =
          '<div class="a-card">' +
          '<div class="a-card__head"><h2 class="a-title">Comptes équipe</h2>' +
          '<p class="a-sub">' + team.length + ' compte(s) — accès limité, sans suppression de commandes</p>' +
          '<div class="a-actions"><button class="a-btn" id="tm-add" type="button">+ Nouveau compte</button></div></div>' +
          (team.length
            ? '<div class="a-scroll"><table class="a-table"><thead><tr>' +
              '<th>Nom</th><th>E-mail</th><th>Statut</th><th>Créé le</th><th></th></tr></thead>' +
              '<tbody>' + rows + '</tbody></table></div>'
            : '<div class="a-empty"><strong>Aucun compte équipe</strong>Créez un accès limité pour une vendeuse ou un caissier : il voit les commandes et gère le stock, sans pouvoir rien supprimer d\'important.</div>') +
          '</div>' +
          '<div class="a-card"><div class="a-card__head"><h2 class="a-title">Qui peut faire quoi ?</h2></div>' +
          '<div class="a-scroll"><table class="a-table"><thead><tr><th>Action</th><th>Super admin</th><th>Équipe</th></tr></thead><tbody>' +
          '<tr><td>Voir les commandes et leurs informations</td><td>✓</td><td>✓</td></tr>' +
          '<tr><td>Changer le statut, la cliente, les notes d\'une commande</td><td>✓</td><td>✓</td></tr>' +
          '<tr><td>Créer une commande manuelle</td><td>✓</td><td>✓</td></tr>' +
          '<tr><td class="a-strong">Supprimer une commande</td><td>✓</td><td style="color:var(--err)">✗</td></tr>' +
          '<tr><td>Ajouter / modifier / supprimer des produits, gérer le stock</td><td>✓</td><td>✓</td></tr>' +
          '<tr><td>Le Journal, les statistiques, le calculateur</td><td>✓</td><td>✓</td></tr>' +
          '<tr><td class="a-strong">Réglages (TVA, frais, identifiants) et comptes équipe</td><td>✓</td><td style="color:var(--err)">✗</td></tr>' +
          '</tbody></table></div></div>';

        el.querySelector("#tm-add").addEventListener("click", function () {
          memberModal(null, function () { ADMIN.rerender(); });
        });
        el.querySelectorAll("[data-edit]").forEach(function (b) {
          b.addEventListener("click", function () {
            var m = team.filter(function (x) { return x.id === b.getAttribute("data-edit"); })[0];
            if (m) memberModal(m, function () { ADMIN.rerender(); });
          });
        });
        el.querySelectorAll("[data-del]").forEach(function (b) {
          b.addEventListener("click", function () {
            var m = team.filter(function (x) { return x.id === b.getAttribute("data-del"); })[0];
            if (!m) return;
            ADMIN.confirm("Supprimer le compte de « " + (m.name || m.email) + " » ? La personne ne pourra plus se connecter.").then(function (yes) {
              if (!yes) return;
              ADMIN.api("/api/team?id=" + encodeURIComponent(m.id), { method: "DELETE" })
                .then(function () { ADMIN.toast("Compte supprimé.", "ok"); ADMIN.rerender(); })
                .catch(function (e) { ADMIN.toast(e.message, "err"); });
            });
          });
        });
      });
    }
  });
})();
