/* =====================================================================
   MIRACLE — module Livraison (sociétés de livraison + colis en cours)
   Suit .design/ADMIN-CONTRACT.md — voir js/admin/app.js pour les helpers.
   ===================================================================== */
(function () {
  "use strict";

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M2.75 6.5a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v9.25h-11.5z"/>' +
    '<path d="M14.25 10h3.2a1 1 0 0 1 .82.43l2.2 3.13c.14.2.2.44.2.68v1.51a1 1 0 0 1-1 1h-1.15"/>' +
    '<path d="M14.25 16.75h-3.5"/>' +
    '<circle cx="7" cy="17.25" r="1.6"/>' +
    '<circle cx="17.25" cy="17.25" r="1.6"/>' +
    '</svg>';

  var ONGOING_STATUSES = { confirmee: 1, en_preparation: 1, expediee: 1 };

  /* ---------------- helpers ---------------- */
  function companyStats(companyId, orders) {
    var ongoing = 0, delivered = 0;
    (orders || []).forEach(function (o) {
      var d = o.delivery || {};
      if (d.companyId !== companyId) return;
      if (o.status === "livree") delivered++;
      else if (ONGOING_STATUSES[o.status]) ongoing++;
    });
    return { ongoing: ongoing, delivered: delivered };
  }

  function personsList(persons) {
    if (!persons || !persons.length) {
      return '<p class="a-dim">Aucun livreur enregistré</p>';
    }
    return '<p class="a-dim">' + persons.map(function (p) {
      return ADMIN.esc(p.name || "—") + (p.phone ? " — " + ADMIN.esc(p.phone) : "");
    }).join("<br>") + '</p>';
  }

  function companyCard(c, orders) {
    var stats = companyStats(c.id, orders);
    var html = '<div class="a-card" style="margin:0" data-company="' + ADMIN.esc(c.id) + '">';
    html += '<div style="display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;margin-bottom:.6rem">';
    html += '<h3 style="font-family:var(--serif);font-weight:500;font-size:1.15rem">' + ADMIN.esc(c.name || "—") + '</h3>';
    html += '<span class="a-badge ' + (c.active ? 'a-badge--on' : 'a-badge--off') + '">' + (c.active ? 'Active' : 'Inactive') + '</span>';
    html += '</div>';

    if (c.contactName) html += '<p class="a-dim">Contact : ' + ADMIN.esc(c.contactName) + '</p>';
    if (c.email) html += '<p class="a-dim">E-mail : <a href="mailto:' + ADMIN.esc(c.email) + '" style="text-decoration:underline">' + ADMIN.esc(c.email) + '</a></p>';
    if (c.phone) html += '<p class="a-dim">Téléphone : <a href="tel:' + ADMIN.esc(c.phone) + '" style="text-decoration:underline">' + ADMIN.esc(c.phone) + '</a></p>';
    if (c.zones) html += '<p class="a-dim">Zones : ' + ADMIN.esc(c.zones) + '</p>';
    if (c.priceNote) html += '<p class="a-dim">Tarif : ' + ADMIN.esc(c.priceNote) + '</p>';
    if (c.trackingUrl) html += '<p class="a-dim">Suivi en ligne ✓</p>';

    html += '<div style="margin-top:.7rem">' + personsList(c.persons) + '</div>';

    html += '<p class="a-dim" style="margin-top:.7rem">En cours : ' + stats.ongoing + ' · Livrées : ' + stats.delivered + '</p>';

    html += '<div class="a-actions" style="margin-top:1rem">';
    html += '<button class="a-btn a-btn--ghost a-btn--sm" type="button" data-edit="' + ADMIN.esc(c.id) + '">Modifier</button>';
    html += '<button class="a-btn a-btn--danger a-btn--sm" type="button" data-del="' + ADMIN.esc(c.id) + '">Suppr.</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ---------------- companies section ---------------- */
  function renderCompanies(el, companies, orders) {
    var wrap = el.querySelector("[data-companies-wrap]");
    var sub = el.querySelector("[data-companies-sub]");
    sub.textContent = companies.length + (companies.length > 1 ? " sociétés" : " société");

    if (!companies.length) {
      wrap.innerHTML = '<div class="a-empty"><strong>Aucune société de livraison</strong>' +
        'Ajoutez vos partenaires (First Delivery, Aramex…) pour assigner les commandes.</div>';
      return;
    }

    wrap.innerHTML = '<div class="a-grid">' + companies.map(function (c) { return companyCard(c, orders); }).join("") + '</div>';

    wrap.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var c = companies.filter(function (x) { return x.id === btn.getAttribute("data-edit"); })[0];
        openCompanyModal(el, c);
      });
    });
    wrap.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-del");
        var c = companies.filter(function (x) { return x.id === id; })[0];
        ADMIN.confirm('Supprimer la société "' + (c ? c.name : "") + '" ? Cette action est définitive.').then(function (ok) {
          if (!ok) return;
          ADMIN.api("/api/companies?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function () {
            return ADMIN.loadCompanies(true);
          }).then(function () {
            ADMIN.rerender();
            ADMIN.toast("Société supprimée.", "ok");
          }).catch(function (e) { ADMIN.toast(e.message, "err"); });
        });
      });
    });
  }

  /* ---------------- company modal (create/edit) ---------------- */
  function personRowHtml(p, idx) {
    p = p || {};
    return '<div class="a-form-grid" data-person-row="' + idx + '" style="align-items:end;margin-bottom:.6rem">' +
      '<div class="a-field" style="margin-bottom:0">' +
      '<label class="a-label">Nom</label>' +
      '<input class="a-input" type="text" data-person-name aria-label="Nom du livreur" placeholder="Nom du livreur" value="' + ADMIN.esc(p.name || "") + '" />' +
      '</div>' +
      '<div class="a-field" style="margin-bottom:0;display:flex;gap:.5rem;align-items:end">' +
      '<div style="flex:1">' +
      '<label class="a-label">Téléphone</label>' +
      '<input class="a-input" type="text" data-person-phone aria-label="Téléphone" placeholder="Téléphone" value="' + ADMIN.esc(p.phone || "") + '" />' +
      '</div>' +
      '<button class="a-btn a-btn--ghost a-btn--sm" type="button" data-person-rm title="Retirer" style="min-height:42px">✕</button>' +
      '</div>' +
      '</div>';
  }

  function openCompanyModal(el, company) {
    var isEdit = !!company;
    company = company || { name: "", contactName: "", email: "", phone: "", zones: "", priceNote: "", trackingUrl: "", notes: "", active: true, persons: [] };
    var persons = (company.persons || []).slice();
    var seq = persons.length;

    var body =
      '<div class="a-form-grid">' +
      '<div class="a-field">' +
      '<label class="a-label">Nom *</label>' +
      '<input class="a-input" type="text" id="lv-name" value="' + ADMIN.esc(company.name) + '" required />' +
      '</div>' +
      '<div class="a-field">' +
      '<label class="a-label">Contact</label>' +
      '<input class="a-input" type="text" id="lv-contact" value="' + ADMIN.esc(company.contactName) + '" />' +
      '</div>' +
      '<div class="a-field">' +
      '<label class="a-label">E-mail</label>' +
      '<input class="a-input" type="email" id="lv-email" value="' + ADMIN.esc(company.email) + '" />' +
      '</div>' +
      '<div class="a-field">' +
      '<label class="a-label">Téléphone</label>' +
      '<input class="a-input" type="text" id="lv-phone" value="' + ADMIN.esc(company.phone) + '" />' +
      '</div>' +
      '<div class="a-field a-field--full">' +
      '<label class="a-label">Zones desservies</label>' +
      '<input class="a-input" type="text" id="lv-zones" value="' + ADMIN.esc(company.zones) + '" />' +
      '<p class="a-hint">Ex. : Grand Tunis, Sahel, toute la Tunisie</p>' +
      '</div>' +
      '<div class="a-field a-field--full">' +
      '<label class="a-label">Tarification</label>' +
      '<input class="a-input" type="text" id="lv-price" value="' + ADMIN.esc(company.priceNote) + '" />' +
      '<p class="a-hint">Ex. : 7 DT Sahel · 9 DT ailleurs</p>' +
      '</div>' +
      '<div class="a-field a-field--full">' +
      '<label class="a-label">Lien de suivi (modèle)</label>' +
      '<input class="a-input" type="text" id="lv-tracking" value="' + ADMIN.esc(company.trackingUrl) + '" />' +
      '<p class="a-hint">URL de suivi de la société avec {code} à la place du numéro — ex. https://suivi.societe.tn/{code}. Les commandes avec un n° de suivi auront un bouton « Suivre le colis ».</p>' +
      '</div>' +
      '<div class="a-field a-field--full">' +
      '<label class="a-label">Notes</label>' +
      '<textarea class="a-textarea" id="lv-notes">' + ADMIN.esc(company.notes) + '</textarea>' +
      '</div>' +
      '<div class="a-field a-field--full">' +
      '<label class="a-check"><input type="checkbox" id="lv-active" ' + (company.active ? "checked" : "") + ' /> Active</label>' +
      '</div>' +
      '</div>' +
      '<div class="a-field a-field--full" style="margin-top:.4rem">' +
      '<label class="a-label">Livreurs</label>' +
      '<div id="lv-persons">' + persons.map(function (p, i) { return personRowHtml(p, i); }).join("") + '</div>' +
      '<button class="a-btn a-btn--ghost a-btn--sm" type="button" id="lv-person-add">+ Ajouter un livreur</button>' +
      '</div>';

    var footer =
      '<button class="a-btn a-btn--ghost a-btn--sm" type="button" data-cancel>Annuler</button>' +
      '<button class="a-btn a-btn--sm" type="button" id="lv-save">' + (isEdit ? "Enregistrer" : "Créer") + '</button>';

    var m = ADMIN.modal({ title: isEdit ? "Modifier la société" : "Nouvelle société", body: body, footer: footer, wide: true });
    m.el.querySelector("[data-cancel]").addEventListener("click", m.close);

    var personsWrap = m.el.querySelector("#lv-persons");
    m.el.querySelector("#lv-person-add").addEventListener("click", function () {
      seq++;
      var div = document.createElement("div");
      div.innerHTML = personRowHtml({}, seq);
      var row = div.firstChild;
      personsWrap.appendChild(row);
      bindRemove(row);
    });
    function bindRemove(row) {
      row.querySelector("[data-person-rm]").addEventListener("click", function () { row.remove(); });
    }
    personsWrap.querySelectorAll("[data-person-row]").forEach(bindRemove);

    m.el.querySelector("#lv-save").addEventListener("click", function () {
      var name = m.el.querySelector("#lv-name").value.trim();
      if (!name) { ADMIN.toast("Le nom de la société est requis.", "err"); return; }

      var rows = personsWrap.querySelectorAll("[data-person-row]");
      var newPersons = [];
      rows.forEach(function (row) {
        var n = row.querySelector("[data-person-name]").value.trim();
        var ph = row.querySelector("[data-person-phone]").value.trim();
        if (n || ph) newPersons.push({ name: n, phone: ph });
      });

      var payload = {
        id: company.id,
        name: name,
        contactName: m.el.querySelector("#lv-contact").value.trim(),
        email: m.el.querySelector("#lv-email").value.trim(),
        phone: m.el.querySelector("#lv-phone").value.trim(),
        zones: m.el.querySelector("#lv-zones").value.trim(),
        priceNote: m.el.querySelector("#lv-price").value.trim(),
        trackingUrl: m.el.querySelector("#lv-tracking").value.trim(),
        notes: m.el.querySelector("#lv-notes").value.trim(),
        active: m.el.querySelector("#lv-active").checked,
        persons: newPersons
      };

      var btn = m.el.querySelector("#lv-save");
      btn.disabled = true;
      ADMIN.api("/api/companies", { method: isEdit ? "PUT" : "POST", body: { company: payload } }).then(function () {
        return ADMIN.loadCompanies(true);
      }).then(function () {
        m.close();
        ADMIN.rerender();
        ADMIN.toast(isEdit ? "Société mise à jour." : "Société créée.", "ok");
      }).catch(function (e) {
        ADMIN.toast(e.message, "err");
      }).finally(function () { btn.disabled = false; });
    });
  }

  /* ---------------- ongoing parcels section ---------------- */
  function trackCell(d, companiesById) {
    var company = d.companyId ? companiesById[d.companyId] : null;
    if (!d.tracking || !company || !company.trackingUrl) return "—";
    var url = company.trackingUrl.split("{code}").join(d.tracking);
    return '<a href="' + ADMIN.esc(url) + '" target="_blank" rel="noopener" style="text-decoration:underline" onclick="event.stopPropagation()">Suivre ↗</a>';
  }

  function orderRow(o, companiesById) {
    var d = o.delivery || {};
    var c = o.customer || {};
    var companyCell = d.companyName
      ? ADMIN.esc(d.companyName)
      : '<span style="color:var(--err)">— non assignée —</span>';
    var personCell = d.personName
      ? ADMIN.esc(d.personName) + (d.personPhone ? '<br><span class="a-dim">' + ADMIN.esc(d.personPhone) + '</span>' : '')
      : '<span class="a-dim">—</span>';
    var feeCell = (d.fee || d.fee === 0) ? ADMIN.money(d.fee) : "—";

    return '<tr class="is-click" data-order="' + ADMIN.esc(o.id) + '">' +
      '<td class="a-strong">' + ADMIN.esc(o.id) + '</td>' +
      '<td>' + ADMIN.esc(c.name || "—") + '<br><span class="a-dim">' + ADMIN.esc(c.city || "—") + '</span></td>' +
      '<td>' + companyCell + '</td>' +
      '<td>' + personCell + '</td>' +
      '<td class="num">' + feeCell + '</td>' +
      '<td>' + ADMIN.statusBadge(o.status) + '</td>' +
      '<td>' + trackCell(d, companiesById) + '</td>' +
      '</tr>';
  }

  function renderOngoing(el, orders, companies) {
    var wrap = el.querySelector("[data-ongoing-wrap]");
    var list = (orders || []).filter(function (o) { return ONGOING_STATUSES[o.status]; });

    if (!list.length) {
      wrap.innerHTML = '<div class="a-empty">Aucun colis en cours de livraison.</div>';
      return;
    }

    var companiesById = {};
    (companies || []).forEach(function (c) { companiesById[c.id] = c; });

    var html = '<div class="a-scroll"><table class="a-table">' +
      '<thead><tr><th>N°</th><th>Cliente</th><th>Société</th><th>Livreur</th><th>Frais</th><th>Statut</th><th>Suivi</th></tr></thead>' +
      '<tbody>' + list.map(function (o) { return orderRow(o, companiesById); }).join("") + '</tbody>' +
      '</table></div>';
    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-order]").forEach(function (tr) {
      tr.addEventListener("click", function () { ADMIN.navigate("commandes"); });
    });
  }

  /* ---------------- module ---------------- */
  ADMIN.register("livraison", {
    title: "Livraison",
    icon: ICON,
    order: 5,
    render: function (el) {
      el.innerHTML =
        '<div class="a-card">' +
        '<div class="a-card__head">' +
        '<div><h2 class="a-title">Sociétés de livraison</h2><p class="a-sub" data-companies-sub></p></div>' +
        '<div class="a-actions"><button class="a-btn a-btn--sm" type="button" id="lv-new">+ Nouvelle société</button></div>' +
        '</div>' +
        '<div data-companies-wrap><div class="a-loading">Chargement…</div></div>' +
        '</div>' +
        '<div class="a-card">' +
        '<div class="a-card__head"><div><h2 class="a-title">Colis en cours</h2></div></div>' +
        '<div data-ongoing-wrap><div class="a-loading">Chargement…</div></div>' +
        '</div>';

      el.querySelector("#lv-new").addEventListener("click", function () { openCompanyModal(el, null); });

      return Promise.all([ADMIN.loadCompanies(), ADMIN.loadOrders()]).then(function (res) {
        var companies = res[0] || [];
        var orders = res[1] || [];
        renderCompanies(el, companies, orders);
        renderOngoing(el, orders, companies);
      }).catch(function (e) {
        ADMIN.toast(e.message, "err");
        el.querySelector("[data-companies-wrap]").innerHTML = '<div class="a-empty">Erreur de chargement.</div>';
        el.querySelector("[data-ongoing-wrap]").innerHTML = '<div class="a-empty">Erreur de chargement.</div>';
      });
    }
  });
})();
