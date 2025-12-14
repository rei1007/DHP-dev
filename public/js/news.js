import { db } from "./common.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadAllNews() {
    const listEl = document.getElementById('nList');
    if (!listEl) return;

    // 可能であればcommonのスピナーを使用、とりあえず単純なテキストで
    listEl.innerHTML = '<div style="padding:40px; text-align:center; color:#718096;">Loading...</div>';

    try {
        const q = query(collection(db, "news"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (newsData.length === 0) {
            listEl.innerHTML = '<div style="padding:40px; text-align:center; color:#718096;">お知らせはありません</div>';
            return;
        }

        let html = '';
        newsData.forEach(n => {
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
        listEl.innerHTML = html;

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<div style="padding:40px; text-align:center; color:#e53e3e;">読み込みエラーが発生しました</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadAllNews);
