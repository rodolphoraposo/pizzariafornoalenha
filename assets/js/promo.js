/* ═══════════════════════════════════════════
   PROMO.JS — Configuração + Sistema de Promoções
   Forno à Lenha Pizzaria
═══════════════════════════════════════════ */

/* ─── CONFIGURAÇÃO ─── */
var PROMOCAO_CONFIG = {

  /* Pop-up da tela inicial */
  popup: {
    ativo: false,
    mostrarCTA: false,
    imagem: '/assets/imgs/promocao/promo-hoje.png',
    produto: 'Pizza Grande - Sabores Tradicionais',
    precoOriginal: 47.90,
    precoPromocional: 39.00,
    descricao: 'Todos os sabores de pizzas grandes tradicionais!',
    badge: 'PROMOÇÃO'
  },

  /* Seções de promoção no cardápio */
  secao: [
    {
      ativo: false,
      titulo: '🔥 Promoções de Hoje',
      itens: [
        {
          nome: 'Promoção Esfihas — 10 unidades',
          imagem: '/assets/imgs/promocao/promoesfihas.jpeg',
          descricao: 'Coloque nas observações os sabores desejados.<br>Apenas sabores tradicionais (Mista, Frango, Mussarela, Calabresa e Marguerita).',
          precoOriginal: 39.90,
          precoPromocional: 19.00,
          badge: 'PROMOÇÃO'
        }
      ]
    },
    {
      ativo: false,
      titulo: '🔥 Promoções da Semana',
      itens: [
        {
          nome: 'Temaki Salmão Grelhado',
          imagem: '/assets/imgs/promocao/promotemaki.jpeg',
          descricao: 'Temaki de salmão grelhado com molho especial.',
          precoOriginal: 37.90,
          precoPromocional: 31.90,
          badge: 'PROMOÇÃO'
        },
        {
          nome: 'Sushidog Salmão Grelhado',
          imagem: '/assets/imgs/promocao/promosushi.jpeg',
          descricao: 'Salmão grelhado com molho especial, clássico da casa!',
          precoOriginal: 38.90,
          precoPromocional: 31.90,
          badge: 'PROMOÇÃO'
        }
      ]
    }
  ]
};

/* ─── PERSISTÊNCIA (localStorage) ─── */
function salvarConfigPromocao() {
  try {
    localStorage.setItem('forno_promo_config', JSON.stringify(PROMOCAO_CONFIG));
  } catch (e) {
    console.warn('Erro ao salvar configuração de promoção:', e);
  }
}

function carregarConfigPromocao() {
  try {
    var saved = localStorage.getItem('forno_promo_config');
    if (saved) {
      var parsed = JSON.parse(saved);
      Object.assign(PROMOCAO_CONFIG, parsed);
    }
  } catch (e) {
    console.warn('Erro ao carregar configuração de promoção:', e);
  }
}

carregarConfigPromocao();

if (typeof window !== 'undefined') {
  window.PROMOCAO_CONFIG = PROMOCAO_CONFIG;
  window.salvarConfigPromocao = salvarConfigPromocao;
}

/* ─── SISTEMA ─── */
(function initPromoSystem() {

  /**
   * escapeHTML local — SEGURANÇA: sanitiza strings de config antes
   * de inserir em innerHTML. Config pode eventualmente vir de API/admin.
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    if (typeof PROMOCAO_CONFIG === 'undefined') {
      console.warn('PROMOCAO_CONFIG não encontrada.');
      return;
    }
    initPopupPromocional();
    initSecaoPromocoes();
    initNavLinkPromocoes();
  }

  /* ─── Pop-up ─── */
  function initPopupPromocional() {
    var config = PROMOCAO_CONFIG.popup;
    if (!config || !config.ativo) return;

    var overlay = document.createElement('div');
    overlay.id = 'promo-popup-overlay';

    overlay.innerHTML =
      '<div class="promo-popup-card">' +
        '<button class="promo-popup-close" aria-label="Fechar">&#x2715;</button>' +
        '<div class="promo-popup-content">' +
          '<div class="promo-popup-image-wrapper">' +
            (config.badge ? '<div class="promo-popup-badge">' + escapeHTML(config.badge) + '</div>' : '') +
            '<img src="' + escapeHTML(config.imagem) + '" alt="' + escapeHTML(config.produto) + '" class="promo-popup-image" loading="lazy">' +
            (config.mostrarCTA !== false
              ? '<div class="promo-popup-footer"><button class="promo-popup-btn" type="button">' + escapeHTML(config.rotuloCTA || 'Pedir agora') + '</button></div>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var btnClose = overlay.querySelector('.promo-popup-close');
    var btnPedir = overlay.querySelector('.promo-popup-btn');

    function fecharPopup() {
      overlay.classList.remove('show');
      sessionStorage.setItem('forno_popup_mostrado', 'true');
      document.body.classList.remove('lock');
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
    }

    btnClose.addEventListener('click', fecharPopup);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) fecharPopup(); });

    if (btnPedir) {
      btnPedir.addEventListener('click', function () {
        window.location.href = '#secao-promocoes';
        fecharPopup();
      });
    }

    setTimeout(function () {
      overlay.classList.add('show');
      document.body.classList.add('lock');
    }, 1200);
  }

  /* ─── Seção de promoções ─── */
  function initSecaoPromocoes() {
    var secoes = PROMOCAO_CONFIG.secao;
    if (!Array.isArray(secoes)) return;

    var secoesAtivas = secoes.filter(function (s) {
      return s.ativo && Array.isArray(s.itens) && s.itens.length > 0;
    });
    if (secoesAtivas.length === 0) return;

    var container = document.querySelector('.container');
    var pizzasSection = document.getElementById('pizzas');
    if (!container || !pizzasSection) return;

    secoesAtivas.forEach(function (config, index) {
      var secao = document.createElement('section');
      secao.id = index === 0 ? 'secao-promocoes' : 'secao-promocoes-' + index;
      secao.className = 'secao';

      var cardsId = 'promo-cards-container-' + index;
      secao.innerHTML =
        '<div class="sec-head"><h1>' + escapeHTML(config.titulo || '🔥 Promoções') + '</h1></div>' +
        '<div class="cards" id="' + escapeHTML(cardsId) + '"></div>';

      container.insertBefore(secao, pizzasSection);

      var cardsContainer = secao.querySelector('#' + cardsId);
      config.itens.forEach(function (item) {
        cardsContainer.appendChild(criarCardPromo(item));
      });
    });
  }

  function criarCardPromo(item) {
    var card = document.createElement('div');
    card.className = 'card';

    var precoOrig  = Number(item.precoOriginal  || 0);
    var precoPromo = Number(item.precoPromocional || 0);
    // SEGURANÇA: brl() retorna string numérica formatada — sem input do usuário
    var fmtPromo   = precoPromo.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    var fmtOrig    = precoOrig.toLocaleString('pt-BR',  { minimumFractionDigits: 2 });

    // SEGURANÇA: escapeHTML em todos os campos vindos de PROMOCAO_CONFIG
    card.innerHTML =
      '<img class="card-img" src="' + escapeHTML(item.imagem) + '" alt="' + escapeHTML(item.nome) + '" loading="lazy" style="object-fit:contain">' +
      '<div class="card-body">' +
        '<h3>' + escapeHTML(item.nome) +
          (item.badge
            ? '<small style="background:var(--amber);color:#000;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;vertical-align:middle">' + escapeHTML(item.badge) + '</small>'
            : '') +
        '</h3>' +
        // descricao pode conter <br> intencional — permitido apenas se vier da config estática
        // Se a config vier de backend externo, remover a tag <br> abaixo
        (item.descricao
          ? '<p>' + escapeHTML(item.descricao).replace(/&lt;br&gt;/gi, '<br>') + '</p>'
          : '<p class="muted">Promoção especial.</p>') +
        '<div class="card-foot">' +
          '<div>' +
            (precoOrig > precoPromo
              ? '<span style="text-decoration:line-through;color:var(--txt3);font-size:.8em;display:block">R$ ' + fmtOrig + '</span>'
              : '') +
            '<span class="price">R$ ' + fmtPromo + '</span>' +
          '</div>' +
          '<button class="btn-add" aria-label="Adicionar ' + escapeHTML(item.nome) + '">+</button>' +
        '</div>' +
      '</div>';

    card.querySelector('.btn-add').addEventListener('click', function () {
      if (typeof addToCart === 'function') {
        addToCart(item.nome, precoPromo, 1, { tipo: 'promocao', descricao: item.descricao || '' });
      }
    });

    return card;
  }

  /* ─── Link nav de promoções ─── */
  function initNavLinkPromocoes() {
    var secoes = PROMOCAO_CONFIG.secao;
    if (!Array.isArray(secoes) || !secoes.some(function (s) { return s.ativo; })) return;

    var mainNav = document.querySelector('.main-nav');
    if (!mainNav || mainNav.querySelector('[data-target="promocoes"]')) return;

    var link = document.createElement('a');
    link.className = 'nav-link';
    link.href = '#secao-promocoes';
    link.dataset.target = 'promocoes';
    link.title = 'Promoções';
    link.innerHTML = '<span class="nav-icon">🔥</span><span>Promoções</span>';

    mainNav.insertBefore(link, mainNav.firstChild);

    link.addEventListener('click', function (e) {
      e.preventDefault();
      var secao = document.getElementById('secao-promocoes');
      if (!secao) return;
      var headerOffset = 80;
      var offsetPosition = secao.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      document.querySelectorAll('.main-nav .nav-link').forEach(function (n) { n.classList.remove('active'); });
      link.classList.add('active');
    });
  }

})();