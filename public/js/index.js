import { db } from "./common.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadTournaments() {
    const list = document.getElementById('tourList');
    const loadEl = document.getElementById('tour-loading');

    // Timeline elements
    const timelineEl = document.getElementById('timelineList'); // if exists
    // Currently timeline is static in HTML, but we can dynamic it if needed.
    // For now, focusing on the "Latest Tournaments" grid.

    try {
        const q = query(collection(db, "tournaments"), orderBy("eventDate", "desc"), limit(6));
        const snapshot = await getDocs(q);
        const tours = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (tours.length === 0) {
            list.innerHTML = '<div style="text-align:center; width:100%; padding:40px;">現在表示できる大会情報はありません。</div>';
            loadEl.style.display = 'none';
            return;
        }

        let html = '';
        tours.forEach(t => {
            let statusBadge = '';
            let statusLabel = '';
            if (t.status === 'open') {
                statusBadge = 'status-open';
                statusLabel = 'エントリー受付中';
            } else if (t.status === 'upcoming') {
                statusBadge = 'status-upcoming';
                statusLabel = '開催予定';
            } else {
                statusBadge = 'status-closed';
                statusLabel = '終了';
            }

            // Rules
            const ruleStr = (t.rules && Array.isArray(t.rules)) ? t.rules.join(' / ') : 'ルール未定';
            // Entry Type
            let entryTypeStr = '参加制限なし';
            if (t.entryType === 'circle_only') entryTypeStr = '同一サークル限定';
            else if (t.entryType === 'cross_ok') entryTypeStr = 'クロスサークルOK';
            else if (t.entryType === 'invite') entryTypeStr = '招待制/選抜';

            // Date formatting
            const d = t.eventDate ? new Date(t.eventDate) : null;
            const dateStr = d ? `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : '日程調整中';

            // Onclick action
            let onclick = "";
            if (t.status === 'closed') {
                // Open result modal
                //Pass necessary data JSON stringified? Or fetch on demand?
                // Let's attach data attributes and handle click
                // Storing data in a global map or simply embedding data attributes
                // NOTE: 't' object needs to be effectively serialized for the onclick or we attach event listeners later.
                // Using a global function with ID is easier.
            } else {
                // Go to detail page (entry.html or news detail)
                // For now, maybe just do nothing or link to generic entry if open
                if (t.status === 'open') {
                    onclick = `location.href='entry.html?id=${t.id}'`;
                }
            }

            // HTML Construction
            html += `
            <div class="tour-card" onclick="window.handleTourClick('${t.id}')">
                <div class="tour-status ${statusBadge}">${statusLabel}</div>
                <div class="tour-body">
                    <div>
                        <div class="tour-title">${t.name}</div>
                        <div class="tour-meta">
                            <div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <span class="${t.status !== 'closed' ? 'tour-date-stress' : ''}">${dateStr}</span>
                            </div>
                            <div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                <span>${entryTypeStr}</span>
                            </div>
                            <div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                <span>${ruleStr}</span>
                            </div>
                        </div>
                    </div>
                    ${t.status === 'open' ? `<div style="margin-top:10px; text-align:right;"><span class="tour-entry-stress">エントリー受付中 &rarr;</span></div>` : ''}
                    ${t.status === 'closed' ? `<div style="margin-top:10px; text-align:right; font-size:0.85rem; color:#718096; font-weight:bold;">結果を見る &rarr;</div>` : ''}
                </div>
            </div>
            `;
        });

        list.innerHTML = html;
        loadEl.style.display = 'none';

        // Store tournaments globally for modal
        window._tournamentsData = tours;

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="padding:20px; color:red;">読み込みエラー</div>';
        loadEl.style.display = 'none';
    }
}

// Global handler
window.handleTourClick = (id) => {
    const t = window._tournamentsData.find(x => x.id === id);
    if (!t) return;

    if (t.status === 'closed') {
        openResModal(t);
    } else if (t.status === 'open') {
        // Navigate to entry?
        // Since we don't have dynamic entry page yet, maybe just alert or go to news
        location.href = 'news.html'; // Or specific news/entry page
    } else {
        // Upcoming
        // Maybe go to news
        location.href = 'news.html';
    }
};

window.openResModal = (t) => {
    const modal = document.getElementById('resModal');
    // Set data
    const w = t.winner || {};

    document.getElementById('resImg').src = w.image || ''; // Fallback image?
    if (!w.image) document.getElementById('resImg').style.display = 'none';
    else document.getElementById('resImg').style.display = 'block';

    document.getElementById('resTeam').textContent = w.teamName || 'Team Name';
    document.getElementById('resAff').textContent = `${w.univ || ''} ${w.circle || ''}`;

    // Members
    const memArea = document.getElementById('resMembers');
    memArea.innerHTML = '';
    if (w.members && Array.isArray(w.members)) {
        w.members.forEach(m => {
            if (m) memArea.innerHTML += `<span class="res-mem-pill">${m}</span>`;
        });
    }

    // Cast Area
    const castArea = document.getElementById('resCastArea');
    let castHtml = '';

    // Caster
    if (t.caster && t.caster.name) {
        const icon = t.caster.icon ? `<img src="${t.caster.icon}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : '<div style="width:32px;height:32px;background:#edf2f7;border-radius:50%;"></div>';

        let links = '';
        if (t.caster.x) links += `<a href="https://twitter.com/${t.caster.x.replace('@', '')}" target="_blank" class="cast-link-btn"><svg width="14" height="14"><use href="#icon-x"/></svg></a>`;
        if (t.caster.yt) links += `<a href="${t.caster.yt}" target="_blank" class="cast-link-btn"><svg width="16" height="16"><use href="#icon-yt"/></svg></a>`;

        castHtml += `
        <div class="cast-card">
            <div class="cast-info">
                ${icon}
                <div><span class="cast-role">実況</span> <span class="cast-name">${t.caster.name}</span></div>
            </div>
            <div class="cast-links">${links}</div>
        </div>`;
    }
    // Commentator
    if (t.commentator && t.commentator.name) {
        const icon = t.commentator.icon ? `<img src="${t.commentator.icon}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : '<div style="width:32px;height:32px;background:#edf2f7;border-radius:50%;"></div>';

        let links = '';
        if (t.commentator.x) links += `<a href="https://twitter.com/${t.commentator.x.replace('@', '')}" target="_blank" class="cast-link-btn"><svg width="14" height="14"><use href="#icon-x"/></svg></a>`;
        if (t.commentator.yt) links += `<a href="${t.commentator.yt}" target="_blank" class="cast-link-btn"><svg width="16" height="16"><use href="#icon-yt"/></svg></a>`;

        castHtml += `
        <div class="cast-card">
            <div class="cast-info">
                ${icon}
                <div><span class="cast-role">解説</span> <span class="cast-name">${t.commentator.name}</span></div>
            </div>
            <div class="cast-links">${links}</div>
        </div>`;
    }

    // Operator
    if (t.operator) {
        castHtml += `<div style="margin-bottom:5px; font-size:0.9rem; margin-top:10px;"><strong>配信:</strong> ${t.operator}</div>`;
    }

    // License
    if (t.license) {
        castHtml += `<div style="font-size:0.75rem; color:#a0aec0;">許諾番号: ${t.license}</div>`;
    }

    castArea.innerHTML = castHtml;

    // Buttons: Archive & Post
    const archiveBtn = document.getElementById('resArchiveBtn');
    if (t.archiveUrl) {
        archiveBtn.href = t.archiveUrl;
        archiveBtn.style.display = 'block';
    } else {
        archiveBtn.style.display = 'none';
    }

    const linkBtn = document.getElementById('resLink');
    if (w.url) {
        linkBtn.href = w.url;
        linkBtn.innerText = '優勝ポストを見る'; // Text Update
        linkBtn.style.display = 'block';
    } else {
        linkBtn.style.display = 'none';
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
};

window.closeResModal = () => {
    const modal = document.getElementById('resModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};
document.getElementById('resModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('resModal')) window.closeResModal();
});

// Load on start
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
            return;
        }

        const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Hero News (Latest 1)
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

        // List
        if (newsList) {
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
