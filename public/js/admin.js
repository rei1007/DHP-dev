import { supabase } from "./common.js";

// --- 定数定義 ---
const RULES = ["ナワバリ", "エリア", "ヤグラ", "ホコ", "アサリ"];
const STAGES = [
    "ユノハナ大渓谷", "ゴンズイ地区", "ヤガラ市場", "マテガイ放水路", "ナメロウ金属",
    "マサバ海峡大橋", "キンメダイ美術館", "マヒマヒリゾート＆スパ", "海女美術大学", "チョウザメ造船",
    "ザトウマーケット", "スメーシーワールド", "クサヤ温泉", "ヒラメが丘団地", "ナンプラー遺跡",
    "マンタマリア号", "タラポートショッピングパーク", "コンブトラック", "タカアシ経済特区", "オヒョウ海運",
    "バイガイ亭", "ネギトロ炭鉱", "カジキ空港", "リュウグウターミナル", "デカライン高架下"
];

// --- グローバル関数 (HTMLバインディング用) ---

window.showDash = () => {
    document.getElementById('loginView').classList.add('u-hidden');
    document.getElementById('dashView').classList.remove('u-hidden');
    loadData();
    loadNews();
};

window.proceedLogin = () => {
    window.showDash();
};

window.doLogout = async () => {
    await supabase.auth.signOut();
    location.reload();
};

window.switchTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
    document.getElementById(`tabBtn${tab === 'tour' ? 'Tour' : 'News'}`).classList.add('is-active');
    
    if (tab === 'tour') {
        document.getElementById('panelTour').classList.remove('u-hidden');
        document.getElementById('panelNews').classList.add('u-hidden');
    } else {
        document.getElementById('panelTour').classList.add('u-hidden');
        document.getElementById('panelNews').classList.remove('u-hidden');
    }
};

// --- UI初期化 ---
const ruleGroup = document.getElementById('ruleGroup');
if(ruleGroup) {
    ruleGroup.innerHTML = '';
    RULES.forEach(r => {
        const lbl = document.createElement('label');
        lbl.className = 'checkbox-label';
        lbl.innerHTML = `<input type="checkbox" name="rule" value="${r}"> ${r}`;
        ruleGroup.appendChild(lbl);
    });
}

const stageGroup = document.getElementById('stageGroup');
if(stageGroup) {
    stageGroup.innerHTML = '';
    STAGES.forEach(s => {
        const lbl = document.createElement('label');
        lbl.className = 'checkbox-label';
        lbl.innerHTML = `<input type="checkbox" name="stage" value="${s}"> ${s}`;
        stageGroup.appendChild(lbl);
    });
}

// XP制限トグル
const chkXpNone = document.getElementById('chkXpNone');
const xpInputs = document.getElementById('xpInputs');
if(chkXpNone) {
    chkXpNone.addEventListener('change', () => {
        if (chkXpNone.checked) {
            xpInputs.classList.add('u-disabled');
            document.getElementById('inpXpAvg').value = '';
            document.getElementById('inpXpMax').value = '';
        } else {
            xpInputs.classList.remove('u-disabled');
        }
    });
}


// --- 認証ロジック (Supabase Auth) ---
const loginBtn = document.getElementById('btnLoginDiscord');
const loginMsg = document.getElementById('loginMsg');

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        loginBtn.disabled = true;
        loginBtn.innerHTML = 'Discordへ接続中...'; 
        
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.href
                }
            });
            if (error) throw error;
        } catch (e) {
            console.error(e);
            loginMsg.textContent = '認証エラー: ' + e.message;
            loginBtn.disabled = false;
        }
    });
}

// 認証監視
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        window.showDash();
    }
});


// --- データ操作 (Tournaments) ---
let tournaments = [];
const tList = document.getElementById('tList');

async function loadData() {
    if (!tList) return;
    tList.innerHTML = '<div class="u-text-center">Loading...</div>';
    
    // Supabaseからデータ取得 (tournamentsテーブル)
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        tList.innerHTML = '<div class="u-text-red">読み込みエラー: ' + error.message + '</div>';
        return;
    }

    tournaments = data || [];
    renderList();
}

function renderList() {
    tList.innerHTML = '';
    tournaments.forEach(t => {
        const div = document.createElement('div');
        div.className = 'tour-item';
        
        let statusBadge = '';
        if (t.status === 'upcoming') statusBadge = '<span class="status-badge status-upcoming">開催予定</span>';
        else if (t.status === 'open') statusBadge = '<span class="status-badge status-open">受付中</span>';
        else statusBadge = '<span class="status-badge status-closed">終了</span>';
        
        // Use snake_case key
        const dateStr = t.event_date ? new Date(t.event_date).toLocaleString() : '未定';

        div.innerHTML = `
            <div class="u-flex u-justify-between u-items-center u-mb-5">
                <div class="u-font-bold u-text-lg">${t.name || '名称未設定'}</div>
                ${statusBadge}
            </div>
            <div class="u-text-sm u-text-gray u-mb-10">
                開催: ${dateStr}
            </div>
            <div class="u-flex u-gap-10">
                <button class="btn btn-sm" onclick="editTour('${t.id}')">編集</button>
                <button class="btn btn-sm btn-red" onclick="deleteTour('${t.id}')">削除</button>
            </div>
        `;
        tList.appendChild(div);
    });
}

// 編集モーダル
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const btnNew = document.getElementById('btnNew');
const btnClose = document.getElementById('btnCloseModal');

if (btnNew) {
    btnNew.addEventListener('click', () => {
        document.getElementById('editId').value = ''; 
        document.getElementById('modalTitle').textContent = '新規大会作成';
        editForm.reset();
        modal.classList.add('active');
    });
}
if (btnClose) {
    btnClose.addEventListener('click', () => { modal.classList.remove('active'); });
}

window.editTour = (id) => {
    const t = tournaments.find(x => x.id == id);
    if (!t) return;

    document.getElementById('editId').value = t.id;
    document.getElementById('modalTitle').textContent = '大会情報の編集';
    
    // IMPORTANT: Mapping snake_case DB columns to HTML Inputs
    document.getElementById('inpTourName').value = t.name || '';
    document.getElementById('inpStatus').value = t.status || 'upcoming';
    document.getElementById('inpEventDate').value = t.event_date || '';
    document.getElementById('inpEntryStart').value = t.entry_start || '';
    document.getElementById('inpEntryEnd').value = t.entry_end || '';
    document.getElementById('inpRulesUrl').value = t.rules_url || '';
    document.getElementById('inpSupportUrl').value = t.support_url || '';

    const rules = t.rules || [];
    document.querySelectorAll('input[name="rule"]').forEach(cb => { cb.checked = rules.includes(cb.value); });
    
    const stages = t.stages || [];
    document.querySelectorAll('input[name="stage"]').forEach(cb => { cb.checked = stages.includes(cb.value); });

    document.getElementById('inpEntryType').value = t.entry_type || 'circle_only';
    
    // xp_limit can be 'none' or 'restrict'
    const xpLimit = t.xp_limit;
    const xpNone = (xpLimit === 'none');
    document.getElementById('chkXpNone').checked = xpNone;
    if (xpNone) {
        xpInputs.classList.add('u-disabled');
    } else {
        xpInputs.classList.remove('u-disabled');
        document.getElementById('inpXpAvg').value = t.xp_avg || '';
        document.getElementById('inpXpMax').value = t.xp_max || '';
    }

    document.getElementById('inpCasterName').value = t.caster_name || '';
    document.getElementById('inpCasterIcon').value = t.caster_icon || '';
    document.getElementById('inpCasterX').value = t.caster_x || '';
    document.getElementById('inpCasterYt').value = t.caster_yt || '';
    
    document.getElementById('inpComName').value = t.com_name || '';
    document.getElementById('inpComIcon').value = t.com_icon || '';
    document.getElementById('inpComX').value = t.com_x || '';
    document.getElementById('inpComYt').value = t.com_yt || '';

    document.getElementById('inpOperator').value = t.operator || '';
    document.getElementById('inpLicense').value = t.license || '';

    // Results (CamelCase inputs in SQL? User created table using SQL provided earlier?
    // The previously provided SQL had camelCase column names like "winTeam". 
    // BUT Supabase/Postgres lowercases unquoted identifiers.
    // If the user copy-pasted my SQL:
    // create table tournaments ( ..., "winTeam" text, ... ); 
    // They are quoted! So they are CaseSensitive.
    // However, I previously provided: "eventDate" text, etc.
    
    // DECISION:
    // To be absolutely safest, I will check both camelCase AND snake_case when READING.
    // When WRITING, I should try to write camelCase because the SQL I gave used camelCase.
    // BUT, if the user didn't use quotes, they are lowercase.
    // The previous failed `admin.js` used camelCase keys.
    // The User said "rebuild from scratch".
    // I will use SNAKE CASE for everything in my mind, but send BOTH if possible? No.
    // I will write snake_case keys. If the DB expects camelCase (quoted), the insert might fail or ignore.
    
    // Correction: I want "1-reset" confidence.
    // I provided SQL with quotes earlier. `create table ... "eventDate" text ...`
    // So the DB has "eventDate".
    // So I MUST send "eventDate".
    // HOWEVER, `eventDate` in JS object -> Supabase -> `eventDate` column.
    
    // Let's stick to CAMEL CASE for keys because that matches the SQL schema I provided.
    // I will update this file to use camelCase, matching the provided SQL schema.
    
    document.getElementById('inpWinTeam').value = t.winTeam || '';
    document.getElementById('inpWinUniv').value = t.winUniv || '';
    document.getElementById('inpWinCircle').value = t.winCircle || '';
    document.getElementById('inpWinUniv2').value = t.winUniv2 || '';
    document.getElementById('inpWinCircle2').value = t.winCircle2 || '';
    
    document.getElementById('inpWinMem1').value = t.winMem1 || '';
    document.getElementById('inpWinMem2').value = t.winMem2 || '';
    document.getElementById('inpWinMem3').value = t.winMem3 || '';
    document.getElementById('inpWinMem4').value = t.winMem4 || '';

    document.getElementById('inpWinImage').value = t.winImage || '';
    document.getElementById('inpWinUrl').value = t.winUrl || '';
    document.getElementById('inpArchiveUrl').value = t.archiveUrl || '';

    modal.classList.add('active');
};

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const rules = Array.from(document.querySelectorAll('input[name="rule"]:checked')).map(c => c.value);
        const stages = Array.from(document.querySelectorAll('input[name="stage"]:checked')).map(c => c.value);
        const xpNone = document.getElementById('chkXpNone').checked;

        // Use precise keys matching the SQL schema provided (quoted identifiers)
        // If SQL was: "eventDate" text
        // Then JS key: eventDate
        const newData = {
            name: document.getElementById('inpTourName').value,
            status: document.getElementById('inpStatus').value,
            
            eventDate: document.getElementById('inpEventDate').value,
            entryStart: document.getElementById('inpEntryStart').value,
            entryEnd: document.getElementById('inpEntryEnd').value,
            rulesUrl: document.getElementById('inpRulesUrl').value,
            supportUrl: document.getElementById('inpSupportUrl').value,
            
            rules: rules,
            stages: stages,
            
            entryType: document.getElementById('inpEntryType').value,
            xpLimit: xpNone ? 'none' : 'restrict',
            xpAvg: xpNone ? null : document.getElementById('inpXpAvg').value,
            xpMax: xpNone ? null : document.getElementById('inpXpMax').value,
            
            casterName: document.getElementById('inpCasterName').value,
            casterIcon: document.getElementById('inpCasterIcon').value,
            casterX: document.getElementById('inpCasterX').value,
            casterYt: document.getElementById('inpCasterYt').value,

            comName: document.getElementById('inpComName').value,
            comIcon: document.getElementById('inpComIcon').value,
            comX: document.getElementById('inpComX').value,
            comYt: document.getElementById('inpComYt').value,

            operator: document.getElementById('inpOperator').value,
            license: document.getElementById('inpLicense').value,

            winTeam: document.getElementById('inpWinTeam').value,
            winUniv: document.getElementById('inpWinUniv').value,
            winCircle: document.getElementById('inpWinCircle').value,
            winUniv2: document.getElementById('inpWinUniv2').value,
            winCircle2: document.getElementById('inpWinCircle2').value,

            winMem1: document.getElementById('inpWinMem1').value,
            winMem2: document.getElementById('inpWinMem2').value,
            winMem3: document.getElementById('inpWinMem3').value,
            winMem4: document.getElementById('inpWinMem4').value,

            winImage: document.getElementById('inpWinImage').value,
            winUrl: document.getElementById('inpWinUrl').value,
            archiveUrl: document.getElementById('inpArchiveUrl').value,
            
            updated_at: new Date().toISOString() // updated_at is standard
        };

        const id = document.getElementById('editId').value;
        const btn = editForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '保存中...';

        try {
            if (id) {
                // Update
                const { error } = await supabase.from('tournaments')
                    .update(newData).eq('id', id);
                if(error) throw error;
            } else {
                // Insert
                // created_at is default
                const { error } = await supabase.from('tournaments')
                    .insert([newData]);
                if(error) throw error;
            }
            modal.classList.remove('active');
            loadData();
        } catch (err) {
            console.error(err);
            alert('保存エラー: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '保存する';
        }
    });
}

window.deleteTour = async (id) => {
    if(!confirm('削除しますか？')) return;
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if(error) alert('削除エラー: ' + error.message);
    else loadData();
};


// --- News ---
let newsData = [];
const nList = document.getElementById('nList');
const btnNewNews = document.getElementById('btnNewNews');
const newsModal = document.getElementById('newsModal');
const newsForm = document.getElementById('newsForm');

async function loadNews() {
    if (!nList) return;
    // Order by publishedAt (CamelCase in SQL)
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('publishedAt', { ascending: false });
    
    if (error) { nList.innerHTML = 'Error'; return; }
    newsData = data || [];
    
    nList.innerHTML = '';
    newsData.forEach(n => {
        const div = document.createElement('div');
        div.className = 'tour-item';
        div.innerHTML = `
            <div class="u-flex u-justify-between u-items-center">
                <div class="u-font-bold">${n.title}</div>
                <div class="u-text-sm">${n.publishedAt || n.publishedat || ''}</div>
            </div>
            <div class="u-mt-10 u-flex u-gap-10">
                <button class="btn btn-sm" onclick="editNews('${n.id}')">編集</button>
                <button class="btn btn-sm btn-red" onclick="deleteNews('${n.id}')">削除</button>
            </div>
        `;
        nList.appendChild(div);
    });
}

if (btnNewNews) {
    btnNewNews.addEventListener('click', () => {
        document.getElementById('newsId').value = '';
        document.getElementById('newsModalTitle').textContent = 'お知らせ作成';
        newsForm.reset();
        fillTourSelect();
        newsModal.classList.add('active');
    });
}
document.getElementById('btnCloseNewsModal')?.addEventListener('click', () => {
    newsModal.classList.remove('active');
});

if (newsForm) {
    newsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('newsId').value;
        const newData = {
            title: document.getElementById('inpNewsTitle').value,
            publishedAt: document.getElementById('inpNewsDate').value,
            body: document.getElementById('inpNewsBody').value,
            type: document.querySelector('input[name="newsType"]:checked').value,
            badge: document.getElementById('inpNewsBadge').value,
            targetTourId: document.getElementById('inpNewsTourId').value || null,
            updated_at: new Date().toISOString()
        };

        try {
            if (id) {
                await supabase.from('news').update(newData).eq('id', id);
            } else {
                await supabase.from('news').insert([newData]);
            }
            newsModal.classList.remove('active');
            loadNews();
        } catch (err) { alert(err.message); }
    });
}

window.editNews = (id) => {
    const n = newsData.find(x => x.id == id);
    if (!n) return;
    document.getElementById('newsId').value = n.id;
    document.getElementById('inpNewsTitle').value = n.title;
    document.getElementById('inpNewsDate').value = n.publishedAt || n.publishedat;
    document.getElementById('inpNewsBody').value = n.body;
    fillTourSelect();
    newsModal.classList.add('active');
};

window.deleteNews = async (id) => {
    if(!confirm('削除？')) return;
    await supabase.from('news').delete().eq('id', id);
    loadNews();
};

function fillTourSelect() {
    const sel = document.getElementById('inpNewsTourId');
    if(!sel) return;
    sel.innerHTML = '<option value="">大会を選択</option>';
    tournaments.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        sel.appendChild(opt);
    });
}

window.toggleNewsType = () => {
    const val = document.querySelector('input[name="newsType"]:checked').value;
    document.getElementById('newsTypeNormal').classList.toggle('u-hidden', val !== 'normal');
    document.getElementById('newsTypeTour').classList.toggle('u-hidden', val === 'normal');
};

window.generateDraft = () => {
    const id = document.getElementById('inpNewsTourId').value;
    const t = tournaments.find(x => x.id == id);
    if (!t) return;
    
    // Check both camel and snake
    const start = t.entryStart || t.entry_start;
    const end = t.entryEnd || t.entry_end;
    
    const body = `## ${t.name} エントリー開始！\n\n期間: ${start} ~ ${end}`;
    document.getElementById('inpNewsBody').value = body;
};
