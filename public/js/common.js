import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCaVNHlJBoWcn9BQd7jPFtELxsOLHCZdv0",
    authDomain: "daigakuhai.firebaseapp.com",
    projectId: "daigakuhai",
    storageBucket: "daigakuhai.firebasestorage.app",
    messagingSenderId: "1003642519018",
    appId: "1:1003642519018:web:2700931b9f1c451ec74693"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function parseMarkdown(text) {
    if (!text) return '';
    // Nested logic: Bold/Italic first, then Link, then List?
    // Regex is tricky for nested. Alternative:
    // 1. Headers
    // 2. Bold/Italic/Underline/Strike
    // 3. Links (allow tags inside text part)
    // 4. List
    // 5. Newline

    let html = text
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/__(.*?)__/gim, '<u>$1</u>')
        .replace(/~~(.*?)~~/gim, '<s>$1</s>')
        // Link: [text](time) -> Allow tags in text part. Non-greedy match for text `(.*?)`
        .replace(/\[(.*?)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
    
    return html;
}

// ローディング＆スクロールアニメーションロジック
document.addEventListener('DOMContentLoaded', () => {
    // 1. ローディング
    // セッションでの初回訪問、またはリロード時のみ表示
    const isSessionVisited = sessionStorage.getItem('dhp_visited');
    const navEntry = performance.getEntriesByType("navigation")[0];
    const isReload = navEntry && navEntry.type === 'reload';

    if (!isSessionVisited || isReload) {
        sessionStorage.setItem('dhp_visited', 'true');

        // オーバーレイが存在するか確認し、なければ作成（自動挿入）
        if (!document.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.classList.add('loading-overlay');
            overlay.innerHTML = '<div class="ink-spinner"></div>';
            document.body.appendChild(overlay);
            
            // window load後に確実に隠す
            window.addEventListener('load', () => {
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    // DOMから削除するか、単に非表示にする
                     setTimeout(() => overlay.style.display = 'none', 600);
                }, 800); 
            });
            // フォールバック
            setTimeout(() => {
                overlay.classList.add('hidden');
                setTimeout(() => overlay.style.display = 'none', 600);
            }, 3000);
        }
    } else {
        // 表示しない場合は、万が一HTMLにある場合隠す
        const existing = document.querySelector('.loading-overlay');
        if(existing) existing.style.display = 'none';
    }

    // 2. スクロールフェードアップ
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});

// 共通モーダルロジック
// 共通モーダルロジック: グローバル関数定義 (モジュールロード時に即時定義)
window.openResModal = (t) => {
    const modal = document.getElementById('resModal');
    if (!modal) {
        console.error("Result Modal element not found!");
        return;
    }
    
    // データがない場合の安全策
    if(!t) {
        console.error("openResModal called with no data");
        return;
    }
    
    const w = t.winner || {};

    // 画像
    const imgArea = document.getElementById('resImgArea');
    const imgEl = document.getElementById('resImg'); // imgタグが存在するか確認
    if (w.image) {
        if (imgEl) { imgEl.src = w.image; imgEl.style.display = 'block'; }
        else if (imgArea) imgArea.innerHTML = `<img src="${w.image}" alt="Winner">`;
    } else {
        if (imgEl) imgEl.style.display = 'none';
        else if (imgArea) imgArea.innerHTML = '<span>No Image</span>';
    }

    // チーム名
    const teamEl = document.getElementById('resTeam');
    if (teamEl) teamEl.textContent = w.teamName || 'Team Name';
    
    // クロスサークル / 大学
    const univBox = modal.querySelector('.res-univ-info');
    if (univBox) {
        let univs = (w.univ || '').split(/\s*\/\s*/).filter(s => s);
        let circles = (w.circle || '').split(/\s*\/\s*/).filter(s => s);

        if (w.univ2 && univs.length === 1) univs.push(w.univ2);
        if (w.circle2 && circles.length === 1) circles.push(w.circle2);
        
        if (univs.length > 1 || circles.length > 1) {
            let html = '';
            const max = Math.max(univs.length, circles.length);
            for(let i=0; i<max; i++) {
                const u = univs[i] || '';
                const c = circles[i] || '';
                html += `<div style="margin-top:6px; font-size:1.1rem; color:#2d3748;">
                            <span>${u}</span>
                            <span style="opacity:0.4; margin:0 8px; font-weight:300;">|</span> 
                            <span>${c}</span>
                         </div>`;
            }
            univBox.innerHTML = html;
        } else {
            univBox.innerHTML = `<span style="font-size:1.2rem; margin-right:5px;">${w.univ || '-'}</span> 
                                 <span style="opacity:0.4; font-weight:300;">|</span> 
                                 <span style="font-size:1.2rem; margin-left:5px;">${w.circle || '-'}</span>`;
        }
    }

    // メンバー
    const memArea = document.getElementById('resMembers');
    if (memArea) {
        memArea.innerHTML = '';
        if (w.members && Array.isArray(w.members)) {
            w.members.forEach(m => {
                if (m) memArea.innerHTML += `<span class="res-mem-pill">${m}</span>`;
            });
        }
    }

    // キャストエリア
    const castArea = document.getElementById('resCastArea');
    if (castArea) {
        let castHtml = '';
        // キャストカード用ヘルパー
        const renderCast = (role, p) => {
            if(!p || !p.name) return '';
            const icon = p.icon ? `<img src="${p.icon}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : '<div style="width:32px;height:32px;background:#edf2f7;border-radius:50%;"></div>';
            let links = '';
            if(p.x) links += `<a href="https://twitter.com/${p.x.replace('@','')}" target="_blank" class="cast-link-btn"><svg width="14" height="14"><use href="#icon-x"/></svg></a>`;
            if(p.yt) links += `<a href="${p.yt}" target="_blank" class="cast-link-btn"><svg width="16" height="16"><use href="#icon-yt"/></svg></a>`;
            return `<div class="cast-card"><div class="cast-info">${icon}<div><span class="cast-role">${role}</span> <span class="cast-name">${p.name}</span></div></div><div class="cast-links">${links}</div></div>`;
        };

        if (t.caster && t.caster.name) castHtml += renderCast('実況', t.caster);
        if (t.commentator && t.commentator.name) castHtml += renderCast('解説', t.commentator);

        if (t.operator) castHtml += `<div style="margin-bottom:5px; font-size:0.9rem; margin-top:10px;"><strong>配信:</strong> ${t.operator}</div>`;
        if (t.license) castHtml += `<div style="font-size:0.75rem; color:#a0aec0;">許諾番号: ${t.license}</div>`;

        castArea.innerHTML = castHtml;
    }

    // ボタン
    const archiveBtn = document.getElementById('resArchiveBtn');
    if (archiveBtn) {
        archiveBtn.className = 'btn-res-rich btn-res-archive';
        if (t.archiveUrl) {
            archiveBtn.href = t.archiveUrl;
            archiveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> 配信アーカイブを見る';
            archiveBtn.style.display = 'flex';
        } else {
            archiveBtn.style.display = 'none';
        }
    }

    const linkBtn = document.getElementById('resLink');
    if (linkBtn) {
        linkBtn.className = 'btn-res-rich btn-res-post';
        if (w.url) {
            linkBtn.href = w.url;
            linkBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> 優勝ポストを見る';
            linkBtn.style.display = 'flex';
        } else {
            linkBtn.style.display = 'none';
        }
    }

    modal.classList.add('active');
};

window.closeResModal = () => {
    const modal = document.getElementById('resModal');
    if (modal) modal.classList.remove('active');
};

// 大会カードクリックのグローバルハンドラ
window.handleTourClick = (id) => {
    // 呼び出し元で window._tournamentsData を設定する必要がある
    console.log("Clicked tour id:", id);

    if (!window._tournamentsData) {
        console.error("Window tournaments data not found");
        return;
    }
    const t = window._tournamentsData.find(x => x.id === id);
    if (!t) {
        console.error("Tournament not found in data for id:", id);
        return;
    }
    console.log("Tournament Found:", t);

    // ロジック
    // ステータス: open -> entry.html
    // closed -> modal
    // upcoming -> news.html (or alert?)
    
    if (t.status === 'closed') {
        window.openResModal(t);
    } else if (t.status === 'open') {
        console.log("Navigating to entry...");
        location.href = `entry.html?id=${t.id}`; 
    } else {
        // upcoming or others
        console.log("Navigating to news...");
        location.href = 'news.html'; // または 'tournaments.html' etc
    }
};

export function setupResModal() {
    // 外部クリックで閉じるリスナーの登録のみ
    const m = document.getElementById('resModal');
    if (m) {
        m.addEventListener('click', (e) => {
            if (e.target === m) window.closeResModal();
        });
    }
}

export function generateTourCard(t) {
    let statusBadge = '';
    let statusLabel = '';
    if (t.status === 'open') { statusBadge = 'status-open'; statusLabel = 'エントリー受付中'; }
    else if (t.status === 'upcoming') { statusBadge = 'status-upcoming'; statusLabel = '開催予定'; }
    else { statusBadge = 'status-closed'; statusLabel = '終了'; }

    const ruleStr = (t.rules && Array.isArray(t.rules)) ? t.rules.join(' / ') : 'ルール未定';
    let entryTypeStr = '参加制限なし';
    if (t.entryType === 'circle_only') entryTypeStr = '同一サークル限定';
    else if (t.entryType === 'cross_ok') entryTypeStr = 'クロスサークルOK';
    else if (t.entryType === 'invite') entryTypeStr = 'サークル選抜';

    const d = t.eventDate ? new Date(t.eventDate) : null;
    const dateStr = d ? `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : '日程調整中';
    const dateClass = (d && t.status !== 'closed') ? 'tour-date-stress' : '';

    let castInfoHtml = '';
    if (t.caster && t.caster.name) castInfoHtml += `<div class="cast-line"><span class="cast-label">実況</span> ${t.caster.name}</div>`;
    if (t.commentator && t.commentator.name) castInfoHtml += `<div class="cast-line mt-2"><span class="cast-label">解説</span> ${t.commentator.name}</div>`;

    let cursorStyle = "";
    if (t.status === 'closed' || t.status === 'open' || t.status === 'upcoming') cursorStyle = "cursor:pointer;";

    return `
    <div class="tour-card" onclick="window.handleTourClick('${t.id}')" style="${cursorStyle}">
        <div class="tour-status ${statusBadge}">${statusLabel}</div>
        <div class="tour-body">
            <div>
                <div class="tour-title">${t.name}</div>
                <div class="tour-meta">
                    <div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span class="${dateClass}">${dateStr}</span>
                    </div>
                    <div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>${entryTypeStr}</span>
                    </div>
                    <div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        <span>${ruleStr}</span>
                    </div>
                    ${castInfoHtml}
                </div>
            </div>
            ${t.status === 'open' ? `<div class="tour-entry-stress">エントリー受付中 &rarr;</div>` : ''}
            ${t.status === 'closed' ? `<div class="tour-result-link">結果を見る &rarr;</div>` : ''}
        </div>
    </div>
    `;
}

