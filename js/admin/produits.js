/* =====================================================================
   MIRACLE — module Produits (catalogue CRUD, images, stock par taille)
   Voir .design/ADMIN-CONTRACT.md pour le contrat complet.
   ===================================================================== */
(function () {
  "use strict";

  var esc = ADMIN.esc, money = ADMIN.money;

  var TYPE_LIST = "Caraco,Ensemble,Parure,Pyjama,Slip,Tanga,Nuisette,Balconnet,Body,Peignoir,Porte-jarretelles,Maillot".split(",");

  var CAT_DEFS = [
    { key: "nouveautes",  label: "Nouveautés" },
    { key: "lingerie",    label: "Lingerie" },
    { key: "sets",        label: "Ensembles" },
    { key: "mariage",     label: "Parure Mariage" },
    { key: "demi-manche", label: "Demi-Manche" },
    { key: "nuit",        label: "Nuit & Satin" },
    { key: "slips",       label: "Slips & Culottes" },
    { key: "maillots",    label: "Maillots" }
  ];

  var SIZE_CHIPS = ["XS", "S", "M", "L", "XL", "2X", "30", "32", "34", "36", "38", "A", "B", "C", "D", "E", "F", "G"];

  var searchQ = "";
  var filterV = "all";

  ADMIN.register("produits", {
    title: "Produits",
    order: 3,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path stroke-linejoin="round" d="M11.5 3.5H5A1.5 1.5 0 0 0 3.5 5v6.5a1.5 1.5 0 0 0 .44 1.06l8 8a1.5 1.5 0 0 0 2.12 0l6.5-6.5a1.5 1.5 0 0 0 0-2.12l-8-8A1.5 1.5 0 0 0 11.5 3.5Z"/>' +
      '<circle cx="8.25" cy="8.25" r="1.25"/>' +
      '</svg>',
    render: function (el) {
      return ADMIN.loadProducts().then(function (products) {
        paint(el, products);
      });
    }
  });

  /* --------------------------- filtering --------------------------- */
  function matchesFilter(p, filter) {
    if (filter === "active") return p.active !== false;
    if (filter === "hidden") return p.active === false;
    if (filter === "low") {
      if (!p.stock) return false;
      return Object.keys(p.stock).some(function (s) { return Number(p.stock[s]) <= 2; });
    }
    if (filter === "untracked") return p.stock === null || p.stock === undefined;
    return true;
  }
  function matchesSearch(p, q) {
    if (!q) return true;
    return (p.title || "").toLowerCase().indexOf(q) !== -1 ||
      (p.color || "").toLowerCase().indexOf(q) !== -1 ||
      (p.type || "").toLowerCase().indexOf(q) !== -1;
  }

  /* --------------------------- inventory KPIs -------------------------- */
  function inventoryKpisHtml(products) {
    var tracked = products.filter(function (p) { return p.stock !== null && p.stock !== undefined; });
    if (!tracked.length) {
      return '<div class="a-empty">Activez le suivi du stock sur vos pièces pour voir la valeur de votre inventaire.</div>';
    }
    var totalUnits = 0, totalValue = 0, totalMargin = 0;
    tracked.forEach(function (p) {
      var price = Number(p.price) || 0;
      var cost = p.cost != null ? Number(p.cost) : null;
      Object.keys(p.stock || {}).forEach(function (s) {
        var n = Number(p.stock[s]) || 0;
        totalUnits += n;
        totalValue += n * price;
        if (cost != null) totalMargin += n * (price - cost);
      });
    });
    return '<div class="a-kpis">' +
      '<div class="a-kpi">' +
        '<div class="a-kpi__num">' + totalUnits + '</div>' +
        '<div class="a-kpi__lbl">Stock total</div>' +
        '<div class="a-kpi__sub">' + tracked.length + (tracked.length > 1 ? ' pièces suivies' : ' pièce suivie') + '</div>' +
      '</div>' +
      '<div class="a-kpi a-kpi--hero">' +
        '<div class="a-kpi__num">' + money(totalValue) + '</div>' +
        '<div class="a-kpi__lbl">Valeur du stock</div>' +
        '<div class="a-kpi__sub">au prix de vente</div>' +
      '</div>' +
      '<div class="a-kpi">' +
        '<div class="a-kpi__num">' + money(totalMargin) + '</div>' +
        '<div class="a-kpi__lbl">Marge potentielle</div>' +
        '<div class="a-kpi__sub">sur les pièces avec prix de revient</div>' +
      '</div>' +
    '</div>';
  }

  /* ----------------------------- list view --------------------------- */
  function paint(el, products) {
    el.innerHTML =
      inventoryKpisHtml(products) +
      '<div class="a-card">' +
        '<div class="a-card__head">' +
          '<div><div class="a-title">Catalogue</div><div class="a-sub" id="pf-sub"></div></div>' +
          '<div class="a-actions"><button class="a-btn a-btn--sm" id="pf-new" type="button">+ Nouvelle pièce</button></div>' +
        '</div>' +
        '<div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-start;margin-bottom:1rem">' +
          '<div class="a-search" style="flex:1;min-width:220px;margin-bottom:0">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>' +
            '<input class="a-input" id="pf-search" type="text" placeholder="Rechercher un titre, un coloris, un type…" />' +
          '</div>' +
          '<select class="a-select" id="pf-filter" style="max-width:220px">' +
            '<option value="all">Toutes</option>' +
            '<option value="active">Actives</option>' +
            '<option value="hidden">Masquées</option>' +
            '<option value="low">Stock faible</option>' +
            '<option value="untracked">Stock non suivi</option>' +
          '</select>' +
        '</div>' +
        '<div class="a-scroll"><table class="a-table"><thead><tr>' +
          '<th></th><th>Pièce</th><th>Type</th><th class="num">Prix</th><th class="num">Prix de revient</th><th>Stock</th><th>Visible</th><th></th>' +
        '</tr></thead><tbody id="pf-tbody"></tbody></table></div>' +
      '</div>';

    var searchInput = el.querySelector("#pf-search");
    var filterSelect = el.querySelector("#pf-filter");
    searchInput.value = searchQ;
    filterSelect.value = filterV;

    function repaint() {
      var q = searchQ.toLowerCase();
      var filtered = products.filter(function (p) { return matchesFilter(p, filterV) && matchesSearch(p, q); });
      var activeCount = products.filter(function (p) { return p.active !== false; }).length;
      el.querySelector("#pf-sub").textContent =
        products.length + (products.length > 1 ? " pièces" : " pièce") + " · " +
        activeCount + (activeCount > 1 ? " actives" : " active");

      var tbody = el.querySelector("#pf-tbody");
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8"><div class="a-empty"><strong>Aucune pièce</strong>Ajustez la recherche ou créez une nouvelle pièce.</div></td></tr>';
        return;
      }
      tbody.innerHTML = filtered.map(rowHtml).join("");
    }

    function rowHtml(p) {
      var stockHtml;
      if (p.stock == null) {
        stockHtml = '<span class="a-dim">Non suivi</span>';
      } else {
        var total = 0, low = false;
        Object.keys(p.stock).forEach(function (s) {
          var n = Number(p.stock[s]) || 0;
          total += n;
          if (n <= 2) low = true;
        });
        stockHtml = total + (low ? ' <span style="color:var(--err)">⚠</span>' : '');
      }
      var stockBtn = (p.sizes && p.sizes.length)
        ? '<button class="a-btn a-btn--ghost a-btn--sm" data-stock="' + esc(p.id) + '" type="button">Stock</button>'
        : '';
      var promoBadge = p.oldPrice != null
        ? ' <span class="a-badge" style="background:var(--rose-soft);color:var(--wine)">Promo</span>'
        : '';
      var priceHtml = p.oldPrice != null
        ? '<s style="color:var(--ink-soft)">' + money(p.oldPrice) + '</s> ' + money(p.price)
        : money(p.price);
      return '<tr>' +
        '<td><img class="a-thumb" src="' + esc(p.img || "") + '" alt="" /></td>' +
        '<td><div class="a-strong">' + esc(p.title) + promoBadge + '</div><div class="a-dim">' + esc(p.color || "") + '</div></td>' +
        '<td>' + esc(p.type || "—") + '</td>' +
        '<td class="num">' + priceHtml + '</td>' +
        '<td class="num">' + (p.cost != null ? money(p.cost) : "—") + '</td>' +
        '<td>' + stockHtml + '</td>' +
        '<td>' + (p.active !== false ? '<span class="a-badge a-badge--on">En ligne</span>' : '<span class="a-badge a-badge--off">Masquée</span>') + '</td>' +
        '<td><div class="a-actions">' +
          stockBtn +
          '<button class="a-btn a-btn--ghost a-btn--sm" data-edit="' + esc(p.id) + '" type="button">Modifier</button>' +
          '<button class="a-btn a-btn--danger a-btn--sm" data-del="' + esc(p.id) + '" type="button">Suppr.</button>' +
        '</div></td>' +
      '</tr>';
    }

    function findProduct(id) {
      return products.filter(function (p) { return String(p.id) === String(id); })[0];
    }

    repaint();

    searchInput.addEventListener("input", function () { searchQ = searchInput.value || ""; repaint(); });
    filterSelect.addEventListener("change", function () { filterV = filterSelect.value; repaint(); });
    el.querySelector("#pf-new").addEventListener("click", function () { openEditModal(null); });

    el.querySelector("#pf-tbody").addEventListener("click", function (e) {
      var btn;
      if ((btn = e.target.closest("[data-stock]"))) {
        var pStock = findProduct(btn.getAttribute("data-stock"));
        if (pStock) openStockModal(pStock);
      } else if ((btn = e.target.closest("[data-edit]"))) {
        var pEdit = findProduct(btn.getAttribute("data-edit"));
        if (pEdit) openEditModal(pEdit);
      } else if ((btn = e.target.closest("[data-del]"))) {
        var pDel = findProduct(btn.getAttribute("data-del"));
        if (pDel) doDelete(pDel);
      }
    });
  }

  /* ------------------------------ delete ------------------------------ */
  function doDelete(p) {
    ADMIN.confirm("Supprimer « " + p.title + " » ? Cette action est définitive.").then(function (ok) {
      if (!ok) return;
      ADMIN.api("/api/products?id=" + encodeURIComponent(p.id), { method: "DELETE" }).then(function () {
        return ADMIN.loadProducts(true);
      }).then(function () {
        ADMIN.rerender();
        ADMIN.toast("Pièce supprimée.", "ok");
      }).catch(function (e) { ADMIN.toast(e.message, "err"); });
    });
  }

  /* --------------------------- quick stock modal ----------------------- */
  function openStockModal(product) {
    var rows = (product.sizes || []).map(function (s) {
      var qty = (product.stock && product.stock[s] != null) ? Number(product.stock[s]) : 0;
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.5rem 0;border-bottom:1px solid var(--sand)">' +
        '<span class="a-strong">' + esc(s) + '</span>' +
        '<span class="a-step' + (qty <= 0 ? ' a-step--zero' : '') + '" data-size="' + esc(s) + '">' +
          '<button type="button" data-delta="-1" aria-label="Diminuer">−</button>' +
          '<span data-qty>' + qty + '</span>' +
          '<button type="button" data-delta="1" aria-label="Augmenter">+</button>' +
        '</span>' +
      '</div>';
    }).join("");

    var body = (rows || '<div class="a-empty">Aucune taille définie pour cette pièce.</div>') +
      '<p class="a-hint" style="margin-top:.9rem">Le stock se décompte automatiquement quand une commande est confirmée.</p>';

    var m = ADMIN.modal({
      title: product.title,
      body: body,
      footer: '<button class="a-btn a-btn--ghost a-btn--sm" data-close type="button">Fermer</button>'
    });

    m.el.querySelector(".a-modal__body").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-delta]");
      if (!btn) return;
      var stepEl = btn.closest(".a-step");
      var size = stepEl.getAttribute("data-size");
      var delta = Number(btn.getAttribute("data-delta"));
      stepEl.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      ADMIN.api("/api/products", { method: "PUT", body: { action: "stock", id: product.id, size: size, delta: delta } })
        .then(function (res) {
          var updated = res.product;
          if (updated) {
            product.stock = updated.stock;
            var n = (updated.stock && updated.stock[size] != null) ? Number(updated.stock[size]) : 0;
            stepEl.querySelector("[data-qty]").textContent = n;
            stepEl.classList.toggle("a-step--zero", n <= 0);
          }
        })
        .catch(function (e2) { ADMIN.toast(e2.message, "err"); })
        .finally(function () { stepEl.querySelectorAll("button").forEach(function (b) { b.disabled = false; }); });
    });

    m.el.querySelector("[data-close]").addEventListener("click", function () {
      m.close();
      ADMIN.loadProducts(true).then(function () { ADMIN.rerender(); });
    });
  }

  /* --------------------------- edit/create modal ------------------------ */
  function buildSizeChips(p) {
    var base = SIZE_CHIPS.slice();
    (p.sizes || []).forEach(function (s) { if (base.indexOf(s) === -1) base.push(s); });
    return base.map(function (s) {
      var on = (p.sizes || []).indexOf(s) !== -1;
      return '<button type="button" class="a-tag' + (on ? ' is-on' : '') + '" data-size="' + esc(s) + '">' + esc(s) + '</button>';
    }).join("");
  }

  function fieldsHtml(p) {
    var typesSet = {};
    TYPE_LIST.forEach(function (t) { typesSet[t] = true; });
    (ADMIN.state.products || []).forEach(function (x) { if (x.type) typesSet[x.type] = true; });
    var typeOptions = Object.keys(typesSet).sort().map(function (t) { return '<option value="' + esc(t) + '"></option>'; }).join("");

    var catsHtml = CAT_DEFS.map(function (c) {
      var on = (p.cats || []).indexOf(c.key) !== -1;
      return '<button type="button" class="a-tag' + (on ? ' is-on' : '') + '" data-cat="' + esc(c.key) + '">' + esc(c.label) + '</button>';
    }).join("");

    var hasNew = (p.flags || []).indexOf("new") !== -1;
    var hasBest = (p.flags || []).indexOf("best") !== -1;
    var isActive = p.active !== false;

    return '' +
      '<div class="a-form-grid">' +
        '<div class="a-field"><label class="a-label">Titre *</label><input class="a-input" id="pf-title" type="text" value="' + esc(p.title || "") + '" required /></div>' +
        '<div class="a-field"><label class="a-label">Coloris</label><input class="a-input" id="pf-color" type="text" value="' + esc(p.color || "") + '" /></div>' +
        '<div class="a-field"><label class="a-label">Prix (DT) *</label><input class="a-input" id="pf-price" type="number" min="0" step="0.01" value="' + esc(p.price != null ? p.price : "") + '" required /></div>' +
        '<div class="a-field"><label class="a-label">Prix avant remise (TND)</label><input class="a-input" id="pf-oldprice" type="number" min="0" step="0.01" value="' + esc(p.oldPrice != null ? p.oldPrice : "") + '" /><p class="a-hint">Affiché barré sur la boutique — laissez vide s\'il n\'y a pas de promo</p></div>' +
        '<div class="a-field"><label class="a-label">Prix de revient (DT)</label><input class="a-input" id="pf-cost" type="number" min="0" step="0.01" value="' + esc(p.cost != null ? p.cost : "") + '" /><p class="a-hint">Usage interne — jamais montré sur la boutique</p></div>' +
        '<div class="a-field"><label class="a-label">Type</label><input class="a-input" id="pf-type" type="text" list="pf-type-list" value="' + esc(p.type || "") + '" /><datalist id="pf-type-list">' + typeOptions + '</datalist></div>' +
        '<div class="a-field"><label class="a-label">Coloris disponibles (choix cliente)</label><input class="a-input" id="pf-colors" type="text" placeholder="Ivoire, Noir, Bordeaux" value="' + esc((p.colors || []).join(", ")) + '" /><p class="a-hint">Séparés par des virgules. S\'il y en a plusieurs, la cliente choisit son coloris sur la boutique et il apparaît dans la commande.</p></div>' +
        '<div class="a-field a-field--full"><label class="a-label">Composition</label><textarea class="a-textarea" id="pf-composition" rows="2">' + esc(p.composition || "") + '</textarea></div>' +
        '<div class="a-field a-field--full"><label class="a-label">Catégories</label><div class="a-tags" data-tags="cats">' + catsHtml + '</div></div>' +
        '<div class="a-field a-field--full"><label class="a-label">Tailles</label><div class="a-tags" id="pf-sizes-tags">' + buildSizeChips(p) + '</div>' +
          '<div style="display:flex;gap:.5rem;margin-top:.6rem">' +
            '<input class="a-input" id="pf-size-custom" type="text" placeholder="Taille personnalisée" style="max-width:160px" />' +
            '<button type="button" class="a-btn a-btn--ghost a-btn--sm" id="pf-size-add">+ Ajouter</button>' +
          '</div></div>' +
        '<div class="a-field a-field--full" style="display:flex;gap:1.6rem;flex-wrap:wrap">' +
          '<label class="a-check"><input type="checkbox" id="pf-flag-new"' + (hasNew ? ' checked' : '') + ' /> Nouveau</label>' +
          '<label class="a-check"><input type="checkbox" id="pf-flag-best"' + (hasBest ? ' checked' : '') + ' /> Best-seller</label>' +
          '<label class="a-check"><input type="checkbox" id="pf-active"' + (isActive ? ' checked' : '') + ' /> Visible en ligne</label>' +
        '</div>' +
        '<div class="a-field a-field--full"><label class="a-label">Photos</label><div class="a-imgrow" id="pf-imgrow"></div></div>' +
        '<div class="a-field a-field--full">' +
          '<label class="a-check"><input type="checkbox" id="pf-stock-track"' + (p.stock != null ? ' checked' : '') + ' /> Suivre le stock de cette pièce</label>' +
          '<div id="pf-stock-grid" style="display:flex;flex-wrap:wrap;gap:.7rem;margin-top:.8rem" hidden></div>' +
        '</div>' +
      '</div>';
  }

  function openEditModal(product) {
    var isEdit = !!product;
    var p = product || {
      title: "", color: "", price: 0, oldPrice: null, cost: null, type: "", colors: [], composition: "",
      cats: [], sizes: [], flags: [], active: true, img: "", img2: "", gallery: [], stock: null
    };

    var imgUrl = p.img || "";
    var img2Url = p.img2 || "";
    var galleryArr = (p.gallery || []).slice();
    var stockVals = {};
    if (p.stock) { Object.keys(p.stock).forEach(function (s) { stockVals[s] = p.stock[s]; }); }

    var m = ADMIN.modal({
      title: isEdit ? ("Modifier — " + p.title) : "Nouvelle pièce",
      wide: true,
      body: fieldsHtml(p),
      footer: '<button class="a-btn a-btn--ghost" data-cancel type="button">Annuler</button><button class="a-btn" data-save type="button">Enregistrer</button>'
    });
    var box = m.el;

    /* ---- images ---- */
    var imgRow = box.querySelector("#pf-imgrow");
    function imgSlotHtml(kind, idx, url, label) {
      var rm = (kind === "gallery") ? '<button type="button" class="a-imgslot__rm" data-rm-gallery="' + idx + '">✕</button>' : "";
      var inner = url ? '<img src="' + esc(url) + '" alt="" />' : '<p>' + esc(label) + '</p>';
      var dataIdx = idx != null ? ' data-idx="' + idx + '"' : '';
      return '<div class="a-imgslot">' + inner + rm + '<input type="file" accept="image/*" data-kind="' + kind + '"' + dataIdx + ' /></div>';
    }
    function paintImgRow() {
      var html = imgSlotHtml("img", null, imgUrl, "Photo principale") + imgSlotHtml("img2", null, img2Url, "Photo au survol");
      galleryArr.forEach(function (url, idx) { html += imgSlotHtml("gallery", idx, url, "Galerie"); });
      html += imgSlotHtml("gallery-new", galleryArr.length, "", "+ Galerie");
      imgRow.innerHTML = html;
    }
    paintImgRow();

    imgRow.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-rm-gallery]");
      if (rm) { galleryArr.splice(Number(rm.getAttribute("data-rm-gallery")), 1); paintImgRow(); return; }
      var slot = e.target.closest(".a-imgslot");
      if (slot) { var input = slot.querySelector("input[type=file]"); if (input) input.click(); }
    });
    imgRow.addEventListener("change", function (e) {
      var input = e.target.closest("input[type=file]");
      if (!input) return;
      var file = input.files && input.files[0];
      if (!file) return;
      var slot = input.closest(".a-imgslot");
      var kind = input.getAttribute("data-kind");
      var idx = input.getAttribute("data-idx");
      slot.classList.add("is-busy");
      ADMIN.uploadImage(file).then(function (url) {
        if (kind === "img") imgUrl = url;
        else if (kind === "img2") img2Url = url;
        else if (kind === "gallery") galleryArr[Number(idx)] = url;
        else if (kind === "gallery-new") galleryArr.push(url);
        paintImgRow();
      }).catch(function (e2) {
        ADMIN.toast(e2.message, "err");
      }).finally(function () { slot.classList.remove("is-busy"); });
    });

    /* ---- sizes + stock grid ---- */
    var sizesTagsEl = box.querySelector("#pf-sizes-tags");
    var stockGridEl = box.querySelector("#pf-stock-grid");
    var trackCb = box.querySelector("#pf-stock-track");

    function currentSizes() {
      return Array.prototype.slice.call(sizesTagsEl.querySelectorAll(".a-tag.is-on")).map(function (b) { return b.getAttribute("data-size"); });
    }
    function paintStockGrid() {
      if (!trackCb.checked) { stockGridEl.hidden = true; stockGridEl.innerHTML = ""; return; }
      stockGridEl.hidden = false;
      var sizes = currentSizes();
      if (!sizes.length) { stockGridEl.innerHTML = '<p class="a-hint">Sélectionnez au moins une taille.</p>'; return; }
      stockGridEl.innerHTML = sizes.map(function (s) {
        var v = stockVals[s] != null ? stockVals[s] : 0;
        return '<div class="a-field" style="min-width:90px;margin-bottom:0">' +
          '<label class="a-label">' + esc(s) + '</label>' +
          '<input class="a-input" type="number" min="0" step="1" data-stock-size="' + esc(s) + '" value="' + esc(v) + '" /></div>';
      }).join("");
    }
    paintStockGrid();

    sizesTagsEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".a-tag");
      if (!chip) return;
      chip.classList.toggle("is-on");
      paintStockGrid();
    });
    stockGridEl.addEventListener("input", function (e) {
      var inp = e.target.closest("[data-stock-size]");
      if (!inp) return;
      stockVals[inp.getAttribute("data-stock-size")] = inp.value;
    });
    trackCb.addEventListener("change", paintStockGrid);

    var customInput = box.querySelector("#pf-size-custom");
    box.querySelector("#pf-size-add").addEventListener("click", function () {
      var val = (customInput.value || "").trim();
      if (!val) return;
      var existing = Array.prototype.slice.call(sizesTagsEl.querySelectorAll(".a-tag")).filter(function (b) {
        return b.getAttribute("data-size").toLowerCase() === val.toLowerCase();
      })[0];
      if (existing) {
        existing.classList.add("is-on");
      } else {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "a-tag is-on";
        btn.setAttribute("data-size", val);
        btn.textContent = val;
        sizesTagsEl.appendChild(btn);
      }
      customInput.value = "";
      paintStockGrid();
    });

    /* ---- footer ---- */
    box.querySelector("[data-cancel]").addEventListener("click", function () { m.close(); });

    box.querySelector("[data-save]").addEventListener("click", function () {
      var title = (box.querySelector("#pf-title").value || "").trim();
      var priceRaw = box.querySelector("#pf-price").value;
      var price = Number(priceRaw);
      if (!title) { ADMIN.toast("Le titre est obligatoire.", "err"); return; }
      if (priceRaw === "" || isNaN(price) || price < 0) { ADMIN.toast("Indiquez un prix valide.", "err"); return; }

      var costRaw = box.querySelector("#pf-cost").value;
      var cost = costRaw === "" ? null : Number(costRaw);
      var oldPriceRaw = box.querySelector("#pf-oldprice").value;
      var oldPrice = oldPriceRaw === "" ? null : Number(oldPriceRaw);
      var type = (box.querySelector("#pf-type").value || "").trim();
      var color = (box.querySelector("#pf-color").value || "").trim();
      var colors = (box.querySelector("#pf-colors").value || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var composition = box.querySelector("#pf-composition").value || "";
      var cats = Array.prototype.slice.call(box.querySelectorAll('[data-tags="cats"] .a-tag.is-on')).map(function (b) { return b.getAttribute("data-cat"); });
      var sizes = currentSizes();
      var flags = [];
      if (box.querySelector("#pf-flag-new").checked) flags.push("new");
      if (box.querySelector("#pf-flag-best").checked) flags.push("best");
      var active = box.querySelector("#pf-active").checked;

      var stock = null;
      if (trackCb.checked) {
        stock = {};
        sizes.forEach(function (s) {
          var el2 = stockGridEl.querySelector('[data-stock-size="' + s.replace(/"/g, '\\"') + '"]');
          var n = el2 ? Number(el2.value) : (stockVals[s] != null ? Number(stockVals[s]) : 0);
          if (isNaN(n) || n < 0) n = 0;
          stock[s] = n;
        });
      }

      var img = imgUrl;
      var img2 = img2Url;
      if (!img && galleryArr.length) img = galleryArr[0];
      if (!img2) img2 = img;

      var payload = {
        title: title, color: color, price: price, oldPrice: oldPrice, cost: cost,
        type: type, cats: cats, sizes: sizes, colors: colors, flags: flags,
        img: img, img2: img2, gallery: galleryArr, composition: composition,
        active: active, stock: stock
      };
      if (isEdit) payload.id = p.id;

      var saveBtn = box.querySelector("[data-save]");
      saveBtn.disabled = true;
      var req = isEdit
        ? ADMIN.api("/api/products", { method: "PUT", body: { product: payload } })
        : ADMIN.api("/api/products", { method: "POST", body: { product: payload } });
      req.then(function () {
        return ADMIN.loadProducts(true);
      }).then(function () {
        m.close();
        ADMIN.rerender();
        ADMIN.toast("Pièce enregistrée.", "ok");
      }).catch(function (e) {
        ADMIN.toast(e.message, "err");
      }).finally(function () {
        saveBtn.disabled = false;
      });
    });
  }
})();
