import { db } from "./common.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Copied from index.js mostly
// Logic: Open -> Upcoming -> Closed
// Card styling matches index.js
// Modal functionality added

const container = document.getElementById('tourListPage');

// Global logic for Modal
window._tournamentsData = [];

async function loadTournaments() {
// ... same fetching ...
    try {
        const q = query(collection(db, "tournaments"), orderBy("eventDate", "desc"));
        const snap = await getDocs(q);
        
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;">大会情報はまだありません。</p>';
            return;
        }

        let tours = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side Sort: Open -> Upcoming -> Closed
        const statusOrder = { 'open': 1, 'upcoming': 2, 'closed': 3 };
        tours.sort((a, b) => {
            const sA = statusOrder[a.status] || 99;
            const sB = statusOrder[b.status] || 99;
            if (sA !== sB) return sA - sB;
             const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
             const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
             return dB - dA;
        });

        // Store for Modal
        window._tournamentsData = tours;

        let html = '';
        tours.forEach(t => {
            // ... Card HTML logic ...
            // Replicate Card Logic
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

            const ruleStr = (t.rules && Array.isArray(t.rules)) ? t.rules.join(' / ') : 'ルール未定';
            let entryTypeStr = '参加制限なし';
            if (t.entryType === 'circle_only') entryTypeStr = '同一サークル限定';
            else if (t.entryType === 'cross_ok') entryTypeStr = 'クロスサークルOK';
            else if (t.entryType === 'invite') entryTypeStr = 'サークル選抜';

            const d = t.eventDate ? new Date(t.eventDate) : null;
            const dateStr = d ? `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : '日程調整中';
            const dateClass = (d && t.status !== 'closed') ? 'tour-date-stress' : '';

            let castInfoHtml = '';
            if (t.caster && t.caster.name) {
                castInfoHtml += `<div style="display:flex; align-items:center; gap:5px; font-size:0.85rem; color:#718096; margin-top:5px;"><span style="background:#edf2f7; padding:1px 5px; border-radius:3px; font-size:0.75rem;">実況</span> ${t.caster.name}</div>`;
            }
            if (t.commentator && t.commentator.name) {
                castInfoHtml += `<div style="display:flex; align-items:center; gap:5px; font-size:0.85rem; color:#718096; margin-top:2px;"><span style="background:#edf2f7; padding:1px 5px; border-radius:3px; font-size:0.75rem;">解説</span> ${t.commentator.name}</div>`;
            }

            // Onclick logic
            let cursorStyle = "cursor:pointer;";
            // Use global handleTourClick
            let clickAction = `onclick="window.handleTourClick('${t.id}')"`;
            
            html += `
            <div class="tour-card" ${clickAction} style="${cursorStyle}">
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
                    ${t.status === 'open' ? `<div style="margin-top:10px; text-align:right;"><span class="tour-entry-stress">エントリー受付中 &rarr;</span></div>` : ''}
                    ${t.status === 'closed' ? `<div style="margin-top:10px; text-align:right; font-size:0.85rem; color:#718096; font-weight:bold;">結果を見る &rarr;</div>` : ''}
                </div>
            </div>
            `;
        });

        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; color:red;">読み込みエラーが発生しました。</p>';
    }
}

// Global handler matching index.js
window.handleTourClick = (id) => {
    const t = window._tournamentsData.find(x => x.id === id);
    if (!t) return;

    if (t.status === 'closed') {
        openResModal(t);
    } else if (t.status === 'open') {
        location.href = `entry.html?id=${t.id}`; 
    } else {
        location.href = 'news.html';
    }
};

window.openResModal = (t) => {
    const modal = document.getElementById('resModal');
    if (!modal) return;
    
    // Set data
    const w = t.winner || {};

    const imgArea = document.getElementById('resImgArea');
    if (w.image) {
         if(imgArea) imgArea.innerHTML = `<img src="${w.image}" alt="Winner">`;
    } else {
         if(imgArea) imgArea.innerHTML = '<span>No Image</span>';
    }

    document.getElementById('resTeam').textContent = w.teamName || 'Team Name';
    
    // Handle Cross-Circle Display
    const univBox = modal.querySelector('.res-univ-info');
    if (univBox) {
        // Use Regex split for safety against spacing differences
        const univs = (w.univ || '').split(/\s*\/\s*/).filter(s => s);
        const circles = (w.circle || '').split(/\s*\/\s*/).filter(s => s);
        
        if (univs.length > 1 || circles.length > 1) {
            // Multiple (Cross)
            let html = '';
            const max = Math.max(univs.length, circles.length);
            for(let i=0; i<max; i++) {
                const u = univs[i] || '';
                const c = circles[i] || '';
                // Add separator styling
                html += `<div style="margin-top:6px; font-size:1.1rem; color:#2d3748;">
                            <span>${u}</span>
                            <span style="opacity:0.4; margin:0 8px; font-weight:300;">|</span> 
                            <span>${c}</span>
                         </div>`;
            }
            univBox.innerHTML = html;
        } else {
            // Single
            univBox.innerHTML = `<span style="font-size:1.2rem; margin-right:5px;">${w.univ || '-'}</span> 
                                 <span style="opacity:0.4; font-weight:300;">|</span> 
                                 <span style="font-size:1.2rem; margin-left:5px;">${w.circle || '-'}</span>`;
        }
    }

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

    if (t.operator) castHtml += `<div style="margin-bottom:5px; font-size:0.9rem; margin-top:10px;"><strong>配信:</strong> ${t.operator}</div>`;
    if (t.license) castHtml += `<div style="font-size:0.75rem; color:#a0aec0;">許諾番号: ${t.license}</div>`;

    castArea.innerHTML = castHtml;

    // Buttons
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
    modal.style.display = 'flex';
};

window.closeResModal = () => {
    const modal = document.getElementById('resModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};
const m = document.getElementById('resModal');
if(m) {
    m.addEventListener('click', (e) => {
        if (e.target === m) window.closeResModal();
    });
}

loadTournaments();
