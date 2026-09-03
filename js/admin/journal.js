/* =====================================================================
   MIRACLE — module "Le Journal" (blog articles CRUD).
   Registers route "journal". See .design/ADMIN-CONTRACT.md.
   ===================================================================== */
(function () {
  "use strict";

  var TAGS = ["Mariage", "Style", "Entretien", "Conseils", "Coulisses"];

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M12 6.2c-1.5-1.15-3.55-1.7-5.4-1.7-1.05 0-2.05.12-2.6.32v13.1c.55-.2 1.55-.32 2.6-.32 1.85 0 3.9.55 5.4 1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 6.2c1.5-1.15 3.55-1.7 5.4-1.7 1.05 0 2.05.12 2.6.32v13.1c-.55-.2-1.55-.32-2.6-.32-1.85 0-3.9.55-5.4 1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 6.2v13.3" stroke-linecap="round"/>' +
    "</svg>";

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function fmtLongDate(dateStr) {
    if (!dateStr) return "—";
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  function todayIso() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return d.getFullYear() + "-" + m + "-" + day;
  }

  /* ---------------- list view ---------------- */

  function articleCardHtml(a) {
    var imgHtml = a.img
      ? '<img src="' + ADMIN.esc(a.img) + '" alt="" style="aspect-ratio:3/2;object-fit:cover;border-radius:2px;margin-bottom:.7rem" />'
      : "";
    var statusHtml = a.active
      ? '<span class="a-badge a-badge--on">Publié</span>'
      : '<span class="a-badge a-badge--off">Brouillon</span>';
    return (
      '<div class="a-card" style="margin:0">' +
      imgHtml +
      '<span class="a-badge">' + ADMIN.esc(a.tag || "Journal") + "</span>" +
      '<h3 class="a-title" style="font-size:1.1rem;margin:.55rem 0 .15rem">' + ADMIN.esc(a.title) + "</h3>" +
      '<p class="a-dim" style="margin-bottom:.5rem">' + ADMIN.esc(fmtLongDate(a.date)) + "</p>" +
      '<p class="a-dim" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">' +
      ADMIN.esc(a.excerpt || "") +
      "</p>" +
      '<div style="margin-top:.7rem">' + statusHtml + "</div>" +
      '<div class="a-actions" style="margin-top:.85rem">' +
      '<button class="a-btn a-btn--ghost a-btn--sm" type="button" data-edit="' + ADMIN.esc(a.id) + '">Modifier</button>' +
      '<button class="a-btn a-btn--danger a-btn--sm" type="button" data-del="' + ADMIN.esc(a.id) + '">Suppr.</button>' +
      "</div>" +
      "</div>"
    );
  }

  function draw(el, articles) {
    var n = articles.length;
    var subText = n + (n > 1 ? " articles" : " article");

    var html =
      '<div class="a-card">' +
      '<div class="a-card__head">' +
      "<div>" +
      '<h2 class="a-title">Articles du Journal</h2>' +
      '<p class="a-sub">' + subText + "</p>" +
      "</div>" +
      '<div class="a-actions"><button class="a-btn a-btn--sm" id="j-new" type="button">+ Nouvel article</button></div>' +
      "</div>";

    if (!n) {
      html +=
        '<div class="a-empty"><strong>Aucun article pour le moment.</strong>Créez votre premier article pour animer le Journal de la boutique.</div>';
    } else {
      var sorted = articles.slice().sort(function (a, b) {
        return (b.date || "").localeCompare(a.date || "");
      });
      html += '<div class="a-grid">';
      for (var i = 0; i < sorted.length; i++) {
        html += articleCardHtml(sorted[i]);
      }
      html += "</div>";
    }
    html += "</div>";

    el.innerHTML = html;

    var newBtn = el.querySelector("#j-new");
    if (newBtn) newBtn.addEventListener("click", function () { openModal(null); });

    var editBtns = el.querySelectorAll("[data-edit]");
    for (var e1 = 0; e1 < editBtns.length; e1++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var a = findById(articles, btn.getAttribute("data-edit"));
          if (a) openModal(a);
        });
      })(editBtns[e1]);
    }

    var delBtns = el.querySelectorAll("[data-del]");
    for (var e2 = 0; e2 < delBtns.length; e2++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-del");
          var a = findById(articles, id);
          ADMIN.confirm(
            "Supprimer l'article « " + (a ? a.title : "") + " » ? Cette action est irréversible."
          ).then(function (ok) {
            if (!ok) return;
            ADMIN.api("/api/journal?id=" + encodeURIComponent(id), { method: "DELETE" })
              .then(function () { return ADMIN.loadJournal(true); })
              .then(function () {
                ADMIN.rerender();
                ADMIN.toast("Article supprimé.", "ok");
              })
              .catch(function (err) { ADMIN.toast(err.message, "err"); });
          });
        });
      })(delBtns[e2]);
    }
  }

  /* ---------------- create / edit modal ---------------- */

  function imgSlotInnerHtml(url) {
    return (
      '<input type="file" id="j-imgfile" accept="image/*" />' +
      (url ? '<img src="' + ADMIN.esc(url) + '" alt="" />' : "<p>Cliquez pour choisir une image</p>") +
      (url ? '<button type="button" class="a-imgslot__rm" id="j-imgrm">✕</button>' : "")
    );
  }

  function openModal(article) {
    var isEdit = !!article;
    var a = article || { id: "", title: "", tag: "", date: "", href: "", excerpt: "", body: "", img: "", active: true };
    var dateVal = a.date || todayIso();

    var tagOptions = "";
    for (var t = 0; t < TAGS.length; t++) {
      tagOptions += '<option value="' + ADMIN.esc(TAGS[t]) + '"></option>';
    }

    var body =
      '<div class="a-form-grid">' +
      '<div class="a-field">' +
      '<label class="a-label" for="j-title">Titre</label>' +
      '<input class="a-input" id="j-title" type="text" value="' + ADMIN.esc(a.title) + '" required />' +
      "</div>" +
      '<div class="a-field">' +
      '<label class="a-label" for="j-tag">Rubrique</label>' +
      '<input class="a-input" id="j-tag" type="text" list="j-tag-list" value="' + ADMIN.esc(a.tag) + '" placeholder="Ex. Mariage" />' +
      '<datalist id="j-tag-list">' + tagOptions + "</datalist>" +
      "</div>" +
      '<div class="a-field">' +
      '<label class="a-label" for="j-date">Date</label>' +
      '<input class="a-input" id="j-date" type="date" value="' + ADMIN.esc(dateVal) + '" />' +
      "</div>" +
      '<div class="a-field">' +
      '<label class="a-check" style="margin-top:1.6rem"><input type="checkbox" id="j-active"' +
      (a.active ? " checked" : "") +
      ' /> Publié sur la boutique</label>' +
      "</div>" +
      '<div class="a-field a-field--full">' +
      '<label class="a-label" for="j-href">Lien de destination</label>' +
      '<input class="a-input" id="j-href" type="text" value="' + ADMIN.esc(a.href || "") + '" placeholder="collections.html?cat=mariage" />' +
      '<p class="a-hint">Optionnel — page ouverte au clic sur la carte (ex. collections.html?cat=mariage). Laisser vide sinon.</p>' +
      "</div>" +
      '<div class="a-field a-field--full">' +
      '<label class="a-label" for="j-excerpt">Extrait</label>' +
      '<textarea class="a-textarea" id="j-excerpt">' + ADMIN.esc(a.excerpt || "") + "</textarea>" +
      '<p class="a-hint">Affiché sur la carte du Journal</p>' +
      "</div>" +
      '<div class="a-field a-field--full">' +
      '<label class="a-label" for="j-body">Texte complet</label>' +
      '<textarea class="a-textarea" id="j-body" rows="10" style="min-height:220px">' + ADMIN.esc(a.body || "") + "</textarea>" +
      "</div>" +
      '<div class="a-field a-field--full">' +
      '<label class="a-label">Image</label>' +
      '<label class="a-imgslot" id="j-imgslot" style="aspect-ratio:3/2;max-width:320px">' + imgSlotInnerHtml(a.img) + "</label>" +
      "</div>" +
      "</div>";

    var footer =
      '<button class="a-btn a-btn--ghost a-btn--sm" id="j-cancel" type="button">Annuler</button>' +
      '<button class="a-btn a-btn--sm" id="j-save" type="button">Enregistrer</button>';

    var m = ADMIN.modal({
      title: isEdit ? "Modifier l'article" : "Nouvel article",
      body: body,
      footer: footer,
      wide: true
    });

    var imgUrl = a.img || "";

    m.el.querySelector("#j-cancel").addEventListener("click", function () { m.close(); });

    var slot = m.el.querySelector("#j-imgslot");
    slot.addEventListener("change", function (ev) {
      if (!ev.target || ev.target.id !== "j-imgfile") return;
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      slot.classList.add("is-busy");
      ADMIN.uploadImage(file)
        .then(function (url) {
          imgUrl = url;
          slot.innerHTML = imgSlotInnerHtml(imgUrl);
        })
        .catch(function (err) { ADMIN.toast(err.message, "err"); })
        .finally(function () { slot.classList.remove("is-busy"); });
    });
    slot.addEventListener("click", function (ev) {
      var rm = ev.target.closest ? ev.target.closest(".a-imgslot__rm") : null;
      if (!rm) return;
      ev.preventDefault();
      ev.stopPropagation();
      imgUrl = "";
      slot.innerHTML = imgSlotInnerHtml(imgUrl);
    });

    m.el.querySelector("#j-save").addEventListener("click", function () {
      var titleVal = m.el.querySelector("#j-title").value.trim();
      if (!titleVal) { ADMIN.toast("Le titre est obligatoire.", "err"); return; }

      var payload = {
        title: titleVal,
        tag: m.el.querySelector("#j-tag").value.trim(),
        date: m.el.querySelector("#j-date").value || todayIso(),
        href: m.el.querySelector("#j-href").value.trim() || null,
        excerpt: m.el.querySelector("#j-excerpt").value.trim(),
        body: m.el.querySelector("#j-body").value.trim(),
        img: imgUrl || "",
        active: !!m.el.querySelector("#j-active").checked
      };
      if (isEdit) payload.id = a.id;

      var btn = m.el.querySelector("#j-save");
      btn.disabled = true;
      ADMIN.api("/api/journal", { method: isEdit ? "PUT" : "POST", body: { article: payload } })
        .then(function () { return ADMIN.loadJournal(true); })
        .then(function () {
          m.close();
          ADMIN.rerender();
          ADMIN.toast("Article enregistré.", "ok");
        })
        .catch(function (err) { ADMIN.toast(err.message, "err"); })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ---------------- registration ---------------- */

  ADMIN.register("journal", {
    title: "Le Journal",
    icon: ICON,
    order: 6,
    render: function (el) {
      return ADMIN.loadJournal().then(function (articles) {
        draw(el, articles);
      });
    }
  });
})();
