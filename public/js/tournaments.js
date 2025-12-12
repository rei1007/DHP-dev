import { db } from "./common.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const container = document.getElementById('tourListPage');

// CTA Bar import not needed here as this page might not have it or logic is different.
// However, reusing the card creation logic from index.js would be ideal.
// Since index.js logic is complex (handlers, specific HTML structure), let's replicate the sorting and card structure.

async function loadTournaments() {
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
            // secondary: eventDate desc
             const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
             const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
             return dB - dA;
        });

        let html = '';
        tours.forEach(t => {
            // Replicate Card Logic from index.js
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
            // Note: Since we are not in index.html, we might not have the result modal or same flow.
            // But User requested same design. 
            // For now, link to entry or news similarly.
            // If closed, linking to news/result might require modal present in tournaments.html or redirect.
            // For simplicity in list page, let's link to entry page or maybe nothing if closed?
            // index.js opens modal for closed. tournaments.html doesn't have modal markup?
            // Wait, tournaments.html DOES NOT have modal markup in previous step.
            // So I should just link to Entry page for Open/Upcoming.
            // For Closed, maybe do nothing or link to news if I can't show modal.
            // Or I can add modal to tournaments.html?
            // User requested "Design and Sort order". I will match visual design first.
            // I'll make the whole card clickable to entry.html if open/upcoming.
            
            let cursorStyle = "";
            let clickAction = "";
            if (t.status === 'open' || t.status === 'upcoming') {
                cursorStyle = "cursor:pointer;";
                clickAction = `onclick="location.href='entry.html?id=${t.id}'"`;
            }
            
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
                    ${t.status === 'closed' ? `<div style="margin-top:10px; text-align:right; font-size:0.85rem; color:#718096; font-weight:bold;">終了</div>` : ''}
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

loadTournaments();
