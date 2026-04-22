/* ═══════════════════════════════════════════
   SCRIPT.JS — Forno à Lenha Pizzaria
   Cardápio Digital
═══════════════════════════════════════════ */
 
/* ─── CONFIGURAÇÃO ─── */
var WPP_NUMBER = '5582991201916';
var PIX_KEY    = '59.130.875/0001-50';
var ESFIHA_MIN = 5;
 
var CUPOM_SALT = 'fornoalenha2024';

/* ─── GOOGLE SHEETS — Integração central ─── */
var SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyU4h8uPleSTjLa4a4Jwz39d5EKHV1uqwWvP9DKo7cbM6L4DNXotDC1WX-44Ar740b9zA/exec';

/**
 * registrarPedidoNaSheets — salva o pedido na planilha Google Sheets.
 * Fire-and-forget: não bloqueia nem depende do resultado para abrir o WhatsApp.
 */
function registrarPedidoNaSheets(total) {
  try {
    var sub   = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var desc  = calcDesconto(sub);
    var totalFinal = total || Math.max(0, sub - desc);

    var payload = {
      action:    'novo_pedido',
      customer:  ds.nome  || '',
      telefone:  ds.tel   || '',
      endereco:  ds.modo === 'delivery'
        ? (ds.rua || '') + ', ' + (ds.num || '') + ' — ' + (ds.bairro || '')
        : 'Retirada no balcão',
      pagamento: ds.pag   || 'dinheiro',
      notes:     ds.obs   || '',
      total:     totalFinal,
      items: cart.map(function (i) {
        return { name: i.name, price: i.price, qty: i.qty };
      })
    };

    // mode: 'no-cors' — fire-and-forget. Bypassa o problema do redirect 302 do Apps Script.
    // O pedido chega na planilha mesmo sem ler a resposta.
    fetch(SHEETS_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
      mode:    'no-cors'
    }).then(function () {
      console.log('[Sheets] ✅ Pedido enviado para a planilha.');
    }).catch(function (err) {
      console.warn('[Sheets] ⚠️ Falha ao registrar pedido (não afeta o WhatsApp):', err.message);
    });

  } catch (err) {
    console.warn('[Sheets] Erro inesperado:', err.message);
  }
}

/**
 * sincronizarPrecosDaSheets — ao carregar, atualiza os preços exibidos nos cards
 * com os valores da aba Cardapio na planilha. Atualiza data-price e o texto .price.
 * Se a Sheets estiver indisponível, os preços hardcoded do HTML permanecem.
 */
function sincronizarPrecosDaSheets() {
  fetch(SHEETS_API_URL + '?action=menu', { redirect: 'follow', mode: 'cors' })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.ok || !data.data) return;

      var todos = [];
      Object.keys(data.data).forEach(function (cat) {
        data.data[cat].forEach(function (item) { todos.push(item); });
      });

      todos.forEach(function (item) {
        // Atualiza todos os botões .btn-add que têm data-name igual ao nome na planilha
        document.querySelectorAll('.btn-add[data-name]').forEach(function (btn) {
          if (btn.dataset.name === item.nome && item.preco) {
            var novoPreco = Number(item.preco);
            btn.dataset.price = novoPreco.toFixed(2);
            // Atualiza o texto de preço no card pai
            var card = btn.closest('.card');
            if (card) {
              var priceEl = card.querySelector('.price');
              if (priceEl) priceEl.textContent = 'R$ ' + novoPreco.toFixed(2).replace('.', ',');
            }
            // Marca como indisponível se necessário
            if (item.disponivel === false || item.disponivel === 'nao') {
              btn.disabled = true;
              btn.textContent = 'Esgotado';
              btn.style.opacity = '0.5';
            }
          }
        });
      });

      console.log('[Sheets] ✅ Preços sincronizados com a planilha.');
    })
    .catch(function (err) {
      console.warn('[Sheets] Preços não sincronizados — usando valores do HTML:', err.message);
    });
}
 
var CUPOM_CFG = {
  ativo: true,
  hash: '14f873d9c39fba700d908f56d938304bc390ff35ec181efeddb74d6f3540c85b',
  desconto: 0.10,
  tipo: 'percentual'
};

var PRECO_PIZZA = {
  Tradicional: { Brotinho: 20.90, 'Média': 37.90, Grande: 47.90 },
  Especial:    { Brotinho: 30.90, 'Média': 49.90, Grande: 59.90 },
  Doce:        { Brotinho: 25.90, 'Média': 39.90, Grande: 49.90 }
};
var PRECO_BORDA = { Brotinho: 0, 'Média': 12.90, Grande: 15.90 };
 
var SABORES = {
  Tradicional: [
    { name: 'Mussarela',  img: '/assets/imgs/pizzas/mussarela.webp'  },
    { name: 'Mista',      img: '/assets/imgs/pizzas/mista.webp'      },
    { name: 'Calabresa',  img: '/assets/imgs/pizzas/calabresa.webp'  },
    { name: 'Milho',      img: '/assets/imgs/pizzas/milho.webp'      },
    { name: 'Frango',     img: '/assets/imgs/pizzas/frango.webp'     },
    { name: 'Marguerita', img: '/assets/imgs/pizzas/marguerita.webp' },
    { name: 'Baiana',     img: '/assets/imgs/pizzas/baiana.webp'     },
    { name: 'Napolitana', img: '/assets/imgs/pizzas/napolitana.webp' }
  ],
  Especial: [
    { name: 'Frango com Catupiry', img: '/assets/imgs/pizzas/frangocatupiry.webp' },
    { name: 'Caram\u00e3o',             img: '/assets/imgs/pizzas/camarao.webp'        },
    { name: 'Portuguesa',          img: '/assets/imgs/pizzas/portuguesa.webp'      },
    { name: 'Lombo Canadense',     img: '/assets/imgs/pizzas/lombocanadense.webp'  },
    { name: 'Quatro Queijos',      img: '/assets/imgs/pizzas/quatroqueijos.webp'   },
    { name: 'Bacon',               img: '/assets/imgs/pizzas/bacon.webp'           },
    { name: 'Atum',                img: '/assets/imgs/pizzas/atum.webp'            },
    { name: 'Catupirela',          img: '/assets/imgs/pizzas/catupirela.webp'      }
  ],
  Doce: [
    { name: 'M&M',             img: '/assets/imgs/pizzas/m&m.webp'           },
    { name: 'Banana',          img: '/assets/imgs/pizzas/banana.webp'         },
    { name: 'Romeu e Julieta', img: '/assets/imgs/pizzas/romeuejulieta.webp'  }
  ]
};
 
var BORDAS = [
  { name: 'Nenhuma',      img: '/assets/imgs/bordas/nenhuma.png'       },
  { name: 'Mussarela',    img: '/assets/imgs/bordas/mussarela.webp'    },
  { name: 'Catupiry',     img: '/assets/imgs/bordas/catupiry.webp'     },
  { name: 'Creme Cheese', img: '/assets/imgs/bordas/cremecheese.webp'  },
  { name: 'Chocolate',    img: '/assets/imgs/bordas/chocolate.webp'    }
];
 
/* ─── ESTADO ─── */
var cart = [];
try {
  var _raw = JSON.parse(localStorage.getItem('cart_forno') || '[]');
  // SEGURANÇA: valida cada item antes de aceitar dados do localStorage
  if (Array.isArray(_raw)) {
    cart = _raw.filter(validateCartItem).map(function (i) {
      return {
        name:  String(i.name).trim(),
        price: Number(i.price),
        qty:   Math.max(1, Math.min(99, Math.floor(Number(i.qty)))),
        meta:  (i.meta && typeof i.meta === 'object') ? i.meta : {}
      };
    });
  }
} catch (e) { cart = []; }
 
var cupom = { ok: false, code: '' };
 
/* ─── hashSHA256 — usa SubtleCrypto (nativa, zero lib externa) ─── */
function hashSHA256(str) {
  /* SubtleCrypto é async — retorna Promise<string hex> */
  var encoder = new TextEncoder();
  var data = encoder.encode(str);
  return window.crypto.subtle.digest('SHA-256', data).then(function (buf) {
    return Array.prototype.map.call(
      new Uint8Array(buf),
      function (b) { return ('00' + b.toString(16)).slice(-2); }
    ).join('');
  });
}
 
var ds = {
  modo: 'retirada', nome: '', tel: '', rua: '', num: '',
  comp: '', cep: '', ref: '', bairro: '', pag: 'dinheiro', obs: ''
};
 
/* ─── HELPERS ─── */
function $id(id) { return document.getElementById(id); }
function brl(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }
function saveCart() {
  try { localStorage.setItem('cart_forno', JSON.stringify(cart)); } catch (e) {}
}
function ga(ev, params) {
  if (typeof gtag !== 'undefined') gtag('event', ev, params || {});
}
 
/**
 * escapeHTML — SEGURANÇA: sanitiza qualquer string antes de
 * inserir em innerHTML para prevenir XSS.
 * Converte os 5 caracteres especiais HTML em entidades.
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}
 
/**
 * validateCartItem — SEGURANÇA: valida estrutura de cada item
 * carregado do localStorage antes de usar. Previne que dados
 * corrompidos/injetados causem erros ou XSS.
 */
function validateCartItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.name !== 'string' || item.name.trim() === '') return false;
  if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0 || item.price > 99999) return false;
  if (typeof item.qty !== 'number' || isNaN(item.qty) || item.qty < 1 || item.qty > 99 || !Number.isInteger(item.qty)) return false;
  // meta é opcional mas deve ser objeto se presente
  if (item.meta !== undefined && (typeof item.meta !== 'object' || item.meta === null)) return false;
  // Limita tamanho do nome para evitar armazenamento de payloads grandes
  if (item.name.length > 200) return false;
  return true;
}
 
function calcDesconto(sub) {
  if (!cupom.ok) return 0;
  return CUPOM_CFG.tipo === 'percentual'
    ? Math.round(sub * CUPOM_CFG.desconto * 100) / 100
    : Math.min(CUPOM_CFG.desconto, sub);
}
 
/* ─── TOAST ─── */
function showToast(msg) {
  var container = $id('toast-container');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
 
  setTimeout(function () {
    t.classList.add('out');
    function onEnd() {
      t.removeEventListener('animationend', onEnd);
      t.removeEventListener('webkitAnimationEnd', onEnd);
      if (t.parentNode) t.parentNode.removeChild(t);
    }
    t.addEventListener('animationend', onEnd);
    t.addEventListener('webkitAnimationEnd', onEnd);
  }, 2200);
}
 
/* ─── SPLASH ─── */
window.addEventListener('load', function () {
  setTimeout(function () {
    var splash = $id('splash');
    if (splash) splash.classList.add('out');
  }, 1800);
});
 
/* ─── LOGO → SCROLL PARA FOOTER ─── */
document.addEventListener('DOMContentLoaded', function () {
  var brand = document.querySelector('.brand');
  if (brand) {
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      var footer = document.querySelector('.site-footer');
      if (!footer) return;
      var headerOffset = 20;
      var pos = footer.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: pos, behavior: 'smooth' });
    });
  }
});
 
/* ─── TOPBAR SCROLL + NAV ATIVO ─── */
window.addEventListener('scroll', function () {
  var header = $id('site-header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 10);
 
  var sections = ['pizzas', 'sushi', 'esfiha', 'bebidas'];
  var cur = sections[0];
  sections.forEach(function (id) {
    var el = $id(id);
    if (el && el.getBoundingClientRect().top <= 90) cur = id;
  });
  document.querySelectorAll('.nav-link').forEach(function (l) {
    l.classList.toggle('active', l.dataset.target === cur);
  });
}, { passive: true });
 
document.querySelectorAll('.main-nav .nav-link').forEach(function (l) {
  l.addEventListener('click', function () {
    document.querySelectorAll('.main-nav .nav-link').forEach(function (x) { x.classList.remove('active'); });
    l.classList.add('active');
  });
});
 
/* ─── CARROSSÉIS ─── */
document.querySelectorAll('.track-wrap').forEach(function (wrap) {
  var track = wrap.querySelector('.cards');
  var bl = wrap.querySelector('.sbtn.sl');
  var br = wrap.querySelector('.sbtn.sr');
  if (!track) return;
  var STEP = 235;
 
  function upd() {
    var atStart = track.scrollLeft <= 3;
    var atEnd   = track.scrollLeft + track.clientWidth >= track.scrollWidth - 3;
    if (bl) { atStart ? bl.classList.add('gone') : bl.classList.remove('gone'); }
    if (br) { atEnd   ? br.classList.add('gone') : br.classList.remove('gone'); }
  }
 
  if (bl) bl.addEventListener('click', function () { track.scrollBy({ left: -STEP, behavior: 'smooth' }); });
  if (br) br.addEventListener('click', function () { track.scrollBy({ left: STEP,  behavior: 'smooth' }); });
  track.addEventListener('scroll', upd, { passive: true });
  setTimeout(upd, 250);
});
 
/* ─── CARRINHO — OPEN / CLOSE ─── */
function openCart() {
  var cartEl = $id('cart');
  var ov     = $id('cart-overlay');
  if (cartEl) cartEl.classList.add('open');
  if (ov)     ov.classList.add('on');
  document.body.classList.add('lock');
}
function closeCart() {
  var cartEl = $id('cart');
  var ov     = $id('cart-overlay');
  if (cartEl) cartEl.classList.remove('open');
  if (ov)     ov.classList.remove('on');
  document.body.classList.remove('lock');
}
 
var openCartBtn = $id('open-cart');
var closeCartBtn = $id('close-cart');
var cartOverlay = $id('cart-overlay');
var btnContinuar = $id('btn-continuar');
 
if (openCartBtn)    openCartBtn.addEventListener('click', openCart);
if (closeCartBtn)   closeCartBtn.addEventListener('click', closeCart);
if (cartOverlay)    cartOverlay.addEventListener('click', closeCart);
if (btnContinuar)   btnContinuar.addEventListener('click', closeCart);
 
/* ─── CARRINHO — RENDER ─── */
function renderCart() {
  var el = $id('cart-items');
  if (!el) return;
 
  if (cart.length === 0) {
    el.innerHTML =
      '<div class="empty-msg">' +
        '<span class="empty-icon">🛒</span>' +
        'Seu carrinho está vazio.<br>Adicione itens para continuar.' +
      '</div>';
  } else {
    el.innerHTML = '';
    cart.forEach(function (item, idx) {
      var line = item.price * item.qty;
      var meta = [];
      // SEGURANÇA: escapeHTML em todos os campos vindos do estado (que passaram por localStorage)
      if (item.meta && item.meta.tamanho)  meta.push('Tamanho: ' + escapeHTML(item.meta.tamanho));
      if (item.meta && item.meta.borda && item.meta.borda !== 'Nenhuma') meta.push('Borda: ' + escapeHTML(item.meta.borda));
      if (item.meta && Array.isArray(item.meta.sabores) && item.meta.sabores.length)
        meta.push('Sabores: ' + item.meta.sabores.map(escapeHTML).join(' / '));
 
      var d = document.createElement('div');
      d.className = 'cart-item';
      d.innerHTML =
        '<div class="ci-name">' + escapeHTML(item.name) + '</div>' +
        (meta.length ? '<div class="ci-meta">' + meta.join(' · ') + '</div>' : '') +
        '<div class="ci-ctrl">' +
          '<div class="qty-wrap">' +
            '<button type="button" data-idx="' + idx + '" data-d="-1" aria-label="Diminuir">−</button>' +
            '<span class="qty-num">' + escapeHTML(String(item.qty)) + '</span>' +
            '<button type="button" data-idx="' + idx + '" data-d="1" aria-label="Aumentar">+</button>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span class="ci-price">' + escapeHTML(brl(line)) + '</span>' +
            '<button type="button" class="trash-btn" data-rm="' + idx + '" aria-label="Remover">🗑️</button>' +
          '</div>' +
        '</div>';
      el.appendChild(d);
    });
  }
 
  var sub   = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  var desc  = calcDesconto(sub);
  var total = Math.max(0, sub - desc);
  var cnt   = cart.reduce(function (s, i) { return s + i.qty; }, 0);
 
  var cartSubtotal = $id('cart-subtotal');
  var cartTotal    = $id('cart-total');
  var cartCount    = $id('cart-count');
  var fabTotal     = $id('fab-total');
 
  if (cartSubtotal) cartSubtotal.textContent = brl(sub);
  if (cartTotal)    cartTotal.textContent    = brl(total);
  if (cartCount) {
    cartCount.textContent = cnt;
    cartCount.classList.remove('bump');
    void cartCount.offsetWidth; // reflow
    if (cnt > 0) cartCount.classList.add('bump');
  }
  if (fabTotal)  fabTotal.textContent = cnt > 0 ? brl(total) : '';
 
  // linha desconto
  var dl = $id('cart-desc-linha');
  if (desc > 0) {
    if (!dl) {
      dl = document.createElement('div');
      dl.id = 'cart-desc-linha';
      dl.className = 'linha';
      dl.style.color = '#4caf50';
      var subEl = $id('cart-subtotal');
      if (subEl && subEl.parentElement)
        subEl.parentElement.insertAdjacentElement('afterend', dl);
    }
    var pct = CUPOM_CFG.tipo === 'percentual' ? ' (' + Math.round(CUPOM_CFG.desconto * 100) + '%)' : '';
    // SEGURANÇA: pct e brl(desc) são valores computados internamente — sem input do usuário
    dl.textContent = '';
    var spanEl = document.createElement('span');
    spanEl.textContent = '🏷️ Cupom' + pct;
    var strongEl = document.createElement('strong');
    strongEl.textContent = '− ' + brl(desc);
    dl.appendChild(spanEl);
    dl.appendChild(strongEl);
  } else if (dl) {
    dl.parentNode.removeChild(dl);
  }
 
  saveCart();
}
 
/* Delegação qty/remover */
var cartItemsEl = $id('cart-items');
if (cartItemsEl) {
  cartItemsEl.addEventListener('click', function (e) {
    var qb = e.target.closest ? e.target.closest('[data-d]') : null;
    var tb = e.target.closest ? e.target.closest('[data-rm]') : null;
    if (!qb && e.target.dataset && e.target.dataset.d) qb = e.target;
    if (!tb && e.target.dataset && e.target.dataset.rm !== undefined) tb = e.target;
 
    if (qb) {
      var idx = parseInt(qb.dataset.idx, 10);
      var d   = parseInt(qb.dataset.d,   10);
      if (!isNaN(idx) && cart[idx]) {
        cart[idx].qty += d;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
        renderCart();
      }
    } else if (tb) {
      var rmIdx = parseInt(tb.dataset.rm, 10);
      if (!isNaN(rmIdx)) {
        cart.splice(rmIdx, 1);
        renderCart();
      }
    }
  });
}
 
/* ─── ADICIONAR AO CARRINHO ─── */
function addToCart(name, price, qty, meta) {
  qty  = qty  || 1;
  meta = meta || {};
 
  // SEGURANÇA: sanitiza e valida entradas antes de armazenar
  name  = String(name || '').trim().substring(0, 200);
  price = Math.max(0, Math.min(99999, parseFloat(price) || 0));
  qty   = Math.max(1, Math.min(99, Math.floor(parseInt(qty, 10) || 1)));
  if (!name) return;
 
  var key = JSON.stringify({ name: name, price: price, meta: meta });
  var ex  = null;
  cart.forEach(function (i) {
    if (JSON.stringify({ name: i.name, price: i.price, meta: i.meta }) === key) ex = i;
  });
  if (ex) {
    ex.qty = Math.min(99, ex.qty + qty);
  } else {
    cart.push({ name: name, price: price, qty: qty, meta: meta });
  }
 
  ga('add_to_cart', { currency: 'BRL', value: price * qty, items: [{ item_name: name, price: price, quantity: qty }] });
  renderCart();
 
  /* Toast — NÃO abre o carrinho */
  var shortName = name.length > 32 ? name.substring(0, 30) + '…' : name;
  showToast('✅ ' + shortName + ' adicionado!');
}
 
/* Delegação para .btn-add */
document.addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('.btn-add') : null;
  if (!btn || btn.id === 'card-monte-add') return;
  var name  = btn.dataset.name;
  var price = parseFloat(btn.dataset.price);
  var meta  = btn.dataset.meta ? JSON.parse(btn.dataset.meta) : {};
  if (name && !isNaN(price)) addToCart(name, price, 1, meta);
});
 
/* Card "Monte sua pizza" */
var cardMonte = $id('card-monte');
if (cardMonte) {
  var openMonte = function () { abrirModalPizza(); };
  cardMonte.addEventListener('click', openMonte);
  cardMonte.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMonte(); }
  });
}
 
/* ─── FORMULÁRIO DO CARRINHO ─── */
document.querySelectorAll('input[name="modo-entrega"]').forEach(function (r) {
  r.addEventListener('change', function () {
    ds.modo = r.value;
    var df = $id('delivery-fields');
    if (df) df.classList.toggle('hidden', ds.modo !== 'delivery');
    // atualizar visual dos ropt
    document.querySelectorAll('.ropt').forEach(function (opt) {
      var inp = opt.querySelector('input');
      if (inp) opt.classList.toggle('selected', inp.checked);
    });
  });
});
 
// Inicializar estado visual dos ropt
document.querySelectorAll('.ropt').forEach(function (opt) {
  var inp = opt.querySelector('input');
  if (inp && inp.checked) opt.classList.add('selected');
  opt.addEventListener('click', function () {
    var name = inp ? inp.name : '';
    document.querySelectorAll('.ropt').forEach(function (o) {
      var i = o.querySelector('input');
      if (i && i.name === name) o.classList.toggle('selected', i.checked);
    });
  });
});
 
[
  ['bairro','bairro'],['rua','rua'],['numero','num'],['complemento','comp'],
  ['cep','cep'],['referencia','ref'],['nome','nome'],['telefone','tel'],['observacao','obs']
].forEach(function (pair) {
  var el = $id(pair[0]);
  if (el) el.addEventListener('input', function (e) { ds[pair[1]] = e.target.value; });
});
 
var formaPag = $id('forma-pagamento');
if (formaPag) {
  formaPag.addEventListener('change', function (e) {
    ds.pag = e.target.value;
    var pixSec = $id('pix-section');
    if (pixSec) pixSec.classList.toggle('hidden', ds.pag !== 'pix');
  });
}
 
/* PIX keys */
[$id('pix-key-inline'), $id('pix-key-modal')].forEach(function (el) {
  if (el) el.value = PIX_KEY;
});
 
function copiarPix(btn) {
  var fallback = function () {
    var ta = document.createElement('textarea');
    ta.value = PIX_KEY;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
  };
 
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(PIX_KEY).catch(fallback);
  } else { fallback(); }
 
  if (!btn) return;
  var orig = btn.textContent;
  btn.textContent = 'Copiado!';
  setTimeout(function () { btn.textContent = orig; }, 1400);
}
 
var btnCopyInline = $id('btn-copy-pix-inline');
var btnCopyModal  = $id('btn-copy-pix-modal');
if (btnCopyInline) btnCopyInline.addEventListener('click', function () { copiarPix(btnCopyInline); });
if (btnCopyModal)  btnCopyModal.addEventListener('click',  function () { copiarPix(btnCopyModal); });
 
/* Cupom */
var cupomBox = $id('cupom-box');
if (cupomBox) cupomBox.classList.toggle('hidden', !CUPOM_CFG.ativo);
 
function validarCupom() {
  var inp = $id('cupom-input');
  var fb  = $id('cupom-feedback');
  var digitado = (inp ? inp.value : '').trim().toUpperCase();
 
  /* campo vazio → limpa estado */
  if (!digitado) {
    cupom = { ok: false, code: '' };
    if (fb) { fb.textContent = ''; fb.className = 'hint'; }
    renderCart();
    return;
  }
 
  /* Feedback imediato: "verificando..." */
  if (fb) { fb.textContent = '⏳ Verificando...'; fb.className = 'hint'; }
 
  /* Compara hash SHA-256(input + ":" + salt) com o hash armazenado.
   * O cupom em texto puro NUNCA trafega nem aparece no código. */
  var candidato = digitado + ':' + CUPOM_SALT;
  hashSHA256(candidato).then(function (hex) {
    if (hex === CUPOM_CFG.hash) {
      cupom = { ok: true, code: digitado };
      if (fb) { fb.textContent = '✅ Cupom aplicado!'; fb.className = 'hint ok'; }
      ga('cupom_aplicado', { coupon: '[REDACTED]' }); /* não envia o código ao GA */
    } else {
      cupom = { ok: false, code: '' };
      if (fb) { fb.textContent = '❌ Código inválido.'; fb.className = 'hint err'; }
    }
    renderCart();
  }).catch(function () {
    /* SubtleCrypto falhou (contexto inseguro / browser muito antigo)
     * Fallback: desativa cupom com aviso — melhor negar do que aceitar qualquer coisa */
    cupom = { ok: false, code: '' };
    if (fb) { fb.textContent = '⚠️ Não foi possível verificar. Tente recarregar.'; fb.className = 'hint err'; }
  });
}
 
var cupomInput = $id('cupom-input');
var btnAplicar = $id('btn-aplicar-cupom');
if (cupomInput) cupomInput.addEventListener('blur', validarCupom);
if (btnAplicar) btnAplicar.addEventListener('click', function () {
  if (cupomInput) cupomInput.focus();
  validarCupom();
});
 
/* ─── VALIDAÇÃO ─── */
function validar() {
  if (!cart.length) { alert('Seu carrinho está vazio.'); return false; }
 
  var esfihas = 0;
  var temEsf  = false;
  cart.forEach(function (i) {
    if (i.name.toLowerCase().indexOf('esfiha') !== -1) {
      temEsf = true;
      esfihas += i.qty;
    }
  });
  if (temEsf && esfihas < ESFIHA_MIN) {
    var ec = $id('esfiha-count');
    if (ec) ec.textContent = esfihas;
    var em = $id('esfiha-modal');
    if (em) { em.classList.add('open'); em.setAttribute('aria-hidden', 'false'); }
    document.body.classList.add('lock');
    return false;
  }
 
  if (!ds.nome || !ds.tel) { alert('Informe seu nome e telefone (WhatsApp).'); return false; }
  if (ds.modo === 'delivery' && (!ds.rua || !ds.num || !ds.bairro)) {
    alert('Informe Bairro, Rua e Número para entrega.'); return false;
  }
  return true;
}
 
/* ─── MENSAGEM WHATSAPP ─── */
function getSaborFamilia(nome) {
  var found = null;
  Object.keys(SABORES).forEach(function (f) {
    SABORES[f].forEach(function (s) { if (s.name === nome) found = f; });
  });
  return found;
}
 
function montarMsg() {
  var SEP = '====================================';
 
  // SEGURANÇA: sanitiza campos do usuário — remove caracteres de controle
  // que poderiam manipular a formatação da mensagem
  function sanitizeField(val) {
    return String(val || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
      .trim()
      .substring(0, 500); // limite de comprimento
  }
 
  var safeName   = sanitizeField(ds.nome);
  var safeTel    = sanitizeField(ds.tel).replace(/[^\d\s\(\)\+\-]/g, ''); // só chars de telefone
  var safeObs    = sanitizeField(ds.obs);
  var safeRua    = sanitizeField(ds.rua);
  var safeNum    = sanitizeField(ds.num).replace(/[^\d\w\s\-\/]/g, '');
  var safeComp   = sanitizeField(ds.comp);
  var safeBairro = sanitizeField(ds.bairro);
  var safeCep    = sanitizeField(ds.cep).replace(/[^\d\-]/g, '');
  var safeRef    = sanitizeField(ds.ref);
 
  var L = ['🍕 NOVO PEDIDO – Forno a Lenha 🍕', '', SEP, '', 'ITENS DO PEDIDO:', ''];
  var sub2 = 0;
 
  cart.forEach(function (i) {
    var isPizza = i.meta && i.meta.tamanho && Array.isArray(i.meta.sabores) && i.meta.sabores.length > 0;
    var base = 0;
    if (isPizza) {
      (i.meta.sabores || []).forEach(function (s) {
        var fam = getSaborFamilia(s);
        var p = fam ? (PRECO_PIZZA[fam][i.meta.tamanho] || 0) : 0;
        if (p > base) base = p;
      });
    } else {
      base = i.price;
    }
    var addB = (isPizza && i.meta && i.meta.borda && i.meta.borda !== 'Nenhuma') ? (PRECO_BORDA[i.meta.tamanho] || 0) : 0;
    var lBase = base * i.qty, lBorda = addB * i.qty;
    sub2 += lBase + lBorda;
 
    var titulo = '• ' + i.qty + 'x ' + i.name.replace(/\s+\(.+\)$/, '').trim();
    if (i.meta && i.meta.tamanho) titulo = '• ' + i.qty + 'x Pizza ' + i.meta.tamanho;
    L.push(titulo + ' - ' + brl(lBase));
    if (i.meta && Array.isArray(i.meta.sabores) && i.meta.sabores.length) {
      if (i.meta.sabores.length === 2) { L.push('½ ' + i.meta.sabores[0], '½ ' + i.meta.sabores[1]); }
      else { L.push(i.meta.sabores[0]); }
    }
    if (addB > 0) L.push('', '• Borda: ' + i.meta.borda + ' - ' + brl(lBorda));
    L.push('');
  });
 
  var desc  = calcDesconto(sub2);
  var total = Math.max(0, sub2 - desc);
  L.push(SEP, '', 'SUBTOTAL: ' + brl(sub2));
  if (desc > 0) {
    var pct = CUPOM_CFG.tipo === 'percentual' ? ' (' + Math.round(CUPOM_CFG.desconto * 100) + '%)' : '';
    L.push('🏷️ CUPOM ' + escapeHTML(cupom.code) + pct + ': − ' + brl(desc));
  }
  L.push('TOTAL: ' + brl(total), '', SEP, '');
 
  var formas = {
    dinheiro: 'Dinheiro (Pagamento em mãos)',
    debito:   'Cartão de Débito (Máquina na entrega)',
    credito:  'Cartão de Crédito (Máquina na entrega)',
    pix:      'PIX (Comprovante em anexo)'
  };
  L.push('FORMA DE PAGAMENTO:', '* ' + (formas[ds.pag] || formas.dinheiro), '', SEP, '');
  L.push('ENTREGA: ' + (ds.modo === 'delivery' ? 'Delivery' : 'Retirada no balcão'));
 
  if (ds.modo === 'delivery') {
    L.push('DADOS DA ENTREGA:');
    if (safeRua)    L.push('* Rua/Av: ' + safeRua);
    if (safeNum)    L.push('* Nº: '     + safeNum);
    if (safeComp)   L.push('* Comp.: '  + safeComp);
    if (safeBairro) L.push('* Bairro: ' + safeBairro);
    if (safeCep)    L.push('* CEP: '    + safeCep);
    if (safeRef)    L.push('* Ref.: '   + safeRef);
    L.push('');
  }
  L.push(SEP, '', 'DADOS DE CONTATO:', '* Nome: ' + (safeName || '—'), '* Tel: ' + (safeTel || '—'), '', SEP, '');
  if (safeObs) L.push('OBSERVAÇÃO: ' + safeObs, '', SEP, '');
  L.push('Obrigado pela preferência! Deus vos abençoe! 🙏');
 
  return L.join('\n');
}
 
/* ─── ENVIAR PEDIDO ─── */
function enviarPedido(label) {
  var sub   = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  var total = Math.max(0, sub - calcDesconto(sub));
  ga('purchase', {
    currency: 'BRL', value: total,
    transaction_id: '' + Date.now(),
    items: cart.map(function (i) { return { item_name: i.name, price: i.price, quantity: i.qty }; })
  });
  ga('whatsapp_order', { event_category: 'conversao', event_label: label, value: total });

  // Registra pedido na planilha (fire-and-forget — não bloqueia o WhatsApp)
  registrarPedidoNaSheets(total);

  window.open('https://wa.me/' + WPP_NUMBER + '?text=' + encodeURIComponent(montarMsg()), '_blank');
  cart = [];
  saveCart();
  renderCart();
  closeCart();
}
 
/* ─── BOTÃO FINALIZAR ─── */
var btnFinalizar = $id('btn-finalizar');
if (btnFinalizar) {
  btnFinalizar.addEventListener('click', function () {
    if (!validar()) return;
    if (ds.pag === 'pix') {
      closeCart();
      var pixModal = $id('pix-modal');
      if (pixModal) { pixModal.classList.add('open'); pixModal.setAttribute('aria-hidden', 'false'); }
      document.body.classList.add('lock');
      var pixKeyModal = $id('pix-key-modal');
      if (pixKeyModal) pixKeyModal.value = PIX_KEY;
      return;
    }
    enviarPedido(ds.modo === 'delivery' ? 'delivery' : 'retirada');
  });
}
 
/* ─── MODAL PIX ─── */
function fecharModalPix() {
  var m = $id('pix-modal');
  if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('lock');
}
var btnPixFechar   = $id('btn-pix-fechar');
var btnPixCancelar = $id('btn-pix-cancelar');
var pixModal       = $id('pix-modal');
if (btnPixFechar)   btnPixFechar.addEventListener('click', fecharModalPix);
if (btnPixCancelar) btnPixCancelar.addEventListener('click', fecharModalPix);
if (pixModal) pixModal.addEventListener('click', function (e) { if (e.target === pixModal) fecharModalPix(); });
 
var btnPixContinuar = $id('btn-pix-continuar');
if (btnPixContinuar) btnPixContinuar.addEventListener('click', function () {
  enviarPedido('pix');
  fecharModalPix();
});
 
/* ─── MODAL ESFIHA ─── */
function fecharModalEsfiha() {
  var m = $id('esfiha-modal');
  if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('lock');
}
var btnEsfihaFechar = $id('btn-esfiha-fechar');
var btnEsfihaOk     = $id('btn-esfiha-ok');
var esfihaModal     = $id('esfiha-modal');
if (btnEsfihaFechar) btnEsfihaFechar.addEventListener('click', fecharModalEsfiha);
if (btnEsfihaOk)     btnEsfihaOk.addEventListener('click',     fecharModalEsfiha);
if (esfihaModal) esfihaModal.addEventListener('click', function (e) { if (e.target === esfihaModal) fecharModalEsfiha(); });
 
/* ─── MODAL MONTE SUA PIZZA ─── */
function abrirModalPizza() {
  construirOpcoesModal();
  var m = $id('pizza-modal');
  if (m) m.classList.add('open');
  document.body.classList.add('lock');
  ga('monte_pizza_aberto');
}
function fecharModalPizza() {
  var m = $id('pizza-modal');
  if (m) m.classList.remove('open');
  document.body.classList.remove('lock');
}
 
var closePizzaModal = $id('close-pizza-modal');
var btnPizzaCancelar = $id('btn-pizza-cancelar');
var pizzaModal = $id('pizza-modal');
 
if (closePizzaModal)  closePizzaModal.addEventListener('click',  fecharModalPizza);
if (btnPizzaCancelar) btnPizzaCancelar.addEventListener('click', fecharModalPizza);
if (pizzaModal) pizzaModal.addEventListener('click', function (e) { if (e.target === pizzaModal) fecharModalPizza(); });
 
function construirOpcoesModal() {
  var tamanhos = ['Brotinho', 'Média', 'Grande'];
  var tamOpts = $id('tamanho-opts');
  if (tamOpts) {
    tamOpts.innerHTML = tamanhos.map(function (t) {
      return '<input type="radio" id="tam-' + t + '" name="tamanho" value="' + t + '"' + (t === 'Grande' ? ' checked' : '') + '>' +
             '<label for="tam-' + t + '">' + t + '</label>';
    }).join('');
  }
 
  var saborOpts = $id('sabor-opts');
  if (saborOpts) {
    saborOpts.innerHTML = Object.keys(SABORES).map(function (cat) {
      var lista = SABORES[cat];
      var catLabel = cat === 'Tradicional' ? 'Tradicionais' : cat === 'Especial' ? 'Especiais' : 'Doces';
      return '<div class="grupo-sabores"><strong>' + catLabel + '</strong>' +
             '<div class="opts opts-grid">' +
             lista.map(function (s, i) {
               return '<input type="checkbox" id="sab-' + cat + '-' + i + '" name="sabor" value="' + s.name + '" data-fam="' + cat + '">' +
                      '<label for="sab-' + cat + '-' + i + '">' +
                        '<img class="sabor-img" src="' + s.img + '" alt="' + s.name + '" loading="lazy">' +
                        s.name +
                      '</label>';
             }).join('') +
             '</div><hr style="margin:8px 0;border:none;border-top:1px dashed var(--border)"></div>';
    }).join('');
  }
 
  var bordaOpts = $id('borda-options');
  if (bordaOpts) {
    bordaOpts.className = 'opts opts-grid';
    bordaOpts.innerHTML = BORDAS.map(function (b, i) {
      return '<input type="radio" id="brd-' + i + '" name="borda" value="' + b.name + '"' + (b.name === 'Nenhuma' ? ' checked' : '') + '>' +
             '<label for="brd-' + i + '">' +
               '<img class="sabor-img" src="' + b.img + '" alt="' + b.name + '" loading="lazy">' +
               b.name +
             '</label>';
    }).join('');
  }
 
  var pizzaForm = $id('pizza-form');
  if (pizzaForm) {
    pizzaForm.querySelectorAll('input').forEach(function (el) {
      el.addEventListener('change', atualizarPizza);
    });
    atualizarPizza();
  }
}
 
function getTam() {
  var pf = $id('pizza-form');
  if (!pf) return null;
  var checked = pf.querySelector('input[name="tamanho"]:checked');
  return checked ? checked.value : null;
}
 
function atualizarPizza() {
  var pf  = $id('pizza-form');
  if (!pf) return;
  var tam = getTam();
  var isBrot = tam === 'Brotinho';
  var max = isBrot ? 1 : 2;
 
  var sels = Array.prototype.slice.call(pf.querySelectorAll('input[name="sabor"]:checked'));
  sels.slice(max).forEach(function (s) { s.checked = false; });
 
  pf.querySelectorAll('input[name="borda"]').forEach(function (r) {
    if (r.value === 'Nenhuma') { r.disabled = false; if (isBrot) r.checked = true; }
    else { r.disabled = isBrot; if (isBrot) r.checked = false; }
  });
 
  var hp = $id('hint-precos');
  if (hp && tam) {
    var f = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
    hp.textContent = [
      'Trad.: '  + f(PRECO_PIZZA.Tradicional[tam]),
      'Esp.: '   + f(PRECO_PIZZA.Especial[tam]),
      'Doce: '   + f(PRECO_PIZZA.Doce[tam])
    ].join(' · ');
  }
 
  var hs = $id('hint-sabores');
  if (hs) hs.innerHTML = isBrot
    ? 'Para <b>Brotinho</b>: apenas <b>1 sabor</b> e <b>sem borda</b>.'
    : 'Pode escolher até <b>2 sabores</b> (meio a meio).';
 
  var sabSel = Array.prototype.slice.call(pf.querySelectorAll('input[name="sabor"]:checked'));
  var bordaChecked = pf.querySelector('input[name="borda"]:checked');
  var borda = bordaChecked ? bordaChecked.value : 'Nenhuma';
 
  var pizzaSub = 0;
  var titulo = 'Pizza - Escolha os sabores';
 
  if (tam && sabSel.length > 0) {
    var fams = {};
    sabSel.forEach(function (s) { fams[s.dataset.fam] = true; });
    var nomes = sabSel.map(function (s) { return s.value; });
    var maior = 0;
    Object.keys(fams).forEach(function (f) {
      var p = PRECO_PIZZA[f] ? (PRECO_PIZZA[f][tam] || 0) : 0;
      if (p > maior) maior = p;
    });
    pizzaSub = maior;
    titulo = nomes.length > 1 ? 'Pizza Meio a Meio (' + nomes.join(' / ') + ')' : 'Pizza de ' + nomes[0];
  }
 
  var addBorda = (borda !== 'Nenhuma') ? (PRECO_BORDA[tam] || 0) : 0;
  var sub2 = Math.round(pizzaSub * 100) / 100;
  var tot  = Math.round((sub2 + addBorda) * 100) / 100;
  var fmt  = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
 
  var pSub   = $id('p-subtotal');
  var pBorda = $id('p-borda');
  var pTotal = $id('p-total');
  if (pSub)   pSub.textContent   = fmt(sub2);
  if (pBorda) pBorda.textContent = fmt(addBorda);
  if (pTotal) pTotal.textContent = fmt(tot);
 
  pf._data = { precoFinal: tot, nomePizza: titulo, tamanho: tam, borda: borda, sabores: sabSel.map(function (s) { return s.value; }) };
}
 
var pizzaForm = $id('pizza-form');
if (pizzaForm) {
  pizzaForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = pizzaForm._data || {};
    if (!d.precoFinal || d.precoFinal <= 0) { alert('Escolha pelo menos 1 sabor e um tamanho.'); return; }
    addToCart(d.nomePizza + ' (' + d.tamanho + ')', d.precoFinal, 1, {
      tamanho: d.tamanho, borda: d.borda, sabores: d.sabores
    });
    fecharModalPizza();
  });
}
 
/* ─── INICIALIZAR ─── */
renderCart();
 
var pixKeyInline = $id('pix-key-inline');
var pixKeyModal2 = $id('pix-key-modal');
if (pixKeyInline) pixKeyInline.value = PIX_KEY;
if (pixKeyModal2) pixKeyModal2.value = PIX_KEY;

// Sincroniza preços com a planilha ao carregar (com pequeno delay para não impactar LCP)
setTimeout(sincronizarPrecosDaSheets, 2000);