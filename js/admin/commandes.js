/* =====================================================================
   MIRACLE — module Commandes (orders table, detail modal, manual order)
   Plain script, self-registers via ADMIN.register — see
   .design/ADMIN-CONTRACT.md for the full contract.
   ===================================================================== */
(function () {
  "use strict";

  var SOURCE_LABELS = { site: "Site web", manuelle: "Manuelle", instagram: "Instagram", whatsapp: "WhatsApp" };
  function sourceLabel(s) { return SOURCE_LABELS[s] || s || "—"; }

  function statusOptionsPlain(selectedKey) {
    return Object.keys(ADMIN.STATUS).map(function (k) {
      return '<option value="' + k + '"' + (k === selectedKey ? " selected" : "") + '>' + ADMIN.esc(ADMIN.STATUS[k].label) + '</option>';
    }).join("");
  }

  function waHref(phone) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 8) digits = "216" + digits;
    return "https://wa.me/" + digits;
  }
  function waHrefText(phone, text) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 8) digits = "216" + digits;
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
  }

  /* ---------------- relance (48h) ---------------- */
  var RELANCE_MS = 48 * 3600 * 1000;
  function isRelanceDue(o) {
    if (!o || o.status !== "nouvelle" || !o.createdAt) return false;
    var t = new Date(o.createdAt).getTime();
    return !isNaN(t) && (Date.now() - t) > RELANCE_MS;
  }

  /* ---------------- period filter ---------------- */
  function inPeriod(o, period) {
    if (!period) return true;
    var t = o.createdAt ? new Date(o.createdAt).getTime() : NaN;
    if (isNaN(t)) return false;
    var now = Date.now();
    if (period === "today") {
      var d = new Date(); d.setHours(0, 0, 0, 0);
      return t >= d.getTime();
    }
    if (period === "7d") return now - t <= 7 * 24 * 3600 * 1000;
    if (period === "30d") return now - t <= 30 * 24 * 3600 * 1000;
    return true;
  }

  /* ---------------- WhatsApp message templates ---------------- */
  function firstName(customer) {
    var n = (customer && customer.name) ? String(customer.name).trim() : "";
    return n ? n.split(/\s+/)[0] : "";
  }
  function itemsResume(items) {
    return (items || []).map(function (it) {
      var q = Number(it.qty) || 0;
      var sizePart = it.size ? " (" + it.size + ")" : "";
      return q + "× " + (it.title || "") + sizePart;
    }).join(", ");
  }
  function cleanSpaces(s) { return String(s || "").replace(/ {2,}/g, " ").trim(); }

  function msgConfirmation(o) {
    var prenom = firstName(o.customer);
    var s = "Bonjour " + prenom + " 🌸 Votre commande MIRACLE " + o.id + " (" + itemsResume(o.items) +
      ") est confirmée pour un total de " + ADMIN.money(o.total) + ". Paiement à la livraison. Merci !";
    return cleanSpaces(s);
  }
  function msgExpedition(o) {
    var delivery = o.delivery || {};
    var prenom = firstName(o.customer);
    var s = "Bonne nouvelle " + prenom + " 🌸 Votre commande " + o.id + " est en route" +
      (delivery.companyName ? " avec " + delivery.companyName : "");
    if (delivery.personName) s += ", livreur " + delivery.personName + (delivery.personPhone ? " (" + delivery.personPhone + ")" : "");
    if (delivery.tracking) s += ", n° de suivi " + delivery.tracking;
    s += ". À très vite !";
    return cleanSpaces(s);
  }
  function msgLivraison(o) {
    var prenom = firstName(o.customer);
    var s = "Merci " + prenom + " 🌸 Votre commande " + o.id + " a été livrée. Nous espérons qu'elle vous ravira " +
      "— n'hésitez pas à nous partager votre avis !";
    return cleanSpaces(s);
  }
  function msgRelance(o) {
    var prenom = firstName(o.customer);
    var s = "Bonjour " + prenom + " 🌸 Nous avons bien reçu votre demande " + o.id + " (" + itemsResume(o.items) +
      "). Souhaitez-vous la confirmer ? Livraison partout en Tunisie, paiement à la livraison.";
    return cleanSpaces(s);
  }

  function fieldHtml(label, id, value) {
    return '<div class="a-field"><label class="a-label">' + label + '</label>' +
      '<input class="a-input" id="' + id + '" value="' + ADMIN.esc(value) + '" /></div>';
  }
  function fieldFullHtml(label, id, value) {
    return '<div class="a-field a-field--full"><label class="a-label">' + label + '</label>' +
      '<input class="a-input" id="' + id + '" value="' + ADMIN.esc(value) + '" /></div>';
  }
  function textareaFullHtml(label, id, value) {
    return '<div class="a-field a-field--full"><label class="a-label">' + label + '</label>' +
      '<textarea class="a-textarea" id="' + id + '">' + ADMIN.esc(value) + '</textarea></div>';
  }
  function sectionHtml(label) {
    return '<p class="a-label" style="margin-top:1.2rem;margin-bottom:.4rem">' + label + '</p>';
  }

  /* ---------------- rows ---------------- */
  function rowHtml(o) {
    var items = o.items || [];
    var qty = items.reduce(function (s, it) { return s + (Number(it.qty) || 0); }, 0);
    var customer = o.customer || {};
    var custName = customer.name ? customer.name : sourceLabel(o.source);
    var deliveryName = (o.delivery && o.delivery.companyName) ? o.delivery.companyName : "—";
    var paidHtml = o.paid ? '<span class="a-badge a-badge--on">Oui</span>' : "—";
    return '<tr class="is-click" data-id="' + ADMIN.esc(o.id) + '">' +
      '<td class="a-strong">' + ADMIN.esc(o.id) + '</td>' +
      '<td>' + ADMIN.esc(ADMIN.fmtDate(o.createdAt)) + '</td>' +
      '<td>' + ADMIN.esc(custName) + (customer.phone ? '<br><span class="a-dim">' + ADMIN.esc(customer.phone) + '</span>' : "") + '</td>' +
      '<td>' + qty + ' pièce(s)</td>' +
      '<td class="num">' + ADMIN.money(o.total) + '</td>' +
      '<td>' + ADMIN.esc(deliveryName) + '</td>' +
      '<td>' + paidHtml + '</td>' +
      '<td>' + ADMIN.statusBadge(o.status) + '</td>' +
      '</tr>';
  }

  /* ---------------- detail modal ---------------- */
  function openDetailModal(o, companies, products) {
    var activeCompanies = companies.filter(function (c) { return c.active; });
    var customer = o.customer || {};
    var delivery = o.delivery || {};
    var items = o.items || [];

    var itemsRows = items.map(function (it) {
      var lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 0);
      var titleLine = ADMIN.esc(it.title) + (it.size ? " — " + ADMIN.esc(it.size) : "");
      var colorLine = it.color ? '<br><span class="a-dim">' + ADMIN.esc(it.color) + '</span>' : "";
      return '<tr><td>' + titleLine + colorLine + '</td><td class="num">' + (Number(it.qty) || 0) +
        '</td><td class="num">' + ADMIN.money(it.price) + '</td><td class="num">' + ADMIN.money(lineTotal) + '</td></tr>';
    }).join("");
    var feeRow = "";
    if (typeof delivery.fee === "number") {
      feeRow = '<tr><td colspan="3" class="a-dim">Livraison</td><td class="num">+ ' + ADMIN.money(delivery.fee) + '</td></tr>';
    }
    var totalRow = '<tr><td colspan="3" class="a-strong">Total</td><td class="num a-strong">' + ADMIN.money(o.total) + '</td></tr>';
    var tvaRow = "";
    if (ADMIN.tvaRate() > 0) {
      tvaRow = '<tr><td colspan="3" class="a-dim">dont TVA</td><td class="num a-dim">' + ADMIN.money(ADMIN.tvaPart(o.total)) + '</td></tr>';
    }

    var companyOptions = '<option value="">— Aucune —</option>' + activeCompanies.map(function (c) {
      return '<option value="' + ADMIN.esc(c.id) + '"' + (delivery.companyId === c.id ? " selected" : "") + '>' + ADMIN.esc(c.name) + '</option>';
    }).join("");

    var waSection = "";
    if (customer.phone) {
      waSection = sectionHtml("Messages WhatsApp") +
        '<div class="a-actions" style="justify-content:flex-start;margin-bottom:1rem;flex-wrap:wrap">' +
        '<a class="a-btn a-btn--ghost a-btn--sm" href="' + waHrefText(customer.phone, msgConfirmation(o)) + '" target="_blank" rel="noopener">Confirmation</a>' +
        '<a class="a-btn a-btn--ghost a-btn--sm" href="' + waHrefText(customer.phone, msgExpedition(o)) + '" target="_blank" rel="noopener">Expédition</a>' +
        '<a class="a-btn a-btn--ghost a-btn--sm" href="' + waHrefText(customer.phone, msgLivraison(o)) + '" target="_blank" rel="noopener">Livraison</a>' +
        '<a class="a-btn a-btn--ghost a-btn--sm" href="' + waHrefText(customer.phone, msgRelance(o)) + '" target="_blank" rel="noopener">Relance</a>' +
        '</div>';
    }

    var historyHtml = "";
    if (o.history && o.history.length) {
      historyHtml = sectionHtml("Historique") +
        '<ul class="a-dim" style="font-size:.8rem;line-height:1.9">' + o.history.map(function (h) {
          var lbl = (ADMIN.STATUS[h.status] && ADMIN.STATUS[h.status].label) || h.status || "—";
          return "<li>" + ADMIN.esc(ADMIN.fmtDate(h.at)) + " — " + ADMIN.esc(lbl) + "</li>";
        }).join("") + '</ul>';
    }

    var body =
      '<div class="a-scroll"><table class="a-table" style="min-width:420px">' +
      '<thead><tr><th>Article</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>' +
      '<tbody>' + itemsRows + feeRow + totalRow + tvaRow + '</tbody></table></div>' +

      '<div class="a-field" style="margin-top:1.2rem">' +
      '<label class="a-label">Statut</label>' +
      '<select class="a-select" id="dm-status">' + statusOptionsPlain(o.status) + '</select>' +
      '<p class="a-hint">Confirmer une commande décompte automatiquement le stock suivi ; annulation/retour le restitue.</p>' +
      '</div>' +

      (customer.phone ? '<a class="a-btn a-btn--ghost a-btn--sm" href="' + waHref(customer.phone) + '" target="_blank" rel="noopener">WhatsApp cliente</a>' : "") +

      sectionHtml("Cliente") +
      '<div class="a-form-grid">' +
      fieldHtml("Nom", "dm-c-name", customer.name) +
      fieldHtml("Téléphone", "dm-c-phone", customer.phone) +
      fieldHtml("Ville", "dm-c-city", customer.city) +
      fieldFullHtml("Adresse", "dm-c-address", customer.address) +
      textareaFullHtml("Note", "dm-c-note", customer.note) +
      '</div>' +
      '<div class="a-actions" style="margin-bottom:1rem"><button class="a-btn a-btn--ghost a-btn--sm" id="dm-save-customer" type="button">Enregistrer la cliente</button></div>' +

      sectionHtml("Livraison") +
      '<div class="a-form-grid">' +
      '<div class="a-field"><label class="a-label">Société</label><select class="a-select" id="dm-d-company">' + companyOptions + '</select></div>' +
      '<div class="a-field"><label class="a-label">Livreur (liste)</label><select class="a-select" id="dm-d-person"><option value="">— Choisir —</option></select></div>' +
      fieldHtml("Livreur (nom)", "dm-d-pname", delivery.personName) +
      fieldHtml("Livreur (téléphone)", "dm-d-pphone", delivery.personPhone) +
      '<div class="a-field"><label class="a-label">Frais (DT)</label><input class="a-input" type="number" step="0.01" min="0" id="dm-d-fee" value="' + (typeof delivery.fee === "number" ? delivery.fee : "") + '" /></div>' +
      '<div class="a-field a-field--full"><label class="a-label">N° de suivi (code barre)</label>' +
      '<input class="a-input" id="dm-d-tracking" value="' + ADMIN.esc(delivery.tracking) + '" />' +
      '<p id="dm-tracking-link" style="margin-top:.5rem"></p>' +
      '</div>' +
      fieldFullHtml("Note livraison", "dm-d-note", delivery.note) +
      '</div>' +
      '<div class="a-actions" style="margin-bottom:1rem"><button class="a-btn a-btn--ghost a-btn--sm" id="dm-save-delivery" type="button">Enregistrer la livraison</button></div>' +

      waSection +

      sectionHtml("Paiement") +
      '<div class="a-field"><label class="a-check"><input type="checkbox" id="dm-paid"' + (o.paid ? " checked" : "") + ' /> Payée (encaissée à la livraison)</label></div>' +

      sectionHtml("Notes internes") +
      '<div class="a-field"><textarea class="a-textarea" id="dm-notes">' + ADMIN.esc(o.notes) + '</textarea></div>' +
      '<div class="a-actions" style="margin-bottom:1rem"><button class="a-btn a-btn--ghost a-btn--sm" id="dm-save-notes" type="button">Enregistrer les notes</button></div>' +

      historyHtml;

    var footer =
      '<button class="a-btn a-btn--danger a-btn--sm" id="dm-delete" type="button">Supprimer</button>' +
      '<button class="a-btn a-btn--ghost a-btn--sm" id="dm-close" type="button">Fermer</button>';

    var m = ADMIN.modal({ title: o.id, wide: true, body: body, footer: footer });

    /* status change */
    m.el.querySelector("#dm-status").addEventListener("change", function (e) {
      var v = e.target.value;
      ADMIN.api("/api/orders", { method: "PUT", body: { id: o.id, patch: { status: v } } }).then(function () {
        return ADMIN.loadOrders(true);
      }).then(function () {
        ADMIN.refreshCounts();
        m.close();
        ADMIN.rerender();
        ADMIN.toast("Statut mis à jour.", "ok");
      }).catch(function (e2) { ADMIN.toast(e2.message, "err"); });
    });

    /* delivery: company -> person rebuild */
    var companySel = m.el.querySelector("#dm-d-company");
    var personSel = m.el.querySelector("#dm-d-person");
    var pnameInput = m.el.querySelector("#dm-d-pname");
    var pphoneInput = m.el.querySelector("#dm-d-pphone");
    var trackingInput = m.el.querySelector("#dm-d-tracking");
    var trackingLinkEl = m.el.querySelector("#dm-tracking-link");
    var currentPersons = [];
    function buildPersonOptions(companyId) {
      var comp = activeCompanies.filter(function (c) { return c.id === companyId; })[0];
      currentPersons = (comp && comp.persons) || [];
      var html = '<option value="">— Choisir —</option>' + currentPersons.map(function (p, idx) {
        return '<option value="' + idx + '">' + ADMIN.esc(p.name) + '</option>';
      }).join("");
      personSel.innerHTML = html;
    }
    function refreshTrackingLink() {
      var comp = activeCompanies.filter(function (c) { return c.id === companySel.value; })[0];
      var code = trackingInput.value.trim();
      if (comp && comp.trackingUrl && comp.trackingUrl.indexOf("{code}") !== -1 && code) {
        var href = comp.trackingUrl.replace("{code}", encodeURIComponent(code));
        trackingLinkEl.innerHTML = '<a class="a-btn a-btn--ghost a-btn--sm" href="' + ADMIN.esc(href) + '" target="_blank" rel="noopener">Suivre le colis ↗</a>';
      } else {
        trackingLinkEl.innerHTML = "";
      }
    }
    buildPersonOptions(delivery.companyId || "");
    refreshTrackingLink();
    companySel.addEventListener("change", function () { buildPersonOptions(companySel.value); refreshTrackingLink(); });
    trackingInput.addEventListener("input", refreshTrackingLink);
    personSel.addEventListener("change", function () {
      if (personSel.value === "") return;
      var p = currentPersons[Number(personSel.value)];
      if (p) { pnameInput.value = p.name || ""; pphoneInput.value = p.phone || ""; }
    });

    m.el.querySelector("#dm-save-delivery").addEventListener("click", function () {
      var comp = activeCompanies.filter(function (c) { return c.id === companySel.value; })[0];
      var feeRaw = m.el.querySelector("#dm-d-fee").value;
      var fee = feeRaw === "" ? null : Number(feeRaw);
      var patch = {
        delivery: {
          companyId: companySel.value || null,
          companyName: comp ? comp.name : "",
          personName: pnameInput.value.trim(),
          personPhone: pphoneInput.value.trim(),
          fee: (fee === null || isNaN(fee)) ? null : fee,
          tracking: m.el.querySelector("#dm-d-tracking").value.trim(),
          note: m.el.querySelector("#dm-d-note").value.trim()
        }
      };
      ADMIN.api("/api/orders", { method: "PUT", body: { id: o.id, patch: patch } }).then(function () {
        return ADMIN.loadOrders(true);
      }).then(function () {
        ADMIN.rerender();
        ADMIN.toast("Livraison enregistrée.", "ok");
      }).catch(function (e2) { ADMIN.toast(e2.message, "err"); });
    });

    m.el.querySelector("#dm-save-customer").addEventListener("click", function () {
      var patch = {
        customer: {
          name: m.el.querySelector("#dm-c-name").value.trim(),
          phone: m.el.querySelector("#dm-c-phone").value.trim(),
          city: m.el.querySelector("#dm-c-city").value.trim(),
          address: m.el.querySelector("#dm-c-address").value.trim(),
          note: m.el.querySelector("#dm-c-note").value.trim()
        }
      };
      ADMIN.api("/api/orders", { method: "PUT", body: { id: o.id, patch: patch } }).then(function () {
        return ADMIN.loadOrders(true);
      }).then(function () {
        ADMIN.rerender();
        ADMIN.toast("Cliente enregistrée.", "ok");
      }).catch(function (e2) { ADMIN.toast(e2.message, "err"); });
    });

    m.el.querySelector("#dm-paid").addEventListener("change", function (e) {
      var val = e.target.checked;
      ADMIN.api("/api/orders", { method: "PUT", body: { id: o.id, patch: { paid: val } } }).then(function () {
        return ADMIN.loadOrders(true);
      }).then(function () {
        ADMIN.rerender();
        ADMIN.toast(val ? "Marquée payée." : "Marquée non payée.", "ok");
      }).catch(function (e2) { ADMIN.toast(e2.message, "err"); e.target.checked = !val; });
    });

    m.el.querySelector("#dm-save-notes").addEventListener("click", function () {
      var v = m.el.querySelector("#dm-notes").value;
      ADMIN.api("/api/orders", { method: "PUT", body: { id: o.id, patch: { notes: v } } }).then(function () {
        return ADMIN.loadOrders(true);
      }).then(function () {
        ADMIN.rerender();
        ADMIN.toast("Notes enregistrées.", "ok");
      }).catch(function (e2) { ADMIN.toast(e2.message, "err"); });
    });

    m.el.querySelector("#dm-delete").addEventListener("click", function () {
      ADMIN.confirm("Supprimer définitivement la commande " + o.id + " ?").then(function (ok) {
        if (!ok) return;
        ADMIN.api("/api/orders?id=" + encodeURIComponent(o.id), { method: "DELETE" }).then(function () {
          return ADMIN.loadOrders(true);
        }).then(function () {
          ADMIN.refreshCounts();
          m.close();
          ADMIN.rerender();
          ADMIN.toast("Commande supprimée.", "ok");
        }).catch(function (e2) { ADMIN.toast(e2.message, "err"); });
      });
    });

    m.el.querySelector("#dm-close").addEventListener("click", function () { m.close(); });
  }

  /* ---------------- manual order modal ---------------- */
  function itemRowHtml(products) {
    var productOptions = '<option value="">— Choisir un article —</option>' + products.map(function (p) {
      return '<option value="' + ADMIN.esc(p.id) + '">' + ADMIN.esc(p.title + (p.color ? " — " + p.color : "")) + '</option>';
    }).join("");
    return '<div class="a-form-grid item-row" style="margin-bottom:1rem">' +
      '<div class="a-field"><label class="a-label">Article</label><select class="a-select item-product">' + productOptions + '</select></div>' +
      '<div class="a-field"><label class="a-label">Taille</label><select class="a-select item-size"><option value="">—</option></select></div>' +
      '<div class="a-field"><label class="a-label">Qté</label><input class="a-input item-qty" type="number" min="1" value="1" /></div>' +
      '<div class="a-field"><label class="a-label">Prix (DT)</label><input class="a-input item-price" type="number" step="0.01" min="0" value="0" /></div>' +
      '<div class="a-field a-field--full"><button class="a-btn a-btn--ghost a-btn--sm item-remove" type="button">✕ Retirer cette pièce</button></div>' +
      '</div>';
  }

  function openManualOrderModal(companies, products) {
    var body =
      '<div class="a-form-grid">' +
      '<div class="a-field"><label class="a-label">Source</label><select class="a-select" id="mo-source">' +
      '<option value="manuelle" selected>Manuelle</option>' +
      '<option value="instagram">Instagram</option>' +
      '<option value="whatsapp">WhatsApp</option>' +
      '</select></div>' +
      '<div class="a-field"><label class="a-label">Statut</label><select class="a-select" id="mo-status">' + statusOptionsPlain("nouvelle") + '</select></div>' +
      '</div>' +
      sectionHtml("Cliente") +
      '<div class="a-form-grid">' +
      fieldHtml("Nom", "mo-c-name", "") +
      fieldHtml("Téléphone", "mo-c-phone", "") +
      fieldHtml("Ville", "mo-c-city", "") +
      fieldFullHtml("Adresse", "mo-c-address", "") +
      '</div>' +
      sectionHtml("Articles") +
      '<div id="mo-items">' + itemRowHtml(products) + '</div>' +
      '<div class="a-actions" style="margin-bottom:1rem"><button class="a-btn a-btn--ghost a-btn--sm" id="mo-add-row" type="button">+ Ajouter une pièce</button></div>' +
      '<p class="a-sub">Total calculé : <span id="mo-calc-total">' + ADMIN.money(0) + '</span></p>' +
      '<div class="a-field"><label class="a-label">Total (DT)</label><input class="a-input" id="mo-total" type="number" step="0.01" min="0" value="0.00" /></div>';

    var footer =
      '<button class="a-btn a-btn--ghost a-btn--sm" id="mo-cancel" type="button">Annuler</button>' +
      '<button class="a-btn a-btn--sm" id="mo-create" type="button">Créer la commande</button>';

    var m = ADMIN.modal({ title: "Nouvelle commande", wide: true, body: body, footer: footer });

    var itemsWrap = m.el.querySelector("#mo-items");
    var calcTotalEl = m.el.querySelector("#mo-calc-total");
    var totalInput = m.el.querySelector("#mo-total");
    var dirty = false;

    function recomputeTotal() {
      var rows = itemsWrap.querySelectorAll(".item-row");
      var sum = 0;
      rows.forEach(function (row) {
        var qty = Number(row.querySelector(".item-qty").value) || 0;
        var price = Number(row.querySelector(".item-price").value) || 0;
        sum += qty * price;
      });
      calcTotalEl.textContent = ADMIN.money(sum);
      if (!dirty) totalInput.value = sum.toFixed(2);
      return sum;
    }

    itemsWrap.addEventListener("change", function (e) {
      var t = e.target;
      if (t.classList.contains("item-product")) {
        var row = t.closest(".item-row");
        var prod = products.filter(function (p) { return p.id === t.value; })[0];
        var sizeSel = row.querySelector(".item-size");
        var priceInput = row.querySelector(".item-price");
        if (prod) {
          var sizes = prod.sizes || [];
          sizeSel.innerHTML = sizes.length ?
            sizes.map(function (s) { return '<option value="' + ADMIN.esc(s) + '">' + ADMIN.esc(s) + '</option>'; }).join("") :
            '<option value="">—</option>';
          priceInput.value = (Number(prod.price) || 0).toFixed(2);
        } else {
          sizeSel.innerHTML = '<option value="">—</option>';
        }
        recomputeTotal();
      } else if (t.classList.contains("item-qty") || t.classList.contains("item-price")) {
        recomputeTotal();
      }
    });
    itemsWrap.addEventListener("input", function (e) {
      var t = e.target;
      if (t.classList.contains("item-qty") || t.classList.contains("item-price")) recomputeTotal();
    });
    itemsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".item-remove");
      if (!btn) return;
      var row = btn.closest(".item-row");
      if (row) row.remove();
      recomputeTotal();
    });

    m.el.querySelector("#mo-add-row").addEventListener("click", function () {
      itemsWrap.insertAdjacentHTML("beforeend", itemRowHtml(products));
      recomputeTotal();
    });

    totalInput.addEventListener("input", function () { dirty = true; });

    m.el.querySelector("#mo-cancel").addEventListener("click", function () { m.close(); });

    var createBtn = m.el.querySelector("#mo-create");
    createBtn.addEventListener("click", function () {
      var rows = itemsWrap.querySelectorAll(".item-row");
      var items = [];
      rows.forEach(function (row) {
        var pid = row.querySelector(".item-product").value;
        if (!pid) return;
        var prod = products.filter(function (p) { return p.id === pid; })[0];
        if (!prod) return;
        items.push({
          id: prod.id,
          title: prod.title,
          color: prod.color || "",
          size: row.querySelector(".item-size").value || "",
          qty: Math.max(1, Number(row.querySelector(".item-qty").value) || 1),
          price: Number(row.querySelector(".item-price").value) || 0
        });
      });
      if (!items.length) { ADMIN.toast("Ajoutez au moins un article.", "err"); return; }

      var order = {
        source: m.el.querySelector("#mo-source").value,
        status: m.el.querySelector("#mo-status").value,
        customer: {
          name: m.el.querySelector("#mo-c-name").value.trim(),
          phone: m.el.querySelector("#mo-c-phone").value.trim(),
          city: m.el.querySelector("#mo-c-city").value.trim(),
          address: m.el.querySelector("#mo-c-address").value.trim()
        },
        items: items,
        notes: ""
      };
      if (dirty) order.total = Number(totalInput.value) || 0;

      createBtn.disabled = true;
      ADMIN.api("/api/orders", { method: "POST", body: { action: "manual", order: order } }).then(function () {
        return ADMIN.loadOrders(true);
      }).then(function () {
        ADMIN.refreshCounts();
        m.close();
        ADMIN.rerender();
        ADMIN.toast("Commande créée.", "ok");
      }).catch(function (e2) { ADMIN.toast(e2.message, "err"); }).finally(function () { createBtn.disabled = false; });
    });
  }

  /* ---------------- module registration ---------------- */
  ADMIN.register("commandes", {
    title: "Commandes",
    order: 2,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 8h11l1 12.2a1 1 0 0 1-1 1.1H6.5a1 1 0 0 1-1-1.1L6.5 8z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    render: function (el) {
      return Promise.all([ADMIN.loadOrders(), ADMIN.loadCompanies(), ADMIN.loadProducts()]).then(function (res) {
        var orders = res[0], companies = res[1], products = res[2];

        var counts = {};
        orders.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
        var statusFilterOptions = '<option value="">Toutes (' + orders.length + ')</option>' +
          Object.keys(ADMIN.STATUS).map(function (k) {
            return '<option value="' + k + '">' + ADMIN.esc(ADMIN.STATUS[k].label) + ' (' + (counts[k] || 0) + ')</option>';
          }).join("");

        var periodFilterOptions =
          '<option value="today">Aujourd\'hui</option>' +
          '<option value="7d">7 derniers jours</option>' +
          '<option value="30d">30 derniers jours</option>' +
          '<option value="" selected>Tout</option>';

        var citiesSeen = {};
        orders.forEach(function (o) {
          var c = o.customer && o.customer.city && String(o.customer.city).trim();
          if (c) citiesSeen[c] = true;
        });
        var cityList = Object.keys(citiesSeen).sort(function (a, b) { return a.localeCompare(b, "fr"); });
        var cityFilterOptions = '<option value="">Toutes les villes</option>' + cityList.map(function (c) {
          return '<option value="' + ADMIN.esc(c) + '">' + ADMIN.esc(c) + '</option>';
        }).join("");

        var relanceCount = orders.filter(isRelanceDue).length;

        el.innerHTML =
          '<div class="a-card">' +
          '<div class="a-card__head">' +
          '<h2 class="a-title">Commandes</h2>' +
          '<span class="a-sub" id="cmd-count"></span>' +
          '<div class="a-actions"><button class="a-btn a-btn--sm" id="cmd-new" type="button">+ Nouvelle commande</button></div>' +
          '</div>' +
          '<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">' +
          '<select class="a-select" id="cmd-filter-status" style="display:inline-block;width:auto;max-width:200px">' + statusFilterOptions + '</select>' +
          '<select class="a-select" id="cmd-filter-period" style="display:inline-block;width:auto;max-width:170px">' + periodFilterOptions + '</select>' +
          '<select class="a-select" id="cmd-filter-city" style="display:inline-block;width:auto;max-width:170px">' + cityFilterOptions + '</select>' +
          '<button class="a-tag" id="cmd-filter-relance" type="button">⏰ À relancer' + (relanceCount ? " (" + relanceCount + ")" : "") + '</button>' +
          '</div>' +
          '<div class="a-search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input class="a-input" id="cmd-search" type="text" placeholder="Rechercher (n°, cliente, téléphone)…" />' +
          '</div>' +
          '<div id="cmd-table-wrap"></div>' +
          '</div>';

        var filterSel = el.querySelector("#cmd-filter-status");
        var periodSel = el.querySelector("#cmd-filter-period");
        var citySel = el.querySelector("#cmd-filter-city");
        var relanceBtn = el.querySelector("#cmd-filter-relance");
        var searchInput = el.querySelector("#cmd-search");
        var wrap = el.querySelector("#cmd-table-wrap");
        var countEl = el.querySelector("#cmd-count");
        var relanceOnly = false;

        function renderTable() {
          var statusVal = filterSel.value;
          var periodVal = periodSel.value;
          var cityVal = citySel.value;
          var q = (searchInput.value || "").trim().toLowerCase();
          var filtered = orders.filter(function (o) {
            if (relanceOnly && !isRelanceDue(o)) return false;
            if (statusVal && o.status !== statusVal) return false;
            if (!inPeriod(o, periodVal)) return false;
            if (cityVal && (!o.customer || String(o.customer.city || "").trim() !== cityVal)) return false;
            if (q) {
              var customer = o.customer || {};
              var hay = (o.id + " " + (customer.name || "") + " " + (customer.phone || "")).toLowerCase();
              if (hay.indexOf(q) === -1) return false;
            }
            return true;
          });
          countEl.textContent = filtered.length + " commande(s)";
          if (!filtered.length) {
            wrap.innerHTML = '<div class="a-empty">' +
              (relanceOnly ? "Aucune commande à relancer pour le moment." : "Aucune commande ne correspond à cette recherche.") +
              '</div>';
            return;
          }
          wrap.innerHTML =
            '<div class="a-scroll"><table class="a-table"><thead><tr>' +
            '<th>N°</th><th>Date</th><th>Cliente</th><th>Pièces</th><th>Total</th><th>Livraison</th><th>Payée</th><th>Statut</th>' +
            '</tr></thead><tbody>' + filtered.map(rowHtml).join("") + '</tbody></table></div>';
        }

        filterSel.addEventListener("change", renderTable);
        periodSel.addEventListener("change", renderTable);
        citySel.addEventListener("change", renderTable);
        searchInput.addEventListener("input", renderTable);
        relanceBtn.addEventListener("click", function () {
          relanceOnly = !relanceOnly;
          relanceBtn.classList.toggle("is-on", relanceOnly);
          if (relanceOnly) filterSel.value = "";
          renderTable();
        });
        wrap.addEventListener("click", function (e) {
          var tr = e.target.closest("tr[data-id]");
          if (!tr) return;
          var id = tr.getAttribute("data-id");
          var order = orders.filter(function (o) { return o.id === id; })[0];
          if (order) openDetailModal(order, companies, products);
        });
        el.querySelector("#cmd-new").addEventListener("click", function () {
          openManualOrderModal(companies, products);
        });

        renderTable();
      });
    }
  });
})();
