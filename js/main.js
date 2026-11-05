/* ==========================================================
   오설록 프리미엄 녹차와플 - main.js
   ----------------------------------------------------------
   [수정 가이드]
   - 맨 위 "설정값"만 바꿔도 속도/간격 등을 조절할 수 있습니다.
   - 기능은 번호별 함수로 나뉘어 있습니다. 필요 없는 기능은
     맨 아래 init() 에서 해당 함수 호출 한 줄만 지우면 꺼집니다.
   - HTML의 id / class / data-* 이름을 바꾸면 이 파일도 함께 수정해야 합니다.
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 설정값 ---------- */
  var SLIDE_INTERVAL = 5000;   // 슬라이더 자동 넘김 간격(ms). 0 이면 자동 재생 끔
  var HEADER_SOLID_AT = 40;    // 이만큼(px) 스크롤하면 헤더 배경이 채워짐
  var TOP_BTN_AT = 600;        // 이만큼(px) 스크롤하면 "맨 위로" 버튼 표시
  var CART_KEY = 'osulloc-waffle-cart'; // 장바구니 저장 이름(브라우저 localStorage)

  /* ---------- 작은 도우미 함수 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function won(n) { return Number(n).toLocaleString('ko-KR'); } // 3500 -> "3,500"

  var toastTimer;
  function toast(msg) {            // 하단 알림 메시지
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ==========================================================
     [1] 이미지 불러오기 실패 대비
     - 외부 이미지 주소가 막히거나 바뀌면 깨진 아이콘 대신 초록 배경을 보여줍니다.
     - 이미지는 HTML의 <img src="..."> 만 교체하면 됩니다.
     ========================================================== */
  function initImageFallback() {
    $all('img').forEach(function (img) {
      function fail() { img.classList.add('img-failed'); img.removeAttribute('alt'); img.setAttribute('aria-hidden', 'true'); }
      img.addEventListener('error', fail);
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail(); // 이미 실패한 경우
    });
  }

  /* ==========================================================
     [2] 헤더: 스크롤 시 배경 채우기 + 맨 위로 버튼
     ========================================================== */
  function initScrollUI() {
    var header = $('#siteHeader');
    var topBtn = $('#toTop');
    function onScroll() {
      var y = window.pageYOffset;
      header.classList.toggle('is-solid', y > HEADER_SOLID_AT);
      topBtn.classList.toggle('show', y > TOP_BTN_AT);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ==========================================================
     [3] 모바일 메뉴 열기/닫기 + 부드러운 스크롤
     - 메뉴 클릭 시 해당 섹션으로 자연스럽게 이동(CSS scroll-behavior + 아래 코드).
     ========================================================== */
  function initMenu() {
    var toggle = $('#menuToggle');
    var gnb = $('#gnb');

    function setMenu(open) {
      gnb.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }
    toggle.addEventListener('click', function () { setMenu(!gnb.classList.contains('is-open')); });

    // 모든 #앵커 링크: 부드럽게 이동 + 모바일 메뉴 닫기
    $all('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id.length > 1 ? $(id) : null;
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', id);
        setMenu(false);
      });
    });

    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 768) setMenu(false); });
  }

  /* ==========================================================
     [4] 스크롤스파이: 현재 보고 있는 섹션의 메뉴에 .is-active 표시
     ========================================================== */
  function initScrollSpy() {
    var links = $all('.nav-link');
    var map = {};
    links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    // #mood(3단 이미지)는 메뉴가 없으므로 "메인페이지"에 묶어줍니다.
    map.mood = map.home;

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        var link = map[en.target.id];
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' }); // 화면 중앙선에 걸린 섹션을 기준으로 판단
    $all('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ==========================================================
     [5] 히어로 텍스트 애니메이션
     - 페이지가 열리면 <body> 에 .is-loaded 를 붙이고, CSS가 문구를 아래→위로 올립니다.
     ========================================================== */
  function initHeroIntro() {
    requestAnimationFrame(function () {
      setTimeout(function () { document.body.classList.add('is-loaded'); }, 150);
    });
  }

  /* ==========================================================
     [6] 스크롤 등장 효과 (.reveal)
     - 화면에 들어오면 .is-visible 을 붙여 부드럽게 나타납니다.
     - data-delay="120" 처럼 쓰면 그만큼(ms) 늦게 나타납니다.
     ========================================================== */
  function initReveal() {
    var items = $all('.reveal');
    if (!('IntersectionObserver' in window)) {   // 구형 브라우저: 그냥 모두 보이기
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = Number(el.getAttribute('data-delay')) || 0;
        setTimeout(function () { el.classList.add('is-visible'); }, delay);
        io.unobserve(el);                         // 한 번만 실행
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ==========================================================
     [7] 패럴랙스
     - [data-parallax] 요소가 스크롤에 따라 다른 속도로 움직입니다.
     - data-speed : 양수면 배경처럼 천천히, 음수면 반대로 움직임. 숫자가 클수록 많이 움직임.
     - 모바일/모션 줄이기 설정에서는 자동으로 꺼집니다.
     ========================================================== */
  function initParallax() {
    var els = $all('[data-parallax]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!els.length || reduce) return;

    var ticking = false;
    function update() {
      ticking = false;
      if (window.innerWidth <= 768) {              // 모바일은 성능을 위해 끔
        els.forEach(function (el) { el.style.transform = ''; });
        return;
      }
      var y = window.pageYOffset;
      els.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-speed')) || 0;
        el.style.transform = 'translate3d(0,' + (y * speed).toFixed(1) + 'px,0)';
      });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }  // 프레임당 1회만 계산
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ==========================================================
     [8] 제품소개 탭
     - 탭 버튼의 data-tab 값 = 패널의 id. 클릭하면 해당 패널만 보입니다.
     - 방향키(← →)로도 이동할 수 있습니다.
     ========================================================== */
  function initTabs() {
    var tabs = $all('.tab');
    var panels = $all('.tab-panel');

    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      panels.forEach(function (p) {
        var on = p.id === tab.getAttribute('data-tab');
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { next.focus(); select(next); }
      });
    });
  }

  /* ==========================================================
     [9] 숫자 카운트업
     - .count 요소가 화면에 보이면 0 → data-count 까지 올라갑니다.
     - 단위는 data-suffix 로 지정합니다.
     ========================================================== */
  function initCountUp() {
    var nums = $all('.count');
    if (!nums.length) return;

    function run(el) {
      var target = Number(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1400, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);          // 끝으로 갈수록 느려지는 효과
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      nums.forEach(function (el) { el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || ''); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ==========================================================
     [10] 티타임 & 디저트 슬라이더
     - 이전/다음 버튼, 점(dot), 키보드(← →), 터치 스와이프, 자동 재생 지원
     - 마우스를 올리거나 포커스가 있으면 자동 재생이 잠시 멈춥니다.
     ========================================================== */
  function initSlider() {
    var slider = $('#slider');
    if (!slider) return;
    var track = $('#slides');
    var slides = $all('.slide', track);
    var dotsBox = $('#dots');
    var index = 0, timer = null;

    // 점(dot) 자동 생성
    slides.forEach(function (_, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'dot';
      d.setAttribute('aria-label', (i + 1) + '번째 슬라이드');
      d.addEventListener('click', function () { go(i); restart(); });
      dotsBox.appendChild(d);
    });
    var dots = $all('.dot', dotsBox);

    function go(i) {
      index = (i + slides.length) % slides.length;   // 처음↔끝 순환
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === index); });
    }
    function restart() {
      clearInterval(timer);
      if (SLIDE_INTERVAL > 0) timer = setInterval(function () { go(index + 1); }, SLIDE_INTERVAL);
    }
    function pause() { clearInterval(timer); }

    $('#slidePrev').addEventListener('click', function () { go(index - 1); restart(); });
    $('#slideNext').addEventListener('click', function () { go(index + 1); restart(); });
    slider.addEventListener('mouseenter', pause);
    slider.addEventListener('mouseleave', restart);
    slider.addEventListener('focusin', pause);
    slider.addEventListener('focusout', restart);
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
      if (e.key === 'ArrowRight') { go(index + 1); restart(); }
    });

    // 터치 스와이프 (모바일)
    var startX = null;
    slider.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; pause(); }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      startX = null; restart();
    });

    go(0);
    restart();
  }

  /* ==========================================================
     [11] 구매 섹션: 수량 증감 + 합계 계산
     - 각 상품(.buy-item)의 data-price × 수량 = 합계 를 실시간으로 보여줍니다.
     ========================================================== */
  function initBuyItems() {
    $all('.buy-item').forEach(function (item) {
      var price = Number(item.getAttribute('data-price'));
      var input = $('.qty-input', item);
      var sub = $('.subtotal strong', item);

      function clamp() {
        var v = parseInt(input.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        if (v > 99) v = 99;
        input.value = v;
        sub.textContent = won(price * v);
        return v;
      }
      $('.qty-minus', item).addEventListener('click', function () { input.value = (parseInt(input.value, 10) || 1) - 1; clamp(); });
      $('.qty-plus', item).addEventListener('click', function () { input.value = (parseInt(input.value, 10) || 1) + 1; clamp(); });
      input.addEventListener('input', clamp);
      input.addEventListener('blur', clamp);

      $('.add-cart', item).addEventListener('click', function () {
        Cart.add(item.getAttribute('data-id'), item.getAttribute('data-name'), price, clamp());
        input.value = 1; clamp();
      });
    });
  }

  /* ==========================================================
     [12] 장바구니
     - 상품 담기 / 수량 변경 / 삭제 / 총액 계산
     - 새로고침해도 유지되도록 브라우저 localStorage 에 저장합니다.
     - 실제 결제 연동은 아래 checkout() 함수에서 서버/결제 API 와 연결하세요.
     ========================================================== */
  var Cart = {
    items: [],   // { id, name, price, qty }

    load: function () {
      try { this.items = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
      catch (e) { this.items = []; }          // 저장소 사용 불가/손상 시 빈 장바구니
    },
    save: function () {
      try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch (e) { /* 무시 */ }
    },
    add: function (id, name, price, qty) {
      var found = this.items.filter(function (i) { return i.id === id; })[0];
      if (found) found.qty = Math.min(99, found.qty + qty);
      else this.items.push({ id: id, name: name, price: price, qty: qty });
      this.save(); this.render(true);
      toast(name + ' ' + qty + '개를 담았습니다.');
    },
    change: function (id, delta) {
      var it = this.items.filter(function (i) { return i.id === id; })[0];
      if (!it) return;
      it.qty = Math.max(1, Math.min(99, it.qty + delta));
      this.save(); this.render();
    },
    remove: function (id) {
      this.items = this.items.filter(function (i) { return i.id !== id; });
      this.save(); this.render();
    },
    count: function () { return this.items.reduce(function (s, i) { return s + i.qty; }, 0); },
    total: function () { return this.items.reduce(function (s, i) { return s + i.price * i.qty; }, 0); },

    // 화면 갱신 (목록, 총액, 헤더 배지)
    render: function (bump) {
      var list = $('#cartItems');
      list.innerHTML = '';
      this.items.forEach(function (it) {
        var li = document.createElement('li');
        li.innerHTML =
          '<span class="ci-name"></span>' +
          '<span class="ci-price">' + won(it.price * it.qty) + '원</span>' +
          '<span class="ci-qty"><button type="button" data-act="minus" aria-label="수량 감소">−</button>' +
          '<span>' + it.qty + '</span>' +
          '<button type="button" data-act="plus" aria-label="수량 증가">＋</button></span>' +
          '<button type="button" class="ci-remove" data-act="remove">삭제</button>';
        $('.ci-name', li).textContent = it.name;       // 상품명은 textContent 로 안전하게 삽입
        li.setAttribute('data-id', it.id);
        list.appendChild(li);
      });
      $('#cartEmpty').hidden = this.items.length > 0;
      $('#cartTotal').textContent = won(this.total());
      $('#checkoutBtn').disabled = this.items.length === 0;

      var badge = $('#cartCount');
      badge.textContent = this.count();
      if (bump) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
    }
  };

  function openCart(open) {
    var panel = $('#cartPanel');
    var overlay = $('#overlay');
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    overlay.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';   // 열려 있을 때 배경 스크롤 방지
    if (open) $('#cartClose').focus();
  }

  // 주문하기: 지금은 안내 메시지만 보여줍니다. 실제 서비스에서는 이 함수 안에서 결제 페이지로 이동시키세요.
  function checkout() {
  if (!Cart.items.length) return;

  var orderNumber = 'GC-' + Date.now().toString().slice(-6);
  var total = Cart.total();

  var accountNumber = '3333-21-4273091';

  var orderItems = Cart.items.map(function (item) {
    return item.name + ' ' + item.qty + '개';
  }).join('<br>');

  var orderHTML = `
    <div class="order-complete">
      <div class="order-check">✓</div>
      <h2>주문이 완료되었습니다!</h2>
      <p>GREEN CRISP EDITORIAL</p>

      <div class="order-info">
        <p>주문번호</p>
        <strong>${orderNumber}</strong>
        <hr>
        <p>${orderItems}</p>
        <hr>
        <p>입금 금액</p>
        <strong>${won(total)}원</strong>
      </div>

      <div class="account-info">
        <h3>입금 계좌 안내</h3>
        <p>은행명: KAKAO BANK </p>
        <strong>${accountNumber}</strong>
        <p>황신영</p>
      </div>

      <button type="button" class="btn btn-primary" onclick="window.close()">
        쇼핑 계속하기
      </button>
    </div>
  `;

  var popup = window.open('', '_blank', 'width=600,height=750');

  if (popup) {
    popup.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>주문 완료</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f4ed;
            padding: 30px;
            color: #263b22;
          }
          .order-complete {
            max-width: 450px;
            margin: auto;
            background: white;
            padding: 35px;
            border-radius: 20px;
            text-align: center;
          }
          .order-check {
            font-size: 50px;
            color: #66834b;
          }
          .order-info, .account-info {
            background: #f5f7ef;
            padding: 20px;
            margin: 20px 0;
            border-radius: 12px;
          }
          button {
            padding: 14px 25px;
            background: #36552c;
            color: white;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>${orderHTML}</body>
      </html>
    `);
    popup.document.close();
  }
}
  function initCart() {
    Cart.load();
    Cart.render();

    $('#cartBtn').addEventListener('click', function () { openCart(true); });
    $('#cartClose').addEventListener('click', function () { openCart(false); });
    $('#overlay').addEventListener('click', function () { openCart(false); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') openCart(false); });
    $('#checkoutBtn').addEventListener('click', checkout);

    // 목록 안의 버튼(+, −, 삭제)은 이벤트 위임으로 한 번에 처리
    $('#cartItems').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var id = btn.closest('li').getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'plus') Cart.change(id, 1);
      if (act === 'minus') Cart.change(id, -1);
      if (act === 'remove') Cart.remove(id);
    });
  }

  /* ---------- 시작 ---------- */
  function init() {
    initImageFallback();
    initScrollUI();
    initMenu();
    initScrollSpy();
    initHeroIntro();
    initReveal();
    initParallax();
    initTabs();
    initCountUp();
    initSlider();
    initBuyItems();
    initCart();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
    const mainVideo = document.querySelector('.video-main');
  const blurVideo = document.querySelector('.video-blur-bg');

  if (mainVideo && blurVideo) {
    mainVideo.addEventListener('play', () => {
      blurVideo.currentTime = mainVideo.currentTime;
      blurVideo.play();
    });

    mainVideo.addEventListener('pause', () => {
      blurVideo.pause();
    });

    mainVideo.addEventListener('timeupdate', () => {
      if (Math.abs(blurVideo.currentTime - mainVideo.currentTime) > 0.3) {
        blurVideo.currentTime = mainVideo.currentTime;
      }
    });

    mainVideo.addEventListener('ended', () => {
      blurVideo.pause();
    });
  }
})();
