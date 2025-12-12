import { db, parseMarkdown } from "./common.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const container = document.getElementById('detailContent');
const loading = document.getElementById('loading');

async function loadDetail() {
    if (!id) {
        container.innerHTML = '<p style="text-align:center; padding:40px;">記事が見つかりません</p>';
        loading.style.display = 'none';
        return;
    }

    try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            render(data);
        } else {
            // Check if tournament
            const tourRef = doc(db, "tournaments", id);
            const tourSnap = await getDoc(tourRef);
            if (tourSnap.exists()) {
                const t = tourSnap.data();
                // Render Tournament as News
                renderTourAsNews(id, t);
            } else {
                container.innerHTML = '<p style="text-align:center; padding:40px;">記事が見つかりません</p>';
            }
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; padding:40px; color:red;">読み込みエラー</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function render(data) {
    let badgeClass = 'bg-gray-200 text-gray-700';
    let badgeText = 'お知らせ';

    // Badge Logic
    if (data.type === 'tournament') { badgeClass = 'status-upcoming'; badgeText = '大会情報'; } // status-upcoming has color
    else if (data.badge === 'important') { badgeClass = 'badge-important'; badgeText = '重要'; }
    else if (data.badge === 'recruit') { badgeClass = 'badge-recruit'; badgeText = '募集'; }
    else if (data.badge === 'penalty') { badgeClass = 'badge-important'; badgeText = 'Penalty'; }

    // Manually setting styles for badge spans since classes might be in CSS files we just linked
    // We reused 'news-cat' classes in index.html, let's try to map them or use inline styles for safety here or rely on global classes if we moved them to common.css?
    // The previously extracted common.css didn't have news badges.
    // However, news_detail.css doesn't seem to have badge classes either.
    // Let's use inline styles for badges or rely on generic utilities if they exist.
    // For now, I'll use inline styles mapped from badge type for simplicity and reliability.

    let badgeStyle = "background:#edf2f7; color:#4a5568;";
    if (data.type === 'tournament') badgeStyle = "background:#b7791f; color:white;";
    else if (data.badge === 'important' || data.badge === 'penalty') badgeStyle = "background:#e53e3e; color:white;";
    else if (data.badge === 'recruit') badgeStyle = "background:#38a169; color:white;";


    const html = `
    <div class="nd-header">
        <div class="nd-meta">
            <span class="nd-date">${data.date.replace(/-/g, '.')}</span>
            <span style="font-size:0.8rem; padding:4px 10px; border-radius:4px; font-weight:bold; ${badgeStyle}">${badgeText}</span>
        </div>
        <h1 class="nd-title">${data.title}</h1>
    </div>
    <div class="nd-content">
        ${parseMarkdown(data.body)}
        ${data.type === 'tournament' ? `<div class="btn-entry-area"><a href="entry.html?id=${id}" class="btn-entry-lg">大会詳細・エントリー</a></div>` : ''}
    </div>
    `;
    container.innerHTML = html;
}

function renderTourAsNews(tid, t) {
    // Determine status
    // ...
    // Just minimal render
    const html = `
    <div class="nd-header">
        <div class="nd-meta">
            <span class="nd-date">${t.updatedAt ? t.updatedAt.split('T')[0].replace(/-/g, '.') : '-'}</span>
            <span style="font-size:0.8rem; padding:4px 10px; border-radius:4px; font-weight:bold; background:#b7791f; color:white;">大会情報</span>
        </div>
        <h1 class="nd-title">【大会告知】${t.name}</h1>
    </div>
    <div class="nd-content">
        <p><strong>開催日:</strong> ${t.eventDate ? new Date(t.eventDate).toLocaleDateString() : '未定'}</p>
        <p><strong>ルール:</strong> ${t.rules ? t.rules.join('/') : '-'}</p>
        <p>詳細はエントリーページをご覧ください。</p>
        <div class="btn-entry-area"><a href="entry.html?id=${tid}" class="btn-entry-lg">大会詳細・エントリー</a></div>
    </div>
    `;
    container.innerHTML = html;
}



loadDetail();
