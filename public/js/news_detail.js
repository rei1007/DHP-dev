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
    // XP Bar or Label
    let xpDisplay = '';
    if (t.xpLimit === 'none' || !t.xpLimit) {
        xpDisplay = '<span style="background:#e2e8f0; color:#4a5568; padding:4px 8px; border-radius:4px; font-size:0.85rem;">XP制限なし</span>';
    } else {
        xpDisplay = `
        <div style="margin-top:10px; background:#f7fafc; padding:10px; border-radius:6px; border:1px solid #edf2f7;">
            <div style="font-weight:bold; color:#2d3748; margin-bottom:5px; font-size:0.9rem;">XP制限</div>
            <div style="display:flex; gap:15px; font-size:0.9rem;">
                <div><strong>平均:</strong> ${t.xpLimit.avg}以下</div>
                <div><strong>最高:</strong> ${t.xpLimit.max}以下</div>
            </div>
            <div style="width:100%; height:8px; background:#e2e8f0; border-radius:4px; margin-top:8px; overflow:hidden;">
                <div style="width:70%; height:100%; background:linear-gradient(90deg, #63b3ed 0%, #4299e1 100%);"></div>
            </div>
        </div>
        `;
    }

    // Cast Cards
    let castHtml = '';
    if (t.caster || t.commentator) {
        castHtml += '<div style="margin-top:20px; font-weight:bold; margin-bottom:10px; font-size:1.1rem; border-left:3px solid #b7791f; padding-left:10px;">実況・解説</div><div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:15px;">';
        
        if (t.caster && t.caster.name) {
            const icon = t.caster.icon ? `<img src="${t.caster.icon}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : '<div style="width:40px;height:40px;background:#edf2f7;border-radius:50%;"></div>';
            let links = '';
            if (t.caster.x) links += `<a href="https://twitter.com/${t.caster.x.replace('@', '')}" target="_blank" style="color:#1da1f2;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>`;
            if (t.caster.yt) links += `<a href="${t.caster.yt}" target="_blank" style="color:#ff0000;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg></a>`;
            
            castHtml += `
            <div style="background:white; border:1px solid #e2e8f0; padding:15px; border-radius:8px; display:flex; align-items:center; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                ${icon}
                <div style="flex:1;">
                    <div style="font-size:0.75rem; color:#718096; font-weight:bold; margin-bottom:2px;">実況</div>
                    <div style="font-weight:bold; color:#2d3748;">${t.caster.name}</div>
                </div>
                <div style="display:flex; gap:8px;">${links}</div>
            </div>`;
        }

        if (t.commentator && t.commentator.name) {
            const icon = t.commentator.icon ? `<img src="${t.commentator.icon}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : '<div style="width:40px;height:40px;background:#edf2f7;border-radius:50%;"></div>';
            let links = '';
            if (t.commentator.x) links += `<a href="https://twitter.com/${t.commentator.x.replace('@', '')}" target="_blank" style="color:#1da1f2;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>`;
            if (t.commentator.yt) links += `<a href="${t.commentator.yt}" target="_blank" style="color:#ff0000;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg></a>`;
            
            castHtml += `
            <div style="background:white; border:1px solid #e2e8f0; padding:15px; border-radius:8px; display:flex; align-items:center; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                ${icon}
                <div style="flex:1;">
                    <div style="font-size:0.75rem; color:#718096; font-weight:bold; margin-bottom:2px;">解説</div>
                    <div style="font-weight:bold; color:#2d3748;">${t.commentator.name}</div>
                </div>
                <div style="display:flex; gap:8px;">${links}</div>
            </div>`;
        }
        
        castHtml += '</div>';
    }

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
        ${xpDisplay}
        ${castHtml}
        <div style="margin-top:30px; line-height:1.7;">
            <p><strong>参加資格:</strong> ${t.entryType === 'circle_only' ? '同一サークル限定' : '制限なし'}</p>
            <p>詳細はエントリーページをご覧ください。</p>
        </div>
        <div class="btn-entry-area"><a href="entry.html?id=${tid}" class="btn-entry-lg">大会詳細・エントリー</a></div>
    </div>
    `;
    container.innerHTML = html;
}



loadDetail();
