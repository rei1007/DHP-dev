import { db } from "./common.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global state
let allTournaments = [];
let lastIsMobile = window.innerWidth < 768;

async function loadTournaments() {
    // List element
    const list = document.getElementById('tourList');
    if (!list) return;

    // Loading
    list.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:4rem;">Loading...</div>';

    try {
        const q = query(collection(db, "tournaments"), orderBy("eventDate", "desc"));
        const snapshot = await getDocs(q);
        allTournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Store globally for modal
        window._tournamentsData = allTournaments;

        // Render initially
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

    // Client-side Sort: Open -> Upcoming -> Closed
    const statusOrder = { 'open': 1, 'upcoming': 2, 'closed': 3 };
    
    // Sort all first
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
         // Mobile Logic: Max 3 items usually
         // Priority: Open > Upcoming > Closed
         // Constraint: Must show at least 1 Closed if possible?
         // User Rule: "エントリー中と開催予定、および終了大会最低1つは必ず表示...これらが3つを超えてしまう場合は...許容"
         
         const opens = sortedTours.filter(t => t.status === 'open');
         const upcomings = sortedTours.filter(t => t.status === 'upcoming');
         const closeds = sortedTours.filter(t => t.status === 'closed');
         
         // Base: All Open + All Upcoming
         let base = [...opens, ...upcomings];
         
         // Add 1 latest closed if exists
         if (closeds.length > 0) {
             base.push(closeds[0]);
         }
         
         if (base.length > 3) {
             // Exceeds 3 -> Show All of Base
             displayTours = base;
         } else {
             // Less than 3 -> Fill with more closed to reach 3
             displayTours = base;
             let needed = 3 - base.length;
             let nextClosedIndex = (closeds.length > 0) ? 1 : 0; // consumed index 0 already
             while(needed > 0 && nextClosedIndex < closeds.length) {
                 displayTours.push(closeds[nextClosedIndex]);
                 nextClosedIndex++;
                 needed--;
             }
         }
    } else {
        // PC: Strict limit 6
        displayTours = sortedTours.slice(0, 6);
    }
    
    // Re-sort displayTours to maintain order (Status > Date) after merging logic
    displayTours.sort((a, b) => {
        const sA = statusOrder[a.status] || 99;
        const sB = statusOrder[b.status] || 99;
        if (sA !== sB) return sA - sB;
        const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        return dB - dA;
    });

    // Generate HTML
    let html = '';
    displayTours.forEach(t => {
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
        else if (t.entryType === 'invite') entryTypeStr = 'サークル選抜';

        // Date
        const d = t.eventDate ? new Date(t.eventDate) : null;
        const dateStr = d ? `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}) ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` : '日程調整中';
        const dateClass = (d && t.status !== 'closed') ? 'tour-date-stress' : '';

        // Cast info
        let castInfoHtml = '';
        if (t.caster && t.caster.name) {
            castInfoHtml += `<div style="display:flex; align-items:center; gap:5px; font-size:0.85rem; color:#718096; margin-top:5px;"><span style="background:#edf2f7; padding:1px 5px; border-radius:3px; font-size:0.75rem;">実況</span> ${t.caster.name}</div>`;
        }
        if (t.commentator && t.commentator.name) {
            castInfoHtml += `<div style="display:flex; align-items:center; gap:5px; font-size:0.85rem; color:#718096; margin-top:2px;"><span style="background:#edf2f7; padding:1px 5px; border-radius:3px; font-size:0.75rem;">解説</span> ${t.commentator.name}</div>`;
        }

        // Onclick
        let onclick = "";
        let cursorStyle = "";
        if (t.status === 'closed') {
            cursorStyle = "cursor:pointer;";
        } else if (t.status === 'open' || t.status === 'upcoming') {
             cursorStyle = "cursor:pointer;";
        }

        html += `
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
                ${t.status === 'open' ? `<div style="margin-top:10px; text-align:right;"><span class="tour-entry-stress">エントリー受付中 &rarr;</span></div>` : ''}
                ${t.status === 'closed' ? `<div style="margin-top:10px; text-align:right; font-size:0.85rem; color:#718096; font-weight:bold;">結果を見る &rarr;</div>` : ''}
            </div>
        </div>
        `;
    });

    list.innerHTML = html;

    // Update CTA Bar
    updateCtaBar(displayTours);
}

// Resize listener
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile !== lastIsMobile) {
        lastIsMobile = isMobile;
        renderTourList();
    }
});

// CTA Bar Logic
function updateCtaBar(data) {
    const ctaBar = document.getElementById('ctaBar');
    if (!ctaBar) return;

    // Find Open tournaments
    const openTours = data.filter(t => t.status === 'open');
    let targetTour = null;

    if (openTours.length > 0) {
        // Sort by entryEnd ASC
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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-weight:700; color:var(--c-primary);">エントリー受付中</span>
                <span style="font-size:0.9rem; color:#e53e3e; font-weight:bold;">${periodStr}</span>
            </div>
            <div style="font-size:0.9rem; margin-bottom:10px;">${targetTour.name}</div>
            <a href="entry.html?id=${targetTour.id}" class="btn-cta">エントリー</a>
        `;
        // Do not remove hidden class here. Let checkCtaVisibility handle it based on scroll.
        checkCtaVisibility(); // Initial check
    } else {
        ctaBar.classList.add('hidden'); // No data -> Hide
        // Force hide style to be sure
        ctaBar.style.display = 'none';
    }
}


// Check Visibility Function
function checkCtaVisibility() {
    const ctaBar = document.getElementById('ctaBar');
    if (!ctaBar || ctaBar.innerHTML.trim() === "") return;

    const scrollY = window.scrollY;
    const winHeight = window.innerHeight;
    const docHeight = document.body.scrollHeight;

    // Hide at top (first 500px)
    if (scrollY < 500) {
        ctaBar.classList.add('hidden');
        return;
    }
    
    // Hide at bottom (near footer)
    if ((scrollY + winHeight) >= (docHeight - 100)) {
        ctaBar.classList.add('hidden');
        return;
    }

    // Show
    ctaBar.classList.remove('hidden');
}

// Global handler
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
    // Set data
    const w = t.winner || {};

    const imgArea = document.getElementById('resImgArea');
    // Revert to image tag usage in simpler way if needed, but current innerHTML approach is fine.
    // User asked to revert style, maybe structure too?
    // Previous code used simple img src assignment. Let's stick to current but ensure it fits index.html structure.
    // Wait, index.html structure might have changed in my mind vs reality.
    // Let's check if 'resImgArea' exists or 'resImg' tag exists.
    // In previous view_file of index.js (line 133), it used `document.getElementById('resImg').src`.
    // In my last write_to_file (Step 174), I changed it to `document.getElementById('resImgArea')`.
    // The USER asked to revert "Tournament card and result modal" design.
    // I should probably revert JS logic for modal population to match the 'reverted' HTML structure if I changed it.
    // But I didn't change HTML structure significantly, just JS.
    // Note: The HTML output in Step 166 didn't show modal HTML.
    // I will assume the JS logic I wrote in Step 174 is what they want REVERTED if it broke something or changed design.
    // But they said "design", mainly close button overlap.
    // I already fixed CSS for close button.
    
    // Let's keep the JS clean.
    if (w.image) {
        // Check if element exists
        const imgEl = document.getElementById('resImg');
        if(imgEl) {
             imgEl.src = w.image;
             imgEl.style.display = 'block';
        } else {
             // Fallback if I changed HTML to Area
             const area = document.getElementById('resImgArea');
             if(area) area.innerHTML = `<img src="${w.image}" alt="Winner">`;
        }
    } else {
        const imgEl = document.getElementById('resImg');
        if(imgEl) imgEl.style.display = 'none';
    }

    document.getElementById('resTeam').textContent = w.teamName || 'Team Name';
    document.getElementById('resUniv').textContent = w.univ || '-';
    document.getElementById('resCircle').textContent = w.circle || '-';

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
    // Check if container exists or create it
    let actionContainer = document.querySelector('.res-actions');
    if (!actionContainer) {
        // Find existing buttons if any and wrap them or replace logic
        // Previous logic targeted IDs: resArchiveBtn, resLink
        // Let's repurpose them or re-render
        // To be safe, let's look for a container 'res-actions' in HTML.
        // It might not exist if I didn't add it to HTML.
        // I should inject the buttons into a container in the modal.
        // The modal structure in HTML is: .res-header, .res-img-box, (members?), (cast?), (buttons?)
        // Let's append to .res-modal-content if not found.
    }
    
    // Easier: update the existing elements (Assuming they are <a id="..">) to have classes.
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
            // Even if empty, do not return if you want to proceed nicely
        }
        
        const news = snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

// Mobile Menu Logic
const hamBtn = document.getElementById('hamBtn');
const mobMenu = document.getElementById('mobMenu');
const closeMob = document.getElementById('closeMob');

if (hamBtn && mobMenu && closeMob) {
    hamBtn.addEventListener('click', () => {
        mobMenu.style.display = 'flex';
    });
    closeMob.addEventListener('click', () => {
        mobMenu.style.display = 'none';
    });
    // Close on link click
    mobMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobMenu.style.display = 'none';
        });
    });
}

// Scroll Event
window.addEventListener('scroll', checkCtaVisibility);
