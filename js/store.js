/* =====================================================================
   MIRACLE — store runtime (single source of chrome + engines)
   Loaded on every page. Renders header (mega menus), search overlay,
   cart drawer, footer; runs the PLP filter engine, the PDP, the
   bestsellers carousel, accordions and scroll reveals. No framework.
   Orders are placed by WhatsApp (no real checkout).

   NOTE: prices are placeholders in Tunisian dinar (DT) — edit freely
   in the PRODUCTS array below. Country code for WhatsApp: +216.
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WA_NUMBER = "21692970596";
  var IG = "https://www.instagram.com/miracle_collection_feminine/";

  /* ------------------------------------------------------------------ */
  /* 1. DATA                                                            */
  /* ------------------------------------------------------------------ */
  var P = "assets/products/", M = "assets/models/";
  var PRODUCTS = [
    { id:"caraco-bordeaux", title:"Caraco Dentelle", color:"Bordeaux & Ivoire", price:149, type:"Caraco",
      cats:["lingerie","sets","nouveautes"], sizes:["S","M","L","XL"], colors:["Bordeaux","Ivoire"],
      img:P+"FB_IMG_1783911618872.jpg", img2:P+"Screenshot_20260713_032353_Instagram.jpg",
      gallery:[P+"FB_IMG_1783911618872.jpg",P+"Screenshot_20260713_032353_Instagram.jpg",P+"Screenshot_20260713_032414_Instagram.jpg"],
      flags:["best","new"], composition:"Dentelle 90% polyamide, 10% élasthanne · doublure satin" },
    { id:"boudoir-champagne", title:"Ensemble Boudoir", color:"Champagne & Plume", price:189, type:"Ensemble",
      cats:["lingerie","sets"], sizes:["S","M","L"], colors:["Champagne"],
      img:P+"Screenshot_20260713_032414_Instagram.jpg", img2:P+"Screenshot_20260713_032345_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032414_Instagram.jpg",P+"Screenshot_20260713_032345_Instagram.jpg"],
      flags:["best"], composition:"Satin de soie mélangé · appliqués dentelle brodée · plume" },
    { id:"parure-blanc", title:"Parure Mariage", color:"Blanc Nacré", price:240, type:"Parure",
      cats:["mariage","sets","nouveautes"], sizes:["S","M","L","XL"], colors:["Blanc"],
      img:P+"Screenshot_20260713_032334_Instagram.jpg", img2:P+"Screenshot_20260713_032345_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032334_Instagram.jpg",P+"Screenshot_20260713_032345_Instagram.jpg"],
      flags:["new"], composition:"Peignoir + nuisette + culotte · satin & guipure · fait main" },
    { id:"pyjama-sauge", title:"Pyjama 3 Pièces", color:"Sauge & Roses", price:129, type:"Pyjama",
      cats:["demi-manche","nuit"], sizes:["S","M","L","XL"], colors:["Sauge","Écru"],
      img:P+"Screenshot_20260713_032435_Instagram.jpg", img2:P+"Screenshot_20260713_032428_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032435_Instagram.jpg",P+"Screenshot_20260713_032428_Instagram.jpg"],
      flags:[], composition:"Caraco côtelé + short + pantalon · finitions dentelle" },
    { id:"slip-dentelle", title:"Slip Dentelle", color:"Toutes teintes", price:39, type:"Slip",
      cats:["slips","lingerie"], sizes:["XS","S","M","L","XL","2X"], colors:["Noir","Rose","Écru","Bordeaux"],
      img:P+"Screenshot_20260713_032448_Instagram.jpg", img2:P+"Screenshot_20260713_032448_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032448_Instagram.jpg"],
      flags:["best"], composition:"Dentelle florale · fond coton" },
    { id:"caraco-terracotta", title:"Caraco & Short", color:"Terracotta", price:119, type:"Caraco",
      cats:["lingerie","sets","demi-manche"], sizes:["S","M","L"], colors:["Terracotta"],
      img:P+"FB_IMG_1783911626355.jpg", img2:P+"Screenshot_20260713_032428_Instagram.jpg",
      gallery:[P+"FB_IMG_1783911626355.jpg",P+"Screenshot_20260713_032428_Instagram.jpg"],
      flags:[], composition:"Caraco dentelle + short imprimé" },
    { id:"trousseau-ivoire", title:"Trousseau Satin", color:"Ivoire", price:210, type:"Parure",
      cats:["mariage","nuit"], sizes:["S","M","L"], colors:["Ivoire"],
      img:P+"Screenshot_20260713_032345_Instagram.jpg", img2:P+"Screenshot_20260713_032334_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032345_Instagram.jpg",P+"Screenshot_20260713_032334_Instagram.jpg"],
      flags:[], composition:"Peignoir satin + nuisette dentelle + culotte" },
    { id:"pyjama-rose", title:"Pyjama Satin", color:"Bois de Rose", price:139, type:"Pyjama",
      cats:["nuit"], sizes:["S","M","L","XL","2X"], colors:["Bois de rose"],
      img:P+"Screenshot_20260713_032513_Instagram.jpg", img2:P+"Screenshot_20260713_032513_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032513_Instagram.jpg"],
      flags:["best"], composition:"Chemise boutonnée + pantalon · satin · passepoil contrasté" },
    { id:"caraco-ecru", title:"Caraco Dentelle", color:"Écru", price:95, type:"Caraco",
      cats:["lingerie","sets"], sizes:["S","M","L"], colors:["Écru"],
      img:P+"Screenshot_20260713_032353_Instagram.jpg", img2:P+"Screenshot_20260713_032414_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032353_Instagram.jpg",P+"Screenshot_20260713_032414_Instagram.jpg"],
      flags:[], composition:"Caraco + culotte · dentelle festonnée" },
    { id:"cocooning-terracotta", title:"Ensemble Cocooning", color:"Terracotta", price:115, type:"Pyjama",
      cats:["demi-manche","nuit"], sizes:["S","M","L","XL"], colors:["Terracotta"],
      img:P+"Screenshot_20260713_032428_Instagram.jpg", img2:P+"FB_IMG_1783911626355.jpg",
      gallery:[P+"Screenshot_20260713_032428_Instagram.jpg",P+"FB_IMG_1783911626355.jpg"],
      flags:[], composition:"Caraco dentelle + short + pantalon imprimé" },
    { id:"nuisette-champagne", title:"Nuisette Satin", color:"Champagne", price:99, type:"Nuisette",
      cats:["nuit","mariage"], sizes:["S","M","L"], colors:["Champagne"],
      img:P+"Screenshot_20260713_032414_Instagram.jpg", img2:P+"Screenshot_20260713_032345_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032414_Instagram.jpg",P+"Screenshot_20260713_032345_Instagram.jpg"],
      flags:["new"], composition:"Satin & dentelle brodée" },
    { id:"peignoir-fleuri", title:"Peignoir Fleuri", color:"Rose Demi-Manche", price:135, type:"Peignoir",
      cats:["demi-manche"], sizes:["S","M","L","XL"], colors:["Rose fleuri"],
      img:M+"Screenshot_20260713_032144_Instagram.jpg", img2:M+"Screenshot_20260713_032131_Instagram.jpg",
      gallery:[M+"Screenshot_20260713_032144_Instagram.jpg",M+"Screenshot_20260713_032131_Instagram.jpg",M+"Screenshot_20260713_032150_Instagram.jpg"],
      flags:["new"], composition:"Peignoir à manches volantées · voile fleuri · caraco satin" },
    { id:"balconnet-ecru", title:"Balconnet Dentelle", color:"Écru", price:89, type:"Balconnet",
      cats:["lingerie"], sizes:["30","32","34","36","B","C","D","E"], colors:["Écru"],
      img:P+"Screenshot_20260713_032353_Instagram.jpg", img2:P+"Screenshot_20260713_032414_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032353_Instagram.jpg"],
      flags:[], composition:"Balconnet armé · dentelle festonnée · bretelles réglables" },
    { id:"body-champagne", title:"Body Dentelle", color:"Champagne", price:145, type:"Body",
      cats:["lingerie","sets"], sizes:["S","M","L","32","34","36","C","D"], colors:["Champagne"],
      img:P+"Screenshot_20260713_032414_Instagram.jpg", img2:P+"Screenshot_20260713_032353_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032414_Instagram.jpg"],
      flags:[], composition:"Body dentelle & satin · entrejambe pression" },
    { id:"porte-jarretelles", title:"Porte-jarretelles", color:"Dentelle", price:55, type:"Porte-jarretelles",
      cats:["lingerie"], sizes:["S","M","L"], colors:["Noir","Écru"],
      img:P+"Screenshot_20260713_032448_Instagram.jpg", img2:P+"Screenshot_20260713_032353_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032448_Instagram.jpg"],
      flags:[], composition:"Dentelle · jarretelles réglables" },
    { id:"tanga-dentelle", title:"Tanga Dentelle", color:"Rose & Noir", price:29, type:"Tanga",
      cats:["slips"], sizes:["XS","S","M","L","XL"], colors:["Rose","Noir"],
      img:P+"Screenshot_20260713_032448_Instagram.jpg", img2:P+"Screenshot_20260713_032448_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032448_Instagram.jpg"],
      flags:[], composition:"Dentelle florale · dos échancré" },
    { id:"nuisette-blanche", title:"Nuisette Mariée", color:"Blanc", price:160, type:"Nuisette",
      cats:["mariage","nuit"], sizes:["S","M","L"], colors:["Blanc"],
      img:P+"Screenshot_20260713_032334_Instagram.jpg", img2:P+"Screenshot_20260713_032345_Instagram.jpg",
      gallery:[P+"Screenshot_20260713_032334_Instagram.jpg",P+"Screenshot_20260713_032345_Instagram.jpg"],
      flags:["new"], composition:"Satin nacré · guipure · dos ouvert" },
    { id:"maillot-couvrant", title:"Maillot Couvrant", color:"Lavande", price:120, type:"Maillot",
      cats:["maillots","nouveautes"], sizes:["S","M","L","XL"], colors:["Lavande"],
      img:M+"FB_IMG_1783911600052.jpg", img2:M+"Screenshot_20260713_032217_Instagram.jpg",
      gallery:[M+"FB_IMG_1783911600052.jpg"],
      flags:[], composition:"Maillot couvrant · ceinture drapée" }
  ];

  var CAT_META = {
    nouveautes:  { title:"Nouveautés",     desc:"Les dernières pièces MIRACLE — cousues main à Monastir, prêtes à offrir." },
    lingerie:    { title:"Lingerie",       desc:"Caracos, balconnets et ensembles en satin, dentelle et broderie — la féminité pièce par pièce." },
    sets:        { title:"Ensembles",      desc:"Nos parures assorties : caraco, culotte et accessoires pensés pour aller ensemble." },
    mariage:     { title:"Parure Mariage", desc:"Pour le plus beau des « oui » — trousseaux, nuisettes et parures en blanc et ivoire." },
    "demi-manche":{ title:"Demi-Manche",   desc:"Robes fleuries, caracos et pyjamas à manches volantées, tout en douceur." },
    nuit:        { title:"Nuit & Satin",   desc:"Nuisettes, pyjamas et déshabillés en satin — le confort d'un soir de fête." },
    slips:       { title:"Slips & Culottes", desc:"Slips, tangas et culottes en dentelle, dans toutes les teintes de la saison." },
    maillots:    { title:"Maillots",       desc:"Maillots couvrants et élégants, pensés pour la lumière tunisienne." }
  };

  /* Mega-menu tree (mirrors the reference structure, adapted to MIRACLE) */
  var C = "collections.html?cat=", NAV = [
    { label:"Nouveautés", href:C+"nouveautes" },
    { label:"Lingerie", href:C+"lingerie", mega:[
      { head:"Explorer", links:[
        {t:"Nouveautés lingerie", h:C+"lingerie&sort=new"},{t:"Toute la lingerie", h:C+"lingerie"},
        {t:"Best-sellers", h:C+"lingerie&sort=best"},{t:"Promos", h:C+"lingerie"} ] },
      { head:"Caracos & Balconnets", img:P+"FB_IMG_1783911618872.jpg", links:[
        {t:"Caracos dentelle", h:C+"lingerie&type=Caraco"},{t:"Balconnets", h:C+"lingerie&type=Balconnet"},
        {t:"Bodys", h:C+"lingerie&type=Body"},{t:"Ensembles boudoir", h:C+"lingerie&type=Ensemble"} ] },
      { head:"Slips & Culottes", img:P+"Screenshot_20260713_032448_Instagram.jpg", links:[
        {t:"Slips dentelle", h:C+"slips&type=Slip"},{t:"Tangas", h:C+"slips&type=Tanga"},
        {t:"Culottes ouvertes", h:C+"slips"} ] },
      { head:"Accessoires", img:P+"Screenshot_20260713_032414_Instagram.jpg", links:[
        {t:"Porte-jarretelles", h:C+"lingerie&type=Porte-jarretelles"},{t:"Bodys", h:C+"lingerie&type=Body"},
        {t:"Bas & collants", h:C+"lingerie"} ] } ] },
    { label:"Parure Mariage", href:C+"mariage", mega:[
      { head:"Explorer", links:[
        {t:"Toutes les parures", h:C+"mariage"},{t:"Trousseaux", h:C+"mariage&type=Parure"},
        {t:"Nuisettes de mariée", h:C+"mariage&type=Nuisette"} ] },
      { head:"Blanc & Ivoire", img:P+"Screenshot_20260713_032334_Instagram.jpg", links:[
        {t:"Parures blanches", h:C+"mariage"},{t:"Trousseaux ivoire", h:C+"mariage"} ] },
      { head:"L'écrin cadeau", img:P+"Screenshot_20260713_032414_Instagram.jpg", links:[
        {t:"Idées cadeaux", h:C+"mariage"},{t:"Carte cadeau", h:"about.html#contact"} ] } ] },
    { label:"Demi-Manche", href:C+"demi-manche", mega:[
      { head:"Explorer", links:[
        {t:"Toute la collection", h:C+"demi-manche"},{t:"Pyjamas 3 pièces", h:C+"demi-manche&type=Pyjama"},
        {t:"Caracos & shorts", h:C+"demi-manche&type=Caraco"} ] },
      { head:"Robes fleuries", img:M+"Screenshot_20260713_032144_Instagram.jpg", links:[
        {t:"Peignoirs fleuris", h:C+"demi-manche&type=Peignoir"},{t:"Ensembles lounge", h:C+"demi-manche"} ] },
      { head:"Cocooning", img:P+"Screenshot_20260713_032435_Instagram.jpg", links:[
        {t:"Sauge & roses", h:C+"demi-manche"},{t:"Terracotta", h:C+"demi-manche"} ] } ] },
    { label:"Nuit & Satin", href:C+"nuit", mega:[
      { head:"Loungewear", links:[
        {t:"Toute la nuit", h:C+"nuit"},{t:"Pyjamas satin", h:C+"nuit&type=Pyjama"},
        {t:"Caracos soie", h:C+"nuit&type=Caraco"},{t:"Déshabillés", h:C+"nuit&type=Peignoir"} ] },
      { head:"Nuisettes & Robes", img:P+"Screenshot_20260713_032345_Instagram.jpg", links:[
        {t:"Nuisettes satin", h:C+"nuit&type=Nuisette"},{t:"Robes de nuit", h:C+"nuit"} ] },
      { head:"Best-sellers", img:P+"Screenshot_20260713_032513_Instagram.jpg", links:[
        {t:"Pyjama bois de rose", h:"product.html?id=pyjama-rose"},{t:"Voir tout", h:C+"nuit&sort=best"} ] } ] },
    { label:"Collections", href:"collections.html", mega:[
      { head:"Par saison", links:[
        {t:"Été 2026", h:C+"nouveautes"},{t:"Automne-Hiver", h:"collections.html"} ] },
      { head:"Par édition", links:[
        {t:"Mariée", h:C+"mariage"},{t:"Dentelle", h:C+"lingerie&type=Caraco"},{t:"Satin", h:C+"nuit"},
        {t:"Signature bordeaux", h:"product.html?id=caraco-bordeaux"},{t:"Éco-responsable", h:"collections.html"} ] },
      { head:"Essentiels MIRACLE", img:P+"Screenshot_20260713_032353_Instagram.jpg", links:[
        {t:"Caraco écru", h:"product.html?id=caraco-ecru"},{t:"Slip dentelle", h:"product.html?id=slip-dentelle"} ] } ] },
    { label:"Cadeaux", href:C+"mariage", mega:[
      { head:"Offrir", img:P+"Screenshot_20260713_032414_Instagram.jpg", links:[
        {t:"Idées cadeaux", h:C+"mariage"},{t:"L'écrin MIRACLE", h:"about.html#contact"},
        {t:"Carte cadeau", h:"about.html#contact"} ] },
      { head:"Best-sellers", img:P+"FB_IMG_1783911618872.jpg", links:[
        {t:"Caraco bordeaux", h:"product.html?id=caraco-bordeaux"},{t:"Ensemble boudoir", h:"product.html?id=boudoir-champagne"} ] } ] },
    { label:"Guides", href:"size-guide.html", mega:[
      { head:"Aide & conseils", links:[
        {t:"Guide des tailles", h:"size-guide.html"},{t:"Trouver sa taille", h:"size-guide.html#trouver"},
        {t:"Styles expliqués", h:"styles-explained.html"},{t:"Entretien satin & dentelle", h:"styles-explained.html#entretien"},
        {t:"Comment commander", h:"about.html#commander"} ] } ] },
    { label:"La Maison", href:"about.html", mega:[
      { head:"MIRACLE", links:[
        {t:"À propos", h:"about.html"},{t:"Avis clientes", h:"about.html#avis"},
        {t:"Le Journal", h:"journal.html"},{t:"Nous contacter", h:"about.html#contact"} ] } ] }
  ];

  /* ------------------------------------------------------------------ */
  /* 2. HELPERS                                                         */
  /* ------------------------------------------------------------------ */
  function money(n){ return n + " DT"; }
  function byId(id){ for(var i=0;i<PRODUCTS.length;i++) if(PRODUCTS[i].id===id) return PRODUCTS[i]; return null; }
  function qs(name){ return new URLSearchParams(location.search).get(name); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function el(html){ var d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstChild; }
  var ICON = {
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>',
    bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>',
    close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>',
    chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6 9 12 15 18 9"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>',
    ig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2m0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29"/></svg>',
    fb:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.9C15.7 4.9 14.8 4.8 13.8 4.8c-2.1 0-3.6 1.3-3.6 3.7V11H7.5v3H10.2v8H13Z"/></svg>',
    pin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3-2.3 3-5 0-2-1.4-3.6-3.9-3.6-2.9 0-4.6 2.1-4.6 4.5 0 .8.2 1.4.6 1.9.2.2.2.3.1.5l-.2.9c-.1.3-.3.4-.6.2-1.1-.5-1.7-1.9-1.7-3.6 0-2.9 2.2-5.6 6.4-5.6 3.4 0 5.9 2.4 5.9 5.4 0 3.4-1.9 5.9-4.6 5.9-.9 0-1.8-.5-2.1-1l-.6 2.2c-.2.8-.7 1.6-1.1 2.3A10 10 0 1 0 12 2Z"/></svg>',
    yt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12Zm-13 3V9l5 3-5 3Z"/></svg>',
    tk:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2 1.6 3.6 3.6 3.9v2.8c-1.3.1-2.6-.3-3.6-1v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.9c-.3-.1-.6-.2-.9-.2a2.7 2.7 0 1 0 2.7 2.7V3H16Z"/></svg>',
    ln:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM0 8h5v16H0V8Zm7.5 0H12v2.2h.1c.6-1.1 2.1-2.3 4.4-2.3 4.7 0 5.5 3 5.5 7V24h-5v-6.9c0-1.6 0-3.7-2.3-3.7s-2.6 1.8-2.6 3.6V24h-5V8Z"/></svg>'
  };
  function waLink(msg){ return "https://wa.me/"+WA_NUMBER+"?text="+encodeURIComponent(msg); }

  /* ------------------------------------------------------------------ */
  /* 3. CART (localStorage)                                             */
  /* ------------------------------------------------------------------ */
  var CART_KEY = "miracle_cart_v1", cart = load();
  function load(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e){ return []; } }
  function save(){ try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){} }
  function cartCount(){ return cart.reduce(function(n,i){ return n+i.qty; },0); }
  function cartTotal(){ return cart.reduce(function(n,i){ var p=byId(i.id); return n+(p?p.price*i.qty:0); },0); }
  function addToCart(id, size){
    var line = cart.filter(function(i){ return i.id===id && i.size===(size||""); })[0];
    if(line) line.qty++; else cart.push({ id:id, size:size||"", qty:1 });
    save(); syncCartUI(); openCart();
  }
  function setQty(idx, q){ if(q<=0) cart.splice(idx,1); else cart[idx].qty=q; save(); syncCartUI(); }

  function syncCartUI(){
    var n = cartCount();
    document.querySelectorAll("[data-cart-count]").forEach(function(b){
      b.textContent = n; b.classList.toggle("is-visible", n>0);
    });
    var body = document.getElementById("cart-body"), foot = document.getElementById("cart-foot");
    if(!body) return;
    if(!cart.length){
      body.innerHTML = '<p class="cart__empty">Votre panier est vide.</p>';
      if(foot) foot.hidden = true; return;
    }
    if(foot) foot.hidden = false;
    body.innerHTML = cart.map(function(i,idx){
      var p = byId(i.id); if(!p) return "";
      return '<div class="cart__item">'
        + '<a class="cart__thumb" href="product.html?id='+p.id+'"><img src="'+p.img+'" alt="'+esc(p.title)+'"></a>'
        + '<div class="cart__meta"><a class="cart__name" href="product.html?id='+p.id+'">'+esc(p.title)+'</a>'
        + '<p class="cart__sub">'+esc(p.color)+(i.size?' · Taille '+esc(i.size):'')+'</p>'
        + '<div class="cart__qty"><button data-dec="'+idx+'" aria-label="Retirer un">−</button><span>'+i.qty+'</span>'
        + '<button data-inc="'+idx+'" aria-label="Ajouter un">+</button>'
        + '<button class="cart__remove" data-rm="'+idx+'">Retirer</button></div></div>'
        + '<div class="cart__price">'+money(p.price*i.qty)+'</div></div>';
    }).join("");
    var tot = document.getElementById("cart-total"); if(tot) tot.textContent = money(cartTotal());
    var wa = document.getElementById("cart-wa");
    if(wa){
      var msg = "Bonjour MIRACLE 🌸, je souhaite commander :\n" + cart.map(function(i){
        var p=byId(i.id); return "• "+p.title+" ("+p.color+(i.size?", taille "+i.size:"")+") ×"+i.qty;
      }).join("\n") + "\nTotal indicatif : " + money(cartTotal());
      wa.href = waLink(msg);
    }
  }

  /* Drawer / overlay helpers ---------------------------------------- */
  function openEl(id){ var e=document.getElementById(id); if(e){ e.classList.add("is-open"); document.getElementById("scrim").classList.add("is-open"); document.body.style.overflow="hidden"; } }
  function closeAll(){
    ["cart-drawer","nav-drawer","search-panel"].forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.remove("is-open"); });
    var s=document.getElementById("scrim"); if(s) s.classList.remove("is-open");
    document.body.style.overflow="";
  }
  function openCart(){ openEl("cart-drawer"); }

  /* ------------------------------------------------------------------ */
  /* 4. CHROME — header (mega menus), search, cart, footer             */
  /* ------------------------------------------------------------------ */
  function megaHTML(item){
    if(!item.mega) return "";
    return '<div class="mega" role="menu">'+ '<div class="mega__inner">'+ item.mega.map(function(col){
      var links = col.links.map(function(l){ return '<a class="mega__link" href="'+l.h+'">'+esc(l.t)+'</a>'; }).join("");
      var img = col.img ? '<a class="mega__img" href="'+(col.links[0]?col.links[0].h:'#')+'" style="background-image:url('+col.img+')" aria-hidden="true"></a>' : '';
      return '<div class="mega__col">'+img+'<p class="mega__head">'+esc(col.head)+'</p>'+links+'</div>';
    }).join("") + '</div></div>';
  }

  function renderHeader(){
    var mount = document.getElementById("site-header"); if(!mount) return;
    var nav = NAV.map(function(item){
      return '<li class="nav__item'+(item.mega?' has-mega':'')+'">'
        + '<a class="nav__link" href="'+item.href+'">'+esc(item.label)+'</a>'
        + megaHTML(item) + '</li>';
    }).join("");
    mount.innerHTML =
      '<div class="announce"><div class="announce__track">'
      + '<p class="announce__item is-on">Livraison à domicile — partout en Tunisie</p>'
      + '<p class="announce__item">Fait main à Monastir · Satin, dentelle &amp; broderie</p>'
      + '<p class="announce__item">Commandez en DM ou au 92&nbsp;970&nbsp;596 · Écrin cadeau offert</p>'
      + '</div></div>'
      + '<header class="site-header"><div class="header-inner">'
      + '<div class="header-side">'
      + '<button class="icon-btn nav-toggle" id="nav-open" aria-label="Menu" aria-controls="nav-drawer" aria-expanded="false">'+ICON.menu+'</button>'
      + '<button class="icon-btn" id="search-open" aria-label="Rechercher">'+ICON.search+'</button>'
      + '</div>'
      + '<a class="brand" href="index.html" aria-label="MIRACLE — accueil"><img src="assets/logo.jpg" alt="MIRACLE — by Imen Yahia"></a>'
      + '<div class="header-side header-side--right">'
      + '<a class="icon-btn" href="'+IG+'" target="_blank" rel="noopener" aria-label="Instagram">'+ICON.user+'</a>'
      + '<button class="icon-btn cart-btn" id="cart-open" aria-label="Panier">'+ICON.bag+'<span class="cart-bubble" data-cart-count aria-hidden="true">0</span></button>'
      + '</div></div>'
      + '<nav class="main-nav" aria-label="Navigation principale"><ul class="nav">'+nav+'</ul></nav>'
      + '<div class="search-panel" id="search-panel"><div class="wrap search-panel__inner">'
      + '<form class="search-form" role="search"><span class="search-form__icon">'+ICON.search+'</span>'
      + '<input type="search" id="search-input" placeholder="Rechercher une pièce, une teinte…" aria-label="Rechercher">'
      + '<button type="button" class="icon-btn" id="search-close" aria-label="Fermer">'+ICON.close+'</button></form>'
      + '<div class="search-results" id="search-results"></div></div></div>'
      + '</header>';

    // interactions
    var header = mount.querySelector(".site-header");
    var onScroll = function(){ header.classList.toggle("is-stuck", window.scrollY>8); };
    onScroll(); window.addEventListener("scroll", onScroll, {passive:true});

    mount.querySelector("#cart-open").addEventListener("click", openCart);
    mount.querySelector("#nav-open").addEventListener("click", function(){ openEl("nav-drawer"); this.setAttribute("aria-expanded","true"); });
    // search
    var sp = mount.querySelector("#search-panel");
    mount.querySelector("#search-open").addEventListener("click", function(){ sp.classList.toggle("is-open"); if(sp.classList.contains("is-open")){ setTimeout(function(){ mount.querySelector("#search-input").focus(); },60); } });
    mount.querySelector("#search-close").addEventListener("click", function(){ sp.classList.remove("is-open"); });
    mount.querySelector("#search-input").addEventListener("input", function(){ runSearch(this.value); });

    // mega hover intent (desktop) — keyboard focus handled by :focus-within in CSS
    announceRotate(mount);
  }

  function announceRotate(scope){
    var items = scope.querySelectorAll(".announce__item");
    if(items.length<2 || reduce) return; var i=0;
    setInterval(function(){ items[i].classList.remove("is-on"); i=(i+1)%items.length; items[i].classList.add("is-on"); }, 4200);
  }

  function runSearch(q){
    var box = document.getElementById("search-results"); if(!box) return;
    q = (q||"").trim().toLowerCase();
    if(q.length<2){ box.innerHTML=""; return; }
    var hits = PRODUCTS.filter(function(p){
      return (p.title+" "+p.color+" "+p.type).toLowerCase().indexOf(q)>-1;
    }).slice(0,6);
    box.innerHTML = hits.length ? hits.map(function(p){
      return '<a class="search-hit" href="product.html?id='+p.id+'"><img src="'+p.img+'" alt=""><span><strong>'+esc(p.title)+'</strong><em>'+esc(p.color)+' · '+money(p.price)+'</em></span></a>';
    }).join("") : '<p class="search-empty">Aucun résultat pour « '+esc(q)+' ».</p>';
  }

  function renderChrome(){
    // scrim + drawers + cart, appended once to <body>
    if(document.getElementById("scrim")) return;
    var navLinks = NAV.map(function(it){
      var subs = it.mega ? it.mega.reduce(function(a,c){ return a.concat(c.links); },[]) : [];
      var sub = subs.length ? '<div class="ndrawer__sub">'+subs.map(function(l){ return '<a href="'+l.h+'">'+esc(l.t)+'</a>'; }).join("")+'</div>' : "";
      return '<div class="ndrawer__group"><a class="ndrawer__top" href="'+it.href+'">'+esc(it.label)+'</a>'+sub+'</div>';
    }).join("");

    var frag = ''
      + '<div class="scrim" id="scrim"></div>'
      // cart drawer
      + '<aside class="drawer drawer--right cart-drawer" id="cart-drawer" aria-label="Panier">'
      + '<div class="drawer__head"><h2 class="drawer__title">Panier</h2><button class="icon-btn" data-close aria-label="Fermer">'+ICON.close+'</button></div>'
      + '<div class="cart__body" id="cart-body"></div>'
      + '<div class="cart__foot" id="cart-foot" hidden>'
      + '<div class="cart__row"><span>Total indicatif</span><strong id="cart-total">0 DT</strong></div>'
      + '<p class="cart__note">Paiement à la livraison · écrin cadeau offert. La commande se confirme sur WhatsApp.</p>'
      + '<a class="btn btn--block" id="cart-wa" target="_blank" rel="noopener">Commander sur WhatsApp</a>'
      + '<button class="cart__continue" data-close>Continuer mes achats</button></div>'
      + '</aside>'
      // nav drawer (mobile)
      + '<aside class="drawer drawer--left ndrawer" id="nav-drawer" aria-label="Menu">'
      + '<div class="drawer__head"><img class="ndrawer__logo" src="assets/logo.jpg" alt="MIRACLE"><button class="icon-btn" data-close aria-label="Fermer">'+ICON.close+'</button></div>'
      + '<nav class="ndrawer__nav">'+navLinks+'</nav>'
      + '<div class="ndrawer__foot"><p>Monastir, Tunisie</p><p>Commande &amp; info : 92&nbsp;970&nbsp;596</p></div>'
      + '</aside>';
    document.body.insertAdjacentHTML("beforeend", frag);

    document.getElementById("scrim").addEventListener("click", closeAll);
    document.querySelectorAll("[data-close]").forEach(function(b){ b.addEventListener("click", closeAll); });
    document.addEventListener("keydown", function(e){ if(e.key==="Escape") closeAll(); });
    // cart qty delegation
    document.getElementById("cart-body").addEventListener("click", function(e){
      var t=e.target;
      if(t.dataset.inc!=null) setQty(+t.dataset.inc, cart[+t.dataset.inc].qty+1);
      else if(t.dataset.dec!=null) setQty(+t.dataset.dec, cart[+t.dataset.dec].qty-1);
      else if(t.dataset.rm!=null) setQty(+t.dataset.rm, 0);
    });
    // close nav-drawer on link click
    document.querySelector("#nav-drawer").addEventListener("click", function(e){ if(e.target.tagName==="A") closeAll(); });
  }

  function renderFooter(){
    var mount = document.getElementById("site-footer"); if(!mount) return;
    var pay = ["Visa","Mastercard","Amex","PayPal","Klarna","Apple Pay","Shop Pay","D17"];
    mount.innerHTML =
      '<div class="footer-sub"><div class="wrap">'
      + '<a href="'+IG+'" target="_blank" rel="noopener"><h4>Commander par DM</h4><p>Écrivez-nous sur Instagram</p></a>'
      + '<a href="about.html#commander"><h4>Livraison à domicile</h4><p>Partout en Tunisie · paiement à la livraison</p></a>'
      + '<a href="tel:+21692970596"><h4>Nous appeler</h4><p>92 970 596</p></a>'
      + '</div></div>'
      + '<footer class="site-footer2"><div class="wrap footer-grid">'
      + '<div class="footer-brand"><form class="newsletter" novalidate>'
      + '<p class="footer-h">Inspire-moi avec du contenu exclusif</p>'
      + '<div class="newsletter__row"><input type="email" id="nl-email" placeholder="Votre adresse e-mail" aria-label="E-mail" required>'
      + '<button type="submit" class="btn">S\'inscrire</button></div>'
      + '<p class="newsletter__msg" id="nl-msg" role="status"></p></form>'
      + '<div class="footer-socials">'
      + '<a href="'+IG+'" target="_blank" rel="noopener" aria-label="Instagram">'+ICON.ig+'</a>'
      + '<a href="'+waLink("Bonjour MIRACLE 🌸")+'" target="_blank" rel="noopener" aria-label="WhatsApp">'+ICON.wa+'</a>'
      + '<a href="'+IG+'" target="_blank" rel="noopener" aria-label="Facebook">'+ICON.fb+'</a>'
      + '<a href="'+IG+'" target="_blank" rel="noopener" aria-label="Pinterest">'+ICON.pin+'</a>'
      + '<a href="'+IG+'" target="_blank" rel="noopener" aria-label="TikTok">'+ICON.tk+'</a>'
      + '</div></div>'
      + '<div class="footer-col"><h5>La Maison</h5><ul>'
      + '<li><a href="collections.html?cat=nouveautes">Nouveautés</a></li>'
      + '<li><a href="collections.html?cat=lingerie">Lingerie</a></li>'
      + '<li><a href="collections.html?cat=mariage">Parure Mariage</a></li>'
      + '<li><a href="collections.html?cat=nuit">Nuit &amp; Satin</a></li>'
      + '<li><a href="about.html">Notre histoire</a></li>'
      + '<li><a href="journal.html">Le Journal</a></li></ul></div>'
      + '<div class="footer-col"><h5>Service clientèle</h5><ul>'
      + '<li><a href="about.html#commander">Comment commander</a></li>'
      + '<li><a href="about.html#commander">Livraison &amp; paiement</a></li>'
      + '<li><a href="size-guide.html">Guide des tailles</a></li>'
      + '<li><a href="styles-explained.html#entretien">Entretien &amp; retours</a></li>'
      + '<li><a href="about.html#contact">Nous contacter</a></li>'
      + '<li><a href="about.html#contact">Confidentialité</a></li></ul></div>'
      + '</div>'
      + '<div class="footer-pay"><div class="wrap"><ul>'+pay.map(function(p){ return '<li>'+esc(p)+'</li>'; }).join("")+'</ul></div></div>'
      + '<div class="footer-bottom"><div class="wrap"><p>© <span id="year"></span> MIRACLE — by Imen Yahia · Monastir, Tunisie</p>'
      + '<span class="footer-badge">Paiement à la livraison</span></div></div>'
      + '</footer>';
    var y=document.getElementById("year"); if(y) y.textContent = new Date().getFullYear();
    var nl = mount.querySelector(".newsletter");
    nl.addEventListener("submit", function(e){
      e.preventDefault();
      var email = mount.querySelector("#nl-email").value.trim(), msg = mount.querySelector("#nl-msg");
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg.textContent="Merci d'entrer une adresse e-mail valide."; msg.className="newsletter__msg is-err"; return; }
      msg.textContent="Merci ! Vous êtes bien inscrite 🌸"; msg.className="newsletter__msg is-ok"; nl.reset();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. PRODUCT CARD                                                    */
  /* ------------------------------------------------------------------ */
  function cardHTML(p){
    var badge = p.flags.indexOf("new")>-1 ? '<span class="pc-badge">Nouveau</span>'
              : p.flags.indexOf("best")>-1 ? '<span class="pc-badge">Best-seller</span>' : '';
    return '<article class="pcard" data-id="'+p.id+'">'
      + '<a class="pcard__media" href="product.html?id='+p.id+'">'+badge
      + '<img class="pcard__img pcard__img--front" src="'+p.img+'" alt="'+esc(p.title+' '+p.color)+'" loading="lazy">'
      + '<img class="pcard__img pcard__img--back" src="'+p.img2+'" alt="" aria-hidden="true" loading="lazy">'
      + '<button class="pcard__add" data-add="'+p.id+'">Ajouter au panier</button></a>'
      + '<div class="pcard__body"><a class="pcard__title" href="product.html?id='+p.id+'">'+esc(p.title)+'</a>'
      + '<p class="pcard__color">'+esc(p.color)+'</p><p class="pcard__price">'+money(p.price)+'</p></div>'
      + '</article>';
  }
  document.addEventListener("click", function(e){
    var add = e.target.closest ? e.target.closest("[data-add]") : null;
    if(add){ e.preventDefault(); addToCart(add.getAttribute("data-add"), ""); }
  });

  /* ------------------------------------------------------------------ */
  /* 6. PLP — collection + filters                                      */
  /* ------------------------------------------------------------------ */
  var ALPHA=["XS","S","M","L","XL","2X"], BANDS=["30","32","34","36","38"], CUPS=["A","B","C","D","E","F","G"];
  function initPLP(){
    var root = document.getElementById("plp"); if(!root) return;
    var cat = qs("cat") || "nouveautes";
    var meta = CAT_META[cat] || { title:"Collection", desc:"" };
    var base = PRODUCTS.filter(function(p){ return cat==="nouveautes" ? (p.cats.indexOf("nouveautes")>-1 || p.flags.indexOf("new")>-1) : p.cats.indexOf(cat)>-1; });
    if(!base.length) base = PRODUCTS.slice();

    var state = { sizes:[], types:[], pmax: Math.max.apply(null, base.map(function(p){return p.price;})), sort: qs("sort")||"new" };
    var pmin = Math.min.apply(null, base.map(function(p){return p.price;}));
    var pcap = Math.max.apply(null, base.map(function(p){return p.price;}));
    // preselect type from URL
    var t = qs("type"); if(t) state.types=[t];

    document.title = meta.title + " — MIRACLE";
    root.innerHTML =
      '<div class="page-hero"><div class="wrap"><nav class="crumbs"><a href="index.html">Accueil</a> / <span>'+esc(meta.title)+'</span></nav>'
      + '<h1 class="page-hero__title">'+esc(meta.title)+'</h1>'
      + '<p class="page-hero__desc" id="col-desc">'+esc(meta.desc)+'</p></div></div>'
      + '<div class="wrap plp"><aside class="filters" id="filters"></aside>'
      + '<div class="plp__main"><div class="plp__bar"><button class="filters-toggle" id="filters-toggle">Filtrer</button>'
      + '<span class="plp__count" id="plp-count"></span>'
      + '<label class="plp__sort"><span>Trier</span><select id="plp-sort">'
      + '<option value="new">Nouveautés</option><option value="price-asc">Prix croissant</option>'
      + '<option value="price-desc">Prix décroissant</option><option value="best">Best-sellers</option></select></label></div>'
      + '<div class="product-grid product-grid--plp" id="plp-grid"></div></div></div>';

    var typesAvail = uniq(base.map(function(p){return p.type;}));
    var sizesAvail = uniq(base.reduce(function(a,p){return a.concat(p.sizes);},[]));

    function count(pred){ return base.filter(pred).length; }
    function facetRows(tokens, key){
      return tokens.map(function(tok){
        var c = key==="type" ? count(function(p){return p.type===tok;}) : count(function(p){return p.sizes.indexOf(tok)>-1;});
        if(!c) return "";
        var checked = (key==="type"?state.types:state.sizes).indexOf(tok)>-1 ? " checked" : "";
        return '<label class="facet"><input type="checkbox" data-facet="'+key+'" value="'+esc(tok)+'"'+checked+'><span>'+esc(tok)+'</span><em>'+c+'</em></label>';
      }).join("");
    }
    function renderFilters(){
      var f = document.getElementById("filters");
      var hasBand = BANDS.some(function(b){return sizesAvail.indexOf(b)>-1;});
      var hasCup  = CUPS.some(function(b){return sizesAvail.indexOf(b)>-1;});
      var sizeInner = '<p class="facet-grp">Tailles</p><div class="facet-wrap">'+facetRows(ALPHA,"size")+'</div>'
        + (hasBand ? '<p class="facet-grp">Tour de dos</p><div class="facet-wrap">'+facetRows(BANDS,"size")+'</div>' : '')
        + (hasCup ? '<p class="facet-grp">Bonnet</p><div class="facet-wrap">'+facetRows(CUPS,"size")+'</div>' : '');
      f.innerHTML =
        '<div class="filters__head"><h2>Filtrer</h2><button class="filters__clear" id="filters-clear">Effacer</button></div>'
        + acc("Taille", sizeInner, true)
        + acc("Type de produit", '<div class="facet-list">'+facetRows(typesAvail,"type")+'</div>', true)
        + acc("Prix", '<div class="price-filter"><div class="price-filter__vals"><span>'+money(pmin)+'</span><span id="price-out">'+money(state.pmax)+'</span></div>'
            + '<input type="range" id="price-range" min="'+pmin+'" max="'+pcap+'" value="'+state.pmax+'" step="1"></div>', true);

      f.querySelectorAll('[data-facet]').forEach(function(cb){
        cb.addEventListener("change", function(){
          var key = this.getAttribute("data-facet")==="type"?"types":"sizes", v=this.value;
          var arr = state[key], i=arr.indexOf(v);
          if(this.checked && i<0) arr.push(v); else if(!this.checked && i>-1) arr.splice(i,1);
          apply();
        });
      });
      var pr = f.querySelector("#price-range");
      if(pr) pr.addEventListener("input", function(){ state.pmax=+this.value; f.querySelector("#price-out").textContent=money(state.pmax); apply(); });
      f.querySelector("#filters-clear").addEventListener("click", function(){ state.sizes=[]; state.types=[]; state.pmax=pcap; renderFilters(); apply(); });
      // accordion toggles
      f.querySelectorAll(".acc__btn").forEach(function(b){ b.addEventListener("click", function(){ this.parentNode.classList.toggle("is-open"); this.setAttribute("aria-expanded", this.parentNode.classList.contains("is-open")); }); });
    }

    function apply(){
      var list = base.filter(function(p){
        if(state.types.length && state.types.indexOf(p.type)<0) return false;
        if(state.sizes.length && !state.sizes.some(function(s){ return p.sizes.indexOf(s)>-1; })) return false;
        if(p.price>state.pmax) return false;
        return true;
      });
      var s = document.getElementById("plp-sort").value;
      list.sort(function(a,b){
        if(s==="price-asc") return a.price-b.price;
        if(s==="price-desc") return b.price-a.price;
        if(s==="best") return (b.flags.indexOf("best")>-1)-(a.flags.indexOf("best")>-1);
        return (b.flags.indexOf("new")>-1)-(a.flags.indexOf("new")>-1);
      });
      var grid = document.getElementById("plp-grid");
      grid.innerHTML = list.length ? list.map(cardHTML).join("") : '<p class="plp__none">Aucune pièce ne correspond à ces filtres.</p>';
      document.getElementById("plp-count").textContent = list.length + (list.length>1?" pièces":" pièce");
    }

    renderFilters();
    document.getElementById("plp-sort").value = state.sort==="price-asc"||state.sort==="price-desc"||state.sort==="best" ? state.sort : "new";
    document.getElementById("plp-sort").addEventListener("change", apply);
    document.getElementById("filters-toggle").addEventListener("click", function(){ document.getElementById("filters").classList.toggle("is-open"); });
    // read more
    var desc=document.getElementById("col-desc");
    apply();
  }
  function uniq(a){ var o=[],r=[]; a.forEach(function(x){ if(x && !o[x]){o[x]=1;r.push(x);} }); return r; }
  function acc(title, inner, open){
    return '<div class="acc'+(open?' is-open':'')+'"><button class="acc__btn" aria-expanded="'+(open?'true':'false')+'">'+esc(title)+'<span class="acc__ic">'+ICON.chev+'</span></button><div class="acc__panel">'+inner+'</div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* 7. PDP                                                             */
  /* ------------------------------------------------------------------ */
  function initPDP(){
    var root = document.getElementById("pdp"); if(!root) return;
    var p = byId(qs("id")) || PRODUCTS[0];
    document.title = p.title+" "+p.color+" — MIRACLE";
    var gallery = p.gallery && p.gallery.length ? p.gallery : [p.img];
    var sizes = p.sizes.map(function(s){ return '<button class="size-opt" data-size="'+esc(s)+'">'+esc(s)+'</button>'; }).join("");
    var related = PRODUCTS.filter(function(x){ return x.id!==p.id && x.cats.some(function(c){return p.cats.indexOf(c)>-1;}); }).slice(0,4);
    root.innerHTML =
      '<div class="wrap"><nav class="crumbs"><a href="index.html">Accueil</a> / <a href="collections.html?cat='+p.cats[0]+'">'+esc((CAT_META[p.cats[0]]||{title:"Collection"}).title)+'</a> / <span>'+esc(p.title)+'</span></nav></div>'
      + '<div class="wrap pdp">'
      + '<div class="pdp__gallery">'+gallery.map(function(g,i){ return '<div class="pdp__shot'+(i===0?" is-main":"")+'"><img src="'+g+'" alt="'+esc(p.title)+' — vue '+(i+1)+'"></div>'; }).join("")+'</div>'
      + '<div class="pdp__info"><p class="pdp__eyebrow">MIRACLE</p><h1 class="pdp__title">'+esc(p.title)+'</h1>'
      + '<p class="pdp__price">'+money(p.price)+'</p><p class="pdp__color">Coloris : '+esc(p.color)+'</p>'
      + '<div class="pdp__sizes"><p class="pdp__label">Taille</p><div class="size-row">'+sizes+'</div><p class="size-hint" id="size-hint"></p></div>'
      + '<button class="btn btn--block pdp__add" id="pdp-add">Ajouter au panier</button>'
      + '<a class="pdp__wa" href="'+waLink("Bonjour MIRACLE 🌸, je suis intéressée par : "+p.title+" ("+p.color+")")+'" target="_blank" rel="noopener">Une question ? Écrivez-nous sur WhatsApp</a>'
      + '<div class="pdp__acc">'
      + accItem("Détails & composition", '<p>'+esc(p.composition||"")+'</p><ul><li>Fait main à Monastir</li><li>Coloris : '+esc(p.color)+'</li></ul>', true)
      + accItem("Livraison & paiement", '<p>Livraison à domicile partout en Tunisie sous 2 à 4 jours. Paiement à la livraison. Écrin cadeau offert.</p>')
      + accItem("Entretien", '<p>Lavage à la main à l\'eau froide, séchage à plat à l\'ombre. Éviter l\'essorage et le repassage direct sur la dentelle.</p>')
      + '</div></div></div>'
      + (related.length ? '<div class="wrap section"><div class="section-head"><span class="eyebrow">À compléter</span><h2 class="section-title">Vous aimerez aussi</h2></div><div class="product-grid">'+related.map(cardHTML).join("")+'</div></div>' : '');

    // gallery thumbs -> main (simple: click a shot scrolls; on desktop grid all shown)
    var chosen="";
    root.querySelectorAll(".size-opt").forEach(function(b){ b.addEventListener("click", function(){
      root.querySelectorAll(".size-opt").forEach(function(x){x.classList.remove("is-sel");});
      this.classList.add("is-sel"); chosen=this.getAttribute("data-size");
      root.querySelector("#size-hint").textContent="Taille "+chosen+" sélectionnée.";
    }); });
    root.querySelector("#pdp-add").addEventListener("click", function(){
      if(!chosen && p.sizes.length){ root.querySelector("#size-hint").textContent="Merci de choisir une taille."; root.querySelector("#size-hint").classList.add("is-err"); return; }
      addToCart(p.id, chosen);
    });
    root.querySelectorAll(".acc__btn").forEach(function(b){ b.addEventListener("click", function(){ this.parentNode.classList.toggle("is-open"); this.setAttribute("aria-expanded", this.parentNode.classList.contains("is-open")); }); });
  }
  function accItem(title, inner, open){
    return '<div class="acc'+(open?' is-open':'')+'"><button class="acc__btn" aria-expanded="'+(open?'true':'false')+'">'+esc(title)+'<span class="acc__ic">'+ICON.chev+'</span></button><div class="acc__panel">'+inner+'</div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* 8. HOME — bestsellers carousel + journal grid injection            */
  /* ------------------------------------------------------------------ */
  function initHomeCarousel(){
    var track = document.getElementById("best-track"); if(!track) return;
    var best = PRODUCTS.filter(function(p){ return p.flags.indexOf("best")>-1; });
    if(best.length<8) best = best.concat(PRODUCTS.filter(function(p){return best.indexOf(p)<0;})).slice(0,8);
    track.innerHTML = best.map(cardHTML).join("");
    var prev=document.getElementById("best-prev"), next=document.getElementById("best-next");
    function step(dir){ var w=track.querySelector(".pcard"); var d=w?w.getBoundingClientRect().width+18:280; track.scrollBy({left:dir*d*2, behavior: reduce?"auto":"smooth"}); }
    if(prev) prev.addEventListener("click", function(){ step(-1); });
    if(next) next.addEventListener("click", function(){ step(1); });
  }

  /* Generic accordions + reveals + testimonials (used across pages) --- */
  function initAccordions(scope){
    (scope||document).querySelectorAll(".acc__btn").forEach(function(b){
      if(b.dataset.bound) return; b.dataset.bound="1";
      b.addEventListener("click", function(){ this.parentNode.classList.toggle("is-open"); this.setAttribute("aria-expanded", this.parentNode.classList.contains("is-open")); });
    });
  }
  function initReveal(){
    var els=document.querySelectorAll(".reveal");
    if(reduce || !("IntersectionObserver" in window)){ els.forEach(function(e){e.classList.add("is-visible");}); return; }
    var io=new IntersectionObserver(function(en){ en.forEach(function(x){ if(x.isIntersecting){ x.target.classList.add("is-visible"); io.unobserve(x.target); } }); }, {threshold:.12, rootMargin:"0px 0px -8% 0px"});
    els.forEach(function(e){ io.observe(e); });
  }
  function initTesti(){
    var slides=[].slice.call(document.querySelectorAll(".testi__slide")), dots=document.querySelector(".testi__dots");
    if(slides.length<2||!dots||reduce) return; var idx=0,timer;
    slides.forEach(function(_,i){ var b=document.createElement("button"); b.type="button"; b.setAttribute("aria-label","Avis "+(i+1)); if(i===0)b.classList.add("is-on"); b.addEventListener("click",function(){go(i);restart();}); dots.appendChild(b); });
    var bs=[].slice.call(dots.children);
    function go(n){ slides[idx].classList.remove("is-on"); bs[idx].classList.remove("is-on"); idx=n; slides[idx].classList.add("is-on"); bs[idx].classList.add("is-on"); }
    function nx(){ go((idx+1)%slides.length); }
    function start(){ timer=setInterval(nx,6000); } function restart(){ clearInterval(timer); start(); }
    var box=document.querySelector(".testi"); box.addEventListener("mouseenter",function(){clearInterval(timer);}); box.addEventListener("mouseleave",restart); start();
    var pa=document.querySelector(".testi__prev"), na=document.querySelector(".testi__next");
    if(pa)pa.addEventListener("click",function(){go((idx-1+slides.length)%slides.length);restart();});
    if(na)na.addEventListener("click",function(){go((idx+1)%slides.length);restart();});
  }

  /* ------------------------------------------------------------------ */
  /* 9. BOOT                                                            */
  /* ------------------------------------------------------------------ */
  function boot(){
    renderHeader();
    renderChrome();
    renderFooter();
    syncCartUI();
    initPLP();
    initPDP();
    initHomeCarousel();
    initAccordions();
    initTesti();
    initReveal();
    // build any inline WhatsApp CTAs (home promos, buttons)
    document.querySelectorAll("[data-wa]").forEach(function(a){ a.setAttribute("href", waLink(a.getAttribute("data-wa"))); });
    // expose a tiny API for inline page needs
    window.MIRACLE = { addToCart:addToCart, products:PRODUCTS, card:cardHTML, openCart:openCart, waLink:waLink };
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
