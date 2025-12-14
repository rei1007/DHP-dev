import { db } from "./common.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const colRef = collection(db, "tournaments");

// 定数
const RULES = ["ナワバリ", "エリア", "ヤグラ", "ホコ", "アサリ"];
const STAGES = [
    "ユノハナ大渓谷", "ゴンズイ地区", "ヤガラ市場", "マテガイ放水路", "ナメロウ金属",
    "マサバ海峡大橋", "キンメダイ美術館", "マヒマヒリゾート＆スパ", "海女美術大学", "チョウザメ造船",
    "ザトウマーケット", "スメーシーワールド", "クサヤ温泉", "ヒラメが丘団地", "ナンプラー遺跡",
    "マンタマリア号", "タラポートショッピングパーク", "コンブトラック", "タカアシ経済特区", "オヒョウ海運",
    "バイガイ亭", "ネギトロ炭鉱", "カジキ空港", "リュウグウターミナル", "デカライン高架下"
];

// グローバル関数への紐付け (モジュールスコープ対策)
window.proceedLogin = () => {
    localStorage.setItem('dhp_auth_ok', 'true');
    window.showDash();
};

window.showDash = () => {
    document.getElementById('loginView').classList.add('u-hidden');
    document.getElementById('dashView').classList.remove('u-hidden');
    loadData();
};

// UI初期化
const ruleGroup = document.getElementById('ruleGroup');
RULES.forEach(r => {
    const lbl = document.createElement('label');
    lbl.className = 'checkbox-label';
    lbl.innerHTML = `<input type="checkbox" name="rule" value="${r}"> ${r}`;
    ruleGroup.appendChild(lbl);
});

const stageGroup = document.getElementById('stageGroup');
STAGES.forEach(s => {
    const lbl = document.createElement('label');
    lbl.className = 'checkbox-label';
    lbl.innerHTML = `<input type="checkbox" name="stage" value="${s}"> ${s}`;
    stageGroup.appendChild(lbl);
});

// XP切替ロジック
const chkXpNone = document.getElementById('chkXpNone');
const xpInputs = document.getElementById('xpInputs');
chkXpNone.addEventListener('change', () => {
    if (chkXpNone.checked) {
        xpInputs.classList.add('u-disabled');
        document.getElementById('inpXpAvg').value = '';
        document.getElementById('inpXpMax').value = '';
    } else {
        xpInputs.classList.remove('u-disabled');
    }
});

// グローバル状態 & UI要素 (TDZ回避のため早期宣言)
let tournaments = [];
const tList = document.getElementById('tList');
const loader = document.getElementById('loader');

// ステータス計算
window.calcStatus = (force = false) => {
    const start = document.getElementById('inpEntryStart').value;
    const end = document.getElementById('inpEntryEnd').value;
    const statusEl = document.getElementById('inpStatus');

    if (!start || !end) return;

    const now = new Date();
    const sDate = new Date(start);
    const eDate = new Date(end);

    let newStatus = 'upcoming';
    if (now < sDate) {
        newStatus = 'upcoming';
    } else if (now >= sDate && now <= eDate) {
        newStatus = 'open';
    } else {
        newStatus = 'closed';
    }
    statusEl.value = newStatus;
};

// グローバルリスナー初期化 (即時実行)
// 認証ロジック (Discord)
const loginBtn = document.getElementById('btnLoginDiscord');
const loginMsg = document.getElementById('loginMsg');

// 1. ログインボタンクリック
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        loginBtn.disabled = true;
        loginBtn.textContent = '接続中...';
        try {
            // 生成された認証URLをAPIから取得 (クライアントID隠蔽のため)
            // または直接環境変数がフロントにないのでAPI経由が安全
            const res = await fetch('/api/discord');
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                loginMsg.textContent = '設定エラー: 認証URLが取得できません';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Discordでログイン';
            }
        } catch (e) {
            console.error(e);
            loginMsg.textContent = 'エラー: ' + e.message;
            // Fallback for local testing if API fails
            if (e.message.includes('Failed to fetch')) {
                 const pass = prompt("開発用パスワード(API接続不可):");
                 if(pass === 'admin1234') proceedLogin();
            }
            loginBtn.disabled = false;
            loginBtn.textContent = 'Discordでログイン';
        }
    });
}

// 2. コールバック処理 (URLに ?code=... がある場合)
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

if (code) {
    // 画面をローディング状態に
    if(loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = '認証中...';
    }
    
    // APIにコードを送信して検証
    fetch(`/api/discord?code=${code}`)
        .then(async (res) => {
            const data = await res.json();
            if (data.success) {
                // 成功
                localStorage.setItem('dhp_auth_ok', 'true');
                localStorage.setItem('dhp_user', JSON.stringify(data.user));
                // URLを綺麗にする
                window.history.replaceState({}, document.title, window.location.pathname);
                proceedLogin();
            } else {
                loginMsg.textContent = 'ログイン失敗: ' + (data.error || '不明なエラー');
                if(data.user) loginMsg.textContent += ` (ID: ${data.user.id})`;
                loginBtn.disabled = false;
                loginBtn.textContent = 'Discordでログイン';
            }
        })
        .catch(err => {
            console.error(err);
            loginMsg.textContent = '通信エラー';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Discordでログイン';
        });
}

// ステータス初期化
const storedAuth = localStorage.getItem('dhp_auth_ok');
if (storedAuth === 'true') { window.showDash(); }

// showDash and proceedLogin are defined globally above.

// データロジック
// tournaments, tList, loader は上部で宣言済み

async function loadData() {
    loader.classList.remove('u-hidden');
    tList.innerHTML = '';
    try {
        // 全件取得
        const q = query(colRef);
        const snapshot = await getDocs(q);
        tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // ソート: 受付中 -> 開催予定 -> 終了、その後に日付降順
        const statusOrder = { 'open': 1, 'upcoming': 2, 'closed': 3 };

        tournaments.sort((a, b) => {
            const sA = statusOrder[a.status] || 99;
            const sB = statusOrder[b.status] || 99;
            if (sA !== sB) return sA - sB;
            const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
            const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
            return dB - dA;
        });

        if (tournaments.length === 0) {
            tList.innerHTML = '<div style="padding:20px; text-align:center;">大会が見つかりません</div>';
        }

        tournaments.forEach(t => {
            const div = document.createElement('div');
            div.className = 't-item';

            let badgeClass = 'status-badge';
            let statusLabel = t.status;
            if (t.status === 'open') { badgeClass += ' status-open'; statusLabel = '受付中'; }
            else if (t.status === 'upcoming') { badgeClass += ' status-upcoming'; statusLabel = '予定'; }
            else { statusLabel = '終了'; }

            const dateStr = t.eventDate ? new Date(t.eventDate).toLocaleDateString() : '-';
            const rulesStr = (t.rules && Array.isArray(t.rules)) ? t.rules.join(' / ') : '-';

            div.innerHTML = `
                <div class="t-info">
                    <h3><span class="${badgeClass}">${statusLabel}</span> ${t.name}</h3>
                    <div class="t-status">開催: ${dateStr} | ルール: ${rulesStr}</div>
                </div>
                <div class="t-actions">
                    <button class="btn btn-sm" onclick="window.editItem('${t.id}')">編集</button>
                    <button class="btn btn-sm btn-red" onclick="window.deleteItem('${t.id}')">削除</button>
                </div>
            `;
            tList.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        tList.innerHTML = `<div style="color:red; padding:20px;">エラーが発生しました: ${error.message}</div>`;
    } finally {
        loader.classList.add('u-hidden');
        loadNews(); // ニュースも読み込む
    }
}

const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');

// クロスサークル切替
window.toggleCrossCircle = () => {
    const type = document.getElementById('inpEntryType').value;
    const grp = document.getElementById('grpWinDual');
    if (type === 'cross_ok') {
        grp.classList.remove('u-hidden');
    } else {
        grp.classList.add('u-hidden');
    }
};

window.editItem = (id) => {
    const t = tournaments.find(x => x.id === id);
    if (!t) return;
    document.getElementById('editId').value = t.id;
    document.getElementById('modalTitle').textContent = '大会情報の編集';

    document.getElementById('inpTourName').value = t.name || '';
    document.getElementById('inpStatus').value = t.status || 'upcoming';
    document.getElementById('inpEventDate').value = t.eventDate || '';
    document.getElementById('inpEntryStart').value = t.entryStart || '';
    document.getElementById('inpEntryEnd').value = t.entryEnd || '';
    document.getElementById('inpRulesUrl').value = t.rulesUrl || '';
    document.getElementById('inpSupportUrl').value = t.supportUrl || '';
    document.getElementById('inpEntryType').value = t.entryType || 'circle_only';
    
    // デュアル入力の切替
    window.toggleCrossCircle();

    // XP
    if (t.xpLimit === 'none' || !t.xpLimit) {
        chkXpNone.checked = true;
        xpInputs.classList.add('u-disabled');
        document.getElementById('inpXpAvg').value = '';
        document.getElementById('inpXpMax').value = '';
    } else {
        chkXpNone.checked = false;
        xpInputs.classList.remove('u-disabled');
        document.getElementById('inpXpAvg').value = t.xpLimit?.avg || '';
        document.getElementById('inpXpMax').value = t.xpLimit?.max || '';
    }

    // ルール
    document.querySelectorAll('input[name="rule"]').forEach(c => c.checked = false);
    if (t.rules && Array.isArray(t.rules)) {
        t.rules.forEach(r => {
            const el = document.querySelector(`input[name="rule"][value="${r}"]`);
            if (el) el.checked = true;
        });
    }

    // ステージ
    document.querySelectorAll('input[name="stage"]').forEach(c => c.checked = false);
    if (t.bannedStages && Array.isArray(t.bannedStages)) {
        t.bannedStages.forEach(s => {
            const el = document.querySelector(`input[name="stage"][value="${s}"]`);
            if (el) el.checked = true;
        });
    }

    // キャスト
    document.getElementById('inpCasterName').value = t.caster?.name || '';
    document.getElementById('inpCasterIcon').value = t.caster?.icon || '';
    document.getElementById('inpCasterX').value = t.caster?.x || '';
    document.getElementById('inpCasterYt').value = t.caster?.yt || '';

    document.getElementById('inpComName').value = t.commentator?.name || '';
    document.getElementById('inpComIcon').value = t.commentator?.icon || '';
    document.getElementById('inpComX').value = t.commentator?.x || '';
    document.getElementById('inpComYt').value = t.commentator?.yt || '';

    document.getElementById('inpOperator').value = t.operator || '';
    document.getElementById('inpLicense').value = t.license || '';
    document.getElementById('inpArchiveUrl').value = t.archiveUrl || '';

    // 優勝者
    document.getElementById('inpWinTeam').value = t.winner?.teamName || '';
    
    // 大学/サークル 1
    document.getElementById('inpWinUniv').value = t.winner?.univ || '';
    document.getElementById('inpWinCircle').value = t.winner?.circle || '';
    
    // 大学/サークル 2 (存在する場合)
    document.getElementById('inpWinUniv2').value = t.winner?.univ2 || '';
    document.getElementById('inpWinCircle2').value = t.winner?.circle2 || '';

    document.getElementById('inpWinImage').value = t.winner?.image || '';
    document.getElementById('inpWinUrl').value = t.winner?.url || '';

    const mems = t.winner?.members || [];
    document.getElementById('inpWinMem1').value = mems[0] || '';
    document.getElementById('inpWinMem2').value = mems[1] || '';
    document.getElementById('inpWinMem3').value = mems[2] || '';
    document.getElementById('inpWinMem4').value = mems[3] || '';

    modal.classList.add('is-active');
};

document.getElementById('btnNew').addEventListener('click', () => {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitle').textContent = '新規大会作成';
    editForm.reset();
    xpInputs.classList.remove('u-disabled');
    chkXpNone.checked = false;
    window.toggleCrossCircle(); // デュアル入力の表示リセット
    modal.classList.add('is-active');
});

document.getElementById('inpEntryType').addEventListener('change', window.toggleCrossCircle);

document.getElementById('btnCloseModal').addEventListener('click', () => modal.classList.remove('is-active'));

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loader.classList.remove('u-hidden');
    modal.classList.remove('is-active');

    try {
        const id = document.getElementById('editId').value;
        const rules = Array.from(document.querySelectorAll('input[name="rule"]:checked')).map(c => c.value);
        const stages = Array.from(document.querySelectorAll('input[name="stage"]:checked')).map(c => c.value);

        const xp = chkXpNone.checked ? 'none' : {
            avg: parseInt(document.getElementById('inpXpAvg').value) || 0,
            max: parseInt(document.getElementById('inpXpMax').value) || 0
        };

        // 優勝メンバー: 4つの入力を収集
        const winMems = [];
        for(let i=1; i<=4; i++) {
            const val = document.getElementById(`inpWinMem${i}`).value.trim();
            if(val) winMems.push(val);
        }

        const data = {
            name: document.getElementById('inpTourName').value,
            status: document.getElementById('inpStatus').value,
            eventDate: document.getElementById('inpEventDate').value,
            entryStart: document.getElementById('inpEntryStart').value,
            entryEnd: document.getElementById('inpEntryEnd').value,
            rulesUrl: document.getElementById('inpRulesUrl').value,
            supportUrl: document.getElementById('inpSupportUrl').value,
            entryType: document.getElementById('inpEntryType').value,
            xpLimit: xp,
            rules: rules,
            bannedStages: stages,
            caster: {
                name: document.getElementById('inpCasterName').value,
                icon: document.getElementById('inpCasterIcon').value,
                x: document.getElementById('inpCasterX').value,
                yt: document.getElementById('inpCasterYt').value
            },
            commentator: {
                name: document.getElementById('inpComName').value,
                icon: document.getElementById('inpComIcon').value,
                x: document.getElementById('inpComX').value,
                yt: document.getElementById('inpComYt').value
            },
            operator: document.getElementById('inpOperator').value,
            license: document.getElementById('inpLicense').value,
            archiveUrl: document.getElementById('inpArchiveUrl').value,
            winner: {
                teamName: document.getElementById('inpWinTeam').value,
                univ: document.getElementById('inpWinUniv').value,
                circle: document.getElementById('inpWinCircle').value,
                univ2: document.getElementById('inpWinUniv2').value,
                circle2: document.getElementById('inpWinCircle2').value,
                image: document.getElementById('inpWinImage').value,
                url: document.getElementById('inpWinUrl').value,
                members: winMems
            },
            updatedAt: new Date().toISOString()
        };

        if (id) {
            await updateDoc(doc(db, "tournaments", id), data);
        } else {
            await addDoc(colRef, data);
        }
        await loadData();

    } catch (err) {
        console.error(err);
        alert('エラーが発生しました: ' + err.message);
    } finally {
        loader.classList.add('u-hidden');
    }
});

window.deleteItem = async (id) => {
    if (!confirm('本当に削除しますか？')) return;
    loader.classList.remove('u-hidden');
    try {
        await deleteDoc(doc(db, "tournaments", id));
        await loadData();
    } catch (e) {
        console.error(e);
        alert('削除エラー');
    } finally {
        loader.classList.add('u-hidden');
    }
};


// --- ニュースロジック ---
const newsList = document.getElementById('nList');
let allNews = [];

document.getElementById('btnNewNews').addEventListener('click', () => {
    document.getElementById('newsForm').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('newsModalTitle').textContent = 'お知らせ作成';
    document.getElementById('newsTypeNormal').classList.remove('u-hidden'); 
    document.getElementById('newsTypeTour').classList.add('u-hidden');
    document.querySelector('input[name="newsType"][value="normal"]').checked = true;

    // 今日の日付を設定
    const d = new Date();
    document.getElementById('inpNewsDate').value = d.toISOString().split('T')[0];

    document.getElementById('newsModal').classList.add('is-active');
});

document.getElementById('btnCloseNewsModal').addEventListener('click', () => {
    document.getElementById('newsModal').classList.remove('is-active');
});

window.toggleNewsType = () => {
    const type = document.querySelector('input[name="newsType"]:checked').value;
    if (type === 'normal') {
        document.getElementById('newsTypeNormal').classList.remove('u-hidden');
        document.getElementById('newsTypeTour').classList.add('u-hidden');
    } else {
        document.getElementById('newsTypeNormal').classList.add('u-hidden');
        document.getElementById('newsTypeTour').classList.remove('u-hidden');
        loadTourSelect();
    }
}

async function loadTourSelect() {
    const sel = document.getElementById('inpNewsTourId');
    sel.innerHTML = '<option value="">大会を選択してください</option>';
    tournaments.forEach(t => {
        const op = document.createElement('option');
        op.value = t.id;
        op.textContent = t.name;
        sel.appendChild(op);
    });
}
window.generateDraft = () => {
    const tid = document.getElementById('inpNewsTourId').value;
    const t = tournaments.find(x => x.id === tid);
    if (!t) return;

    const titleEl = document.getElementById('inpNewsTitle');
    const bodyEl = document.getElementById('inpNewsBody');

    titleEl.value = `${t.name} 開催決定！`;
    const d = new Date(t.eventDate);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const entryStart = new Date(t.entryStart);
    const entryEnd = new Date(t.entryEnd);

    bodyEl.value = `
# ${t.name} を開催します

${t.name}の開催が決定しました。皆様の参加をお待ちしています！
    `.trim();
}

document.getElementById('newsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    loader.classList.remove('u-hidden');
    document.getElementById('newsModal').classList.remove('is-active');

    try {
        const id = document.getElementById('newsId').value;
        const type = document.querySelector('input[name="newsType"]:checked').value;
        const refTourId = type === 'tournament' ? document.getElementById('inpNewsTourId').value : null;
        let badge = 'info';

        if (type === 'tournament') badge = 'tour'; // もしくはtypeフィールドを使用
        else badge = document.getElementById('inpNewsBadge').value;

        const data = {
            title: document.getElementById('inpNewsTitle').value,
            date: document.getElementById('inpNewsDate').value,
            body: document.getElementById('inpNewsBody').value,
            type: type,
            badge: badge, // UIカラー用
            refTourId: refTourId,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            await updateDoc(doc(db, "news", id), data);
        } else {
            await addDoc(collection(db, "news"), data);
        }
        await loadNews();

    } catch (e) {
        console.error(e);
        alert('Error: ' + e.message);
    } finally {
        loader.classList.add('u-hidden');
    }
});

async function loadNews() {
    newsList.innerHTML = '';
    const q = query(collection(db, "news"), orderBy("date", "desc")); // 制限すべき?
    const snap = await getDocs(q);
    allNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    allNews.forEach(n => {
        const div = document.createElement('div');
        div.className = 't-item'; // 再利用
        let badgeClass = 'badge-info';
        let badgeText = 'お知らせ';

        if (n.type === 'tournament') { badgeClass = 'status-upcoming'; badgeText = '大会情報'; }
        else if (n.badge === 'important') { badgeClass = 'badge-important'; badgeText = '重要'; }
        else if (n.badge === 'recruit') { badgeClass = 'badge-recruit'; badgeText = '募集'; }
        else if (n.badge === 'penalty') { badgeClass = 'badge-important'; badgeText = 'ペナルティ'; }

        div.innerHTML = `
        <div class="t-info">
            <h3><span class="news-cat ${badgeClass}">${badgeText}</span> ${n.title}</h3>
            <div class="t-status">公開日: ${n.date} | Type: ${n.type}</div>
        </div>
         <div class="t-actions">
            <button class="btn btn-sm" onclick="window.editNews('${n.id}')">編集</button>
            <button class="btn btn-sm btn-red" onclick="window.deleteNews('${n.id}')">削除</button>
        </div>
        `;
        newsList.appendChild(div);
    });
}

window.editNews = (id) => {
    const n = allNews.find(x => x.id === id);
    if (!n) return;
    document.getElementById('newsId').value = n.id;
    document.getElementById('inpNewsTitle').value = n.title;
    document.getElementById('inpNewsDate').value = n.date;
    document.getElementById('inpNewsBody').value = n.body;

    const typeRad = document.querySelector(`input[name="newsType"][value="${n.type}"]`);
    if (typeRad) typeRad.checked = true;

    toggleNewsType();
    if (n.type === 'normal') {
        document.getElementById('inpNewsBadge').value = n.badge || 'info';
    } else {
        // 大会
        if (n.refTourId) {
            // 空の場合、セレクタの強制ロードが必要?
            // 通常 loadTourSelect は tournaments 配列がロードされていることに依存。
            // 大会データはロード済みと仮定。
            loadTourSelect().then(() => {
                document.getElementById('inpNewsTourId').value = n.refTourId;
            });
        }
    }

    document.getElementById('newsModal').classList.add('is-active');
};

window.deleteNews = async (id) => {
    if (!confirm('削除しますか？')) return;
    loader.classList.remove('u-hidden');
    await deleteDoc(doc(db, "news", id));
    await loadNews();
    loader.classList.add('u-hidden');
}

// タブロック
window.switchTab = (tab) => {
    const pTour = document.getElementById('panelTour');
    const pNews = document.getElementById('panelNews');
    const bTour = document.getElementById('tabBtnTour');
    const bNews = document.getElementById('tabBtnNews');

    if (tab === 'tour') {
        pTour.classList.remove('u-hidden');
        pNews.classList.add('u-hidden');
        
        bTour.classList.add('is-active');
        bNews.classList.remove('is-active');
    } else {
        pTour.classList.add('u-hidden');
        pNews.classList.remove('u-hidden');

        bNews.classList.add('is-active');
        bTour.classList.remove('is-active');
        loadNews(); // 確実にロード
    }
}
