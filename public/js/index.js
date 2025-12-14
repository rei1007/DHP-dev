import { db, setupResModal, generateTourCard } from "./common.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// グローバル状態
let allTournaments = [];
let lastIsMobile = window.innerWidth < 768;

// モーダル初期化
setupResModal();

async function loadTournaments() {
    // リスト要素
    const list = document.getElementById('tourList');
    if (!list) return;

    // ローディング
    list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:4rem;">Loading...</div>';

    try {
        const q = query(collection(db, "tournaments"), orderBy("eventDate", "desc"));
        const snapshot = await getDocs(q);
        allTournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // モーダル用にグローバル保存 (handleTourClickで使用)
        window._tournamentsData = allTournaments;

        // 初期レンダリング
        renderTourList();

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="grid-column:1/-1; padding:20px; color:red; text-align:center;">読み込みエラー</div>';
    }
}

function renderTourList() {
    const list = document.getElementById('tourList');
    if (!list || allTournaments.length === 0) {
        if (list) list.innerHTML = '<div style="grid-column:1/-1; text-align:center; width:100%; padding:40px;">現在表示できる大会情報はありません。</div>';
        return;
    }

    // クライアント側ソート: 受付中 -> 開催予定 -> 終了
    const statusOrder = { 'open': 1, 'upcoming': 2, 'closed': 3 };
    
    // まず全てソート
    let sortedTours = [...allTournaments];
    sortedTours.sort((a, b) => {
        const sA = statusOrder[a.status] || 99;
        const sB = statusOrder[b.status] || 99;
        if (sA !== sB) return sA - sB;
         const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
         const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
         return dB - dA;
    });

    const isMobile = window.innerWidth < 768;
    let displayTours = [];

    if (isMobile) {
         const opens = sortedTours.filter(t => t.status === 'open');
         const upcomings = sortedTours.filter(t => t.status === 'upcoming');
         const closeds = sortedTours.filter(t => t.status === 'closed');
         
         // ベース: 全ての「受付中」+「開催予定」
         let base = [...opens, ...upcomings];
         
         // 最新の「終了」が1つあれば追加
         if (closeds.length > 0) {
             base.push(closeds[0]);
         }
         
         if (base.length > 3) {
             displayTours = base;
         } else {
             displayTours = base;
             let needed = 3 - base.length;
             let nextClosedIndex = (closeds.length > 0) ? 1 : 0; 
             while(needed > 0 && nextClosedIndex < closeds.length) {
                 displayTours.push(closeds[nextClosedIndex]);
                 nextClosedIndex++;
                 needed--;
             }
         }
    } else {
        // PC: 厳密に6件制限
        displayTours = sortedTours.slice(0, 6);
    }
    
    // 表示用に再ソート (マージロジック後の順序維持: ステータス > 日付)
    displayTours.sort((a, b) => {
        const sA = statusOrder[a.status] || 99;
        const sB = statusOrder[b.status] || 99;
        if (sA !== sB) return sA - sB;
        const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        return dB - dA;
    });

    // 共通関数を使用してHTML生成
    let html = '';
    displayTours.forEach(t => {
        html += generateTourCard(t);
    });

    list.innerHTML = html;

    // CTAバー更新
    updateCtaBar(displayTours);
}

// リサイズリスナー
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile !== lastIsMobile) {
        lastIsMobile = isMobile;
        renderTourList();
    }
});

// CTAバーロジック
function updateCtaBar(data) {
    const ctaBar = document.getElementById('ctaBar');
    if (!ctaBar) return;

    // 受付中の大会を検索
    const openTours = data.filter(t => t.status === 'open');
    let targetTour = null;

    if (openTours.length > 0) {
        // 締切昇順でソート
        openTours.sort((a, b) => {
            const tA = a.entryEnd ? new Date(a.entryEnd).getTime() : 9999999999999;
            const tB = b.entryEnd ? new Date(b.entryEnd).getTime() : 9999999999999;
            return tA - tB;
        });
        targetTour = openTours[0];
    }

    if (targetTour) {
        let periodStr = '';
        if (targetTour.entryEnd) {
            const d = new Date(targetTour.entryEnd);
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const hours = ('0' + d.getHours()).slice(-2);
            const mins = ('0' + d.getMinutes()).slice(-2);
            periodStr = `~${m}/${day} <span style="font-size:0.85em">(${hours}:${mins})</span>`;
        }

        ctaBar.innerHTML = `
            <div class="u-flex u-justify-between u-items-center u-mb-5">
                <span class="u-font-bold u-text-primary">エントリー受付中</span>
                <span class="u-text-sm u-text-red u-font-bold">${periodStr}</span>
            </div>
            <div class="u-text-sm u-mb-10">${targetTour.name}</div>
            <a href="entry.html?id=${targetTour.id}" class="btn-cta">エントリー</a>
        `;
        checkCtaVisibility(); // 初期チェック
    } else {
        ctaBar.classList.add('hidden'); // データなし -> 非表示
    }
}


// 表示確認関数
function checkCtaVisibility() {
    const ctaBar = document.getElementById('ctaBar');
    if (!ctaBar || ctaBar.innerHTML.trim() === "") return;

    const scrollY = window.scrollY;
    const winHeight = window.innerHeight;
    const docHeight = document.body.scrollHeight;

    // 上部で隠す (最初の500px)
    if (scrollY < 500) {
        ctaBar.classList.add('hidden');
        return;
    }
    
    // 下部で隠す (フッター付近)
    if ((scrollY + winHeight) >= (docHeight - 100)) {
        ctaBar.classList.add('hidden');
        return;
    }

    // 表示
    ctaBar.classList.remove('hidden');
}


// 開始時にロード
loadTournaments();
loadIndexNews();

async function loadIndexNews() {
    const newsList = document.getElementById('newsList');
    const heroNewsContainer = document.getElementById('heroNewsContainer');

    try {
        const q = query(collection(db, "news"), orderBy("date", "desc"), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            if (newsList) newsList.innerHTML = '<div style="padding:20px; text-align:center; color:#a0aec0;">お知らせはありません</div>';
        }
        
        const news = snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // ヒーローニュース (最新1件)
        const latest = news[0];
        if (latest && heroNewsContainer) {
            let badgeClass = 'badge-info';
            let badgeText = 'News';
            if (latest.type === 'tournament') { badgeClass = 'status-upcoming'; badgeText = '大会情報'; }
            else if (latest.badge === 'important') { badgeClass = 'badge-important'; badgeText = '重要'; }
            else if (latest.badge === 'recruit') { badgeClass = 'badge-recruit'; badgeText = '募集'; }
            else if (latest.badge === 'penalty') { badgeClass = 'badge-important'; badgeText = 'Penalty'; }

            heroNewsContainer.innerHTML = `
            <a href="news_detail.html?id=${latest.id}" class="news-card-hero">
                <span class="badge-news-hero">${badgeText}</span>
                <span style="color:#cbd5e0; font-family:var(--f-eng); font-size:0.85rem;">${latest.date.replace(/-/g, '.')}</span>
                <span class="news-hero-title">${latest.title}</span>
            </a>
            `;
        }

        // リスト
        if (newsList && news.length > 0) {
            let html = '';
            news.forEach(n => {
                let badgeClass = 'badge-info';
                let badgeText = 'お知らせ';

                if (n.type === 'tournament') { badgeClass = 'status-upcoming'; badgeText = '大会情報'; }
                else if (n.badge === 'important') { badgeClass = 'badge-important'; badgeText = '重要'; }
                else if (n.badge === 'recruit') { badgeClass = 'badge-recruit'; badgeText = '募集'; }
                else if (n.badge === 'penalty') { badgeClass = 'badge-important'; badgeText = 'ペナルティ'; }

                html += `
                <a href="news_detail.html?id=${n.id}" class="news-item">
                    <div class="news-meta">
                        <span class="news-date">${n.date.replace(/-/g, '.')}</span>
                        <span class="news-cat ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="news-item-title">${n.title}</div>
                </a>
                `;
            });
            newsList.innerHTML = html;
        }

    } catch (e) { console.error('News load error', e); }
}

// モバイルメニューロジック
const hamBtn = document.getElementById('hamBtn');
const mobMenu = document.getElementById('mobMenu');
const closeMob = document.getElementById('closeMob');

if (hamBtn && mobMenu && closeMob) {
    hamBtn.addEventListener('click', () => {
        mobMenu.classList.add('is-active');
    });
    closeMob.addEventListener('click', () => {
        mobMenu.classList.remove('is-active');
    });
    // リンククリックで閉じる
    mobMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobMenu.classList.remove('is-active');
        });
    });
}

// スクロールイベント
window.addEventListener('scroll', checkCtaVisibility);
