import { db } from "./common.js";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let newsData = [];

async function loadAllNews() {
    const listEl = document.getElementById('nList');
    try {
        const q = query(collection(db, "news"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (newsData.length === 0) {
            listEl.innerHTML = '<div class="loader">お知らせはありません</div>';
            return;
        }

        let html = '';
        newsData.forEach(n => {
            let badgeClass = 'info';
            let badgeText = 'お知らせ';

            if (n.type === 'tournament') { badgeClass = 'tour'; badgeText = '大会情報'; }
            else if (n.badge === 'important') { badgeClass = 'important'; badgeText = '重要'; }
            else if (n.badge === 'recruit') { badgeClass = 'recruit'; badgeText = '募集'; }
            else if (n.badge === 'penalty') { badgeClass = 'important'; badgeText = 'ペナルティ'; }
            else { badgeClass = 'info'; badgeText = 'お知らせ'; }

            html += `
            <div class="n-item" onclick="location.href='news_detail.html?id=${n.id}'">
                <div class="n-meta">
                    <span class="n-date">${n.date.replace(/-/g, '.')}</span>
                    <span class="n-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="n-title">${n.title}</div>
            </div>
            `;
        });
        listEl.innerHTML = html;

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<div class="loader">読み込みエラーが発生しました</div>';
    }
}

loadAllNews();
