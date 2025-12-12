import { db } from "./common.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const container = document.getElementById('tourListPage');

async function loadTournaments() {
    try {
        const q = query(collection(db, "tournaments"), orderBy("eventDate", "desc"));
        const snap = await getDocs(q);

        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;">大会情報はまだありません。</p>';
            return;
        }

        snap.forEach(doc => {
            const t = doc.data();
            const id = doc.id;
            const el = createTourCard(id, t);
            container.appendChild(el);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; color:red;">読み込みエラーが発生しました。</p>';
    }
}

function createTourCard(id, t) {
    const card = document.createElement('div');
    card.className = 'tour-card';
    
    // Status Logic
    let statusText = '開催前';
    let statusClass = 'status-upcoming';
    if(t.status === 'open') { statusText = 'エントリー受付中'; statusClass = 'status-open'; }
    else if(t.status === 'closed') { statusText = '終了'; statusClass = 'status-closed'; }

    // Date
    const d = t.eventDate ? new Date(t.eventDate) : null;
    const dateStr = d ? `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}` : '未定';
    
    // Entry Type
    let entryStr = '参加制限なし';
    if(t.entryType === 'circle_only') entryStr = '同一サークル限定';
    if(t.entryType === 'cross_ok') entryStr = 'クロスサークルOK';
    if(t.entryType === 'invite') entryStr = 'サークル選抜';

    card.innerHTML = `
        <div class="tour-status ${statusClass}">${statusText}</div>
        <div class="tour-body">
            <div>
                <h3 class="tour-title">${t.name}</h3>
                <div class="tour-meta">
                    <div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${dateStr}
                    </div>
                    <div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        ${entryStr}
                    </div>
                </div>
            </div>
            <div style="text-align:right;">
                <span style="font-size:0.9rem; font-weight:bold; color:var(--c-primary);">詳細を見る &rarr;</span>
            </div>
        </div>
        <a href="entry.html?id=${id}" style="position:absolute; inset:0;"></a>
    `;
    return card;
}

loadTournaments();
