import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Config ---
const SUPABASE_URL = 'https://cbhfbykyymwhlrnoykvp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaGZieWt5eW13aGxybm95a3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTg3NDIsImV4cCI6MjA4MTEzNDc0Mn0.mNv-zBLRk2XdFs81GMWysH4ooE2V18wJWnD-BFqNtVg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// --- Utils ---
export function parseMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/__(.*?)__/gim, '<u>$1</u>')
        .replace(/~~(.*?)~~/gim, '<s>$1</s>')
        .replace(/\[(.*?)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
    return html;
}

// Loading & Scroll Logic
document.addEventListener('DOMContentLoaded', () => {
    const isSessionVisited = sessionStorage.getItem('dhp_visited');
    const navEntry = performance.getEntriesByType("navigation")[0];
    const isReload = navEntry && navEntry.type === 'reload';

    if (!isSessionVisited || isReload) {
        sessionStorage.setItem('dhp_visited', 'true');
        if (!document.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.classList.add('loading-overlay');
            overlay.innerHTML = '<div class="ink-spinner"></div>';
            document.body.appendChild(overlay);
            window.addEventListener('load', () => {
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    setTimeout(() => overlay.style.display = 'none', 600);
                }, 800); 
            });
            setTimeout(() => {
                overlay.classList.add('hidden');
                setTimeout(() => overlay.style.display = 'none', 600);
            }, 3000);
        }
    } else {
        const existing = document.querySelector('.loading-overlay');
        if(existing) existing.style.display = 'none';
    }

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

// Result Modal Logic
window.openResModal = (t) => {
    const modal = document.getElementById('resModal');
    if (!modal || !t) return;
    
    // Normalize Properties (Camel or Snake)
    const winner = t.winner || {}; // If structured JSON
    // However, in Supabase flat table, properties might be flattened like win_team, win_univ
    // Let's assume t has flattened properties from DB if loaded from index.js
    // OR constructed object. I'll handle both.
    
    // Values
    const winTeam = t.win_team || t.winTeam || winner.teamName;
    const winImage = t.win_image || t.winImage || winner.image;
    const winUniv = t.win_univ || t.winUniv || winner.univ;
    const winCircle = t.win_circle || t.winCircle || winner.circle;
    const winUniv2 = t.win_univ2 || t.winUniv2 || winner.univ2;
    const winCircle2 = t.win_circle2 || t.winCircle2 || winner.circle2;
    const winUrl = t.win_url || t.winUrl || winner.url;
    
    const members = [];
    if(t.win_mem1 || t.winMem1) members.push(t.win_mem1 || t.winMem1);
    if(t.win_mem2 || t.winMem2) members.push(t.win_mem2 || t.winMem2);
    if(t.win_mem3 || t.winMem3) members.push(t.win_mem3 || t.winMem3);
    if(t.win_mem4 || t.winMem4) members.push(t.win_mem4 || t.winMem4);

    // Render Image
    const imgArea = document.getElementById('resImgArea');
    const imgEl = document.getElementById('resImg'); 
    if (winImage) {
        if (imgEl) { imgEl.src = winImage; imgEl.style.display = 'block'; }
        else if (imgArea) imgArea.innerHTML = `<img src="${winImage}" alt="Winner">`;
    } else {
        if (imgEl) imgEl.style.display = 'none';
        else if (imgArea) imgArea.innerHTML = '<span>No Image</span>';
    }

    // Team Name
    const teamEl = document.getElementById('resTeam');
    if (teamEl) teamEl.textContent = winTeam || 'Team Name';
    
    // Univ/Circle Info
    const univBox = modal.querySelector('.res-univ-info');
    if (univBox) {
        let univs = (winUniv || '').split(/\s*\/\s*/).filter(s => s);
        let circles = (winCircle || '').split(/\s*\/\s*/).filter(s => s);

        if (winUniv2 && univs.length === 1) univs.push(winUniv2);
        if (winCircle2 && circles.length === 1) circles.push(winCircle2);
        
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
            univBox.innerHTML = `<span style="font-size:1.2rem; margin-right:5px;">${winUniv || '-'}</span> 
                                 <span style="opacity:0.4; font-weight:300;">|</span> 
                                 <span style="font-size:1.2rem; margin-left:5px;">${winCircle || '-'}</span>`;
        }
    }

    // Members
    const memArea = document.getElementById('resMembers');
    if (memArea) {
        memArea.innerHTML = '';
        members.forEach(m => {
            memArea.innerHTML += `<span class="res-mem-pill">${m}</span>`;
        });
    }

    // Cast Area
    const castArea = document.getElementById('resCastArea');
    if (castArea) {
        let castHtml = '';
        const renderCast = (role, name, icon, x, yt) => {
            if(!name) return '';
            const iconImg = icon ? `<img src="${icon}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : '<div style="width:32px;height:32px;background:#edf2f7;border-radius:50%;"></div>';
            let links = '';
            // If X/YT are full URLs or IDs, handle simply
            if(x) links += `<a href="${x.startsWith('http') ? x : 'https://twitter.com/'+x.replace('@','')}" target="_blank" class="cast-link-btn"><svg width="14" height="14"><use href="#icon-x"/></svg></a>`;
            if(yt) links += `<a href="${yt}" target="_blank" class="cast-link-btn"><svg width="16" height="16"><use href="#icon-yt"/></svg></a>`;
            return `<div class="cast-card"><div class="cast-info">${iconImg}<div><span class="cast-role">${role}</span> <span class="cast-name">${name}</span></div></div><div class="cast-links">${links}</div></div>`;
        };

        // Caster
        const cn = t.caster_name || t.casterName;
        const ci = t.caster_icon || t.casterIcon;
        const cx = t.caster_x || t.casterX;
        const cyt = t.caster_yt || t.casterYt;
        castHtml += renderCast('実況', cn, ci, cx, cyt);

        // Commentator
        const comn = t.com_name || t.comName;
        const comi = t.com_icon || t.comIcon;
        const comx = t.com_x || t.comX;
        const comyt = t.com_yt || t.comYt;
        castHtml += renderCast('解説', comn, comi, comx, comyt);

        const op = t.operator;
        const lic = t.license;
        if (op) castHtml += `<div style="margin-bottom:5px; font-size:0.9rem; margin-top:10px;"><strong>配信:</strong> ${op}</div>`;
        if (lic) castHtml += `<div style="font-size:0.75rem; color:#a0aec0;">許諾番号: ${lic}</div>`;

        castArea.innerHTML = castHtml;
    }

    // Buttons
    const archiveBtn = document.getElementById('resArchiveBtn');
    if (archiveBtn) {
        const aUrl = t.archive_url || t.archiveUrl;
        archiveBtn.className = 'btn-res-rich btn-res-archive';
        if (aUrl) {
            archiveBtn.href = aUrl;
            archiveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> 配信アーカイブを見る';
            archiveBtn.style.display = 'flex';
        } else {
            archiveBtn.style.display = 'none';
        }
    }

    const linkBtn = document.getElementById('resLink');
    if (linkBtn) {
        linkBtn.className = 'btn-res-rich btn-res-post';
        if (winUrl) {
            linkBtn.href = winUrl;
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

window.handleTourClick = (id) => {
    if (!window._tournamentsData) return;
    const t = window._tournamentsData.find(x => x.id == id); // Use == for string/int match
    if (!t) return;

    if (t.status === 'closed') {
        window.openResModal(t);
    } else if (t.status === 'open') {
        location.href = `entry.html?id=${t.id}`; 
    } else {
        location.href = 'news.html';
    }
};

export function setupResModal() {
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

    const rules = t.rules || [];
    const ruleStr = Array.isArray(rules) ? rules.join(' / ') : 'ルール未定';
    
    // Normalize EntryType
    const et = t.entry_type || t.entryType;
    let entryTypeStr = '参加制限なし';
    if (et === 'circle_only') entryTypeStr = '同一サークル限定';
    else if (et === 'cross_ok') entryTypeStr = 'クロスサークルOK';
    else if (et === 'invite') entryTypeStr = 'サークル選抜';

    // Normalize Date
    const dateVal = t.event_date || t.eventDate;
    const d = dateVal ? new Date(dateVal) : null;
    const dateStr = d ? `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : '日程調整中';
    const dateClass = (d && t.status !== 'closed') ? 'tour-date-stress' : '';

    // Normalize Cast
    const cName = t.caster_name || t.casterName;
    const comName = t.com_name || t.comName;

    let castInfoHtml = '';
    if (cName) castInfoHtml += `<div class="cast-line"><span class="cast-label">実況</span> ${cName}</div>`;
    if (comName) castInfoHtml += `<div class="cast-line mt-2"><span class="cast-label">解説</span> ${comName}</div>`;

    let cursorStyle = "cursor:pointer;";

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
