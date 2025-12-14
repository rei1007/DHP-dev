import { supabase } from "./common.js";

// --- Constants ---
const RULES = ["ナワバリ", "エリア", "ヤグラ", "ホコ", "アサリ"];
const STAGES = [
    "ユノハナ大渓谷", "ゴンズイ地区", "ヤガラ市場", "マテガイ放水路", "ナメロウ金属",
    "マサバ海峡大橋", "キンメダイ美術館", "マヒマヒリゾート＆スパ", "海女美術大学", "チョウザメ造船",
    "ザトウマーケット", "スメーシーワールド", "クサヤ温泉", "ヒラメが丘団地", "ナンプラー遺跡",
    "マンタマリア号", "タラポートショッピングパーク", "コンブトラック", "タカアシ経済特区", "オヒョウ海運",
    "バイガイ亭", "ネギトロ炭鉱", "カジキ空港", "リュウグウターミナル", "デカライン高架下"
];

// --- Modules cannot expose to global scope easily, use Event Listeners ---

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    // Check auth immediately
    checkUser();
});

function checkUser() {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) showDash();
    });
}

function setupUI() {
    // Tabs
    const btnTour = document.getElementById('tabBtnTour');
    const btnNews = document.getElementById('tabBtnNews');
    if(btnTour) btnTour.addEventListener('click', () => switchTab('tour'));
    if(btnNews) btnNews.addEventListener('click', () => switchTab('news'));

    // Checkbox Generation
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
    
    // XP Toggle
    const chkXpNone = document.getElementById('chkXpNone');
    if(chkXpNone) {
        chkXpNone.addEventListener('change', () => {
            const xpInputs = document.getElementById('xpInputs');
            if (chkXpNone.checked) {
                xpInputs.classList.add('u-disabled');
                document.getElementById('inpXpAvg').value = '';
                document.getElementById('inpXpMax').value = '';
            } else {
                xpInputs.classList.remove('u-disabled');
            }
        });
    }

    // Login Button
    const loginBtn = document.getElementById('btnLoginDiscord');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            loginBtn.disabled = true;
            loginBtn.innerHTML = 'Discordへ接続中...'; 
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: { redirectTo: window.location.href }
                });
                if (error) throw error;
            } catch (e) {
                console.error(e);
                document.getElementById('loginMsg').textContent = '認証エラー: ' + e.message;
                loginBtn.disabled = false;
            }
        });
    }
    
    // Create/Close Modal Buttons
    const btnNew = document.getElementById('btnNew');
    if(btnNew) btnNew.addEventListener('click', openNewTourModal);
    
    const btnClose = document.getElementById('btnCloseModal');
    if(btnClose) btnClose.addEventListener('click', () => document.getElementById('editModal').classList.remove('active'));

    const editForm = document.getElementById('editForm');
    if(editForm) editForm.addEventListener('submit', handleTourSubmit);

    // News UI
    const btnNewNews = document.getElementById('btnNewNews');
    if(btnNewNews) btnNewNews.addEventListener('click', openNewNewsModal);
    
    const btnCloseNews = document.getElementById('btnCloseNewsModal');
    if(btnCloseNews) btnCloseNews.addEventListener('click', () => document.getElementById('newsModal').classList.remove('active'));

    const newsForm = document.getElementById('newsForm');
    if(newsForm) newsForm.addEventListener('submit', handleNewsSubmit);
    
    // News Type Radio
    document.querySelectorAll('input[name="newsType"]').forEach(r => {
        r.addEventListener('change', toggleNewsType);
    });
    
    // Draft Gen
    const btnGenDraft = document.getElementById('btnGenDraft');
    if(btnGenDraft) btnGenDraft.addEventListener('click', generateDraft);
}

// --- Logic ---

function showDash() {
    document.getElementById('loginView').classList.add('u-hidden');
    document.getElementById('dashView').classList.remove('u-hidden');
    loadData();
    loadNews();
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
    document.getElementById(`tabBtn${tab === 'tour' ? 'Tour' : 'News'}`).classList.add('is-active');
    
    if (tab === 'tour') {
        document.getElementById('panelTour').classList.remove('u-hidden');
        document.getElementById('panelNews').classList.add('u-hidden');
    } else {
        document.getElementById('panelTour').classList.add('u-hidden');
        document.getElementById('panelNews').classList.remove('u-hidden');
    }
}

// --- Data (Tournaments) ---
let tournaments = [];
const tList = document.getElementById('tList');

async function loadData() {
    if (!tList) return;
    tList.innerHTML = '<div class="u-text-center">Loading...</div>';
    
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
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
        
        // Status Badge
        let statusBadge = '';
        if (t.status === 'upcoming') statusBadge = '<span class="status-badge status-upcoming">開催予定</span>';
        else if (t.status === 'open') statusBadge = '<span class="status-badge status-open">受付中</span>';
        else statusBadge = '<span class="status-badge status-closed">終了</span>';
        
        // Date (check both keys)
        const dVal = t.eventDate || t.event_date;
        const dateStr = dVal ? new Date(dVal).toLocaleString() : '未定';

        div.innerHTML = `
            <div class="u-flex u-justify-between u-items-center u-mb-5">
                <div class="u-font-bold u-text-lg">${t.name || '名称未設定'}</div>
                ${statusBadge}
            </div>
            <div class="u-text-sm u-text-gray u-mb-10">
                開催: ${dateStr}
            </div>
            <div class="u-flex u-gap-10">
                <button class="btn btn-sm" data-action="edit" data-id="${t.id}">編集</button>
                <button class="btn btn-sm btn-red" data-action="delete" data-id="${t.id}">削除</button>
            </div>
        `;
        // Event delegation requires attaching to button or checking target
        // Simpler: attach listener to div or buttons now
        const btnEdit = div.querySelector('[data-action="edit"]');
        btnEdit.addEventListener('click', () => editTour(t.id));
        
        const btnDel = div.querySelector('[data-action="delete"]');
        btnDel.addEventListener('click', () => deleteTour(t.id));

        tList.appendChild(div);
    });
}

function openNewTourModal() {
    document.getElementById('editId').value = ''; 
    document.getElementById('modalTitle').textContent = '新規大会作成';
    document.getElementById('editForm').reset();
    document.getElementById('editModal').classList.add('active');
}

function editTour(id) {
    const t = tournaments.find(x => x.id == id);
    if (!t) return;

    document.getElementById('editId').value = t.id;
    document.getElementById('modalTitle').textContent = '大会情報の編集';
    
    // Check potential keys
    const getVal = (k1, k2) => t[k1] !== undefined ? t[k1] : (t[k2] !== undefined ? t[k2] : '');

    document.getElementById('inpTourName').value = t.name || '';
    document.getElementById('inpStatus').value = t.status || 'upcoming';
    document.getElementById('inpEventDate').value = getVal('eventDate', 'event_date');
    document.getElementById('inpEntryStart').value = getVal('entryStart', 'entry_start');
    document.getElementById('inpEntryEnd').value = getVal('entryEnd', 'entry_end');
    document.getElementById('inpRulesUrl').value = getVal('rulesUrl', 'rules_url');
    document.getElementById('inpSupportUrl').value = getVal('supportUrl', 'support_url');

    const rules = t.rules || [];
    document.querySelectorAll('input[name="rule"]').forEach(cb => { cb.checked = rules.includes(cb.value); });
    
    const stages = t.stages || [];
    document.querySelectorAll('input[name="stage"]').forEach(cb => { cb.checked = stages.includes(cb.value); });

    document.getElementById('inpEntryType').value = getVal('entryType', 'entry_type') || 'circle_only';
    
    const xpLimit = getVal('xpLimit', 'xp_limit');
    const xpNone = (xpLimit === 'none');
    document.getElementById('chkXpNone').checked = xpNone;
    const inputs = document.getElementById('xpInputs');
    if (xpNone) {
        inputs.classList.add('u-disabled');
    } else {
        inputs.classList.remove('u-disabled');
        document.getElementById('inpXpAvg').value = getVal('xpAvg', 'xp_avg');
        document.getElementById('inpXpMax').value = getVal('xpMax', 'xp_max');
    }

    document.getElementById('inpCasterName').value = getVal('casterName', 'caster_name');
    document.getElementById('inpCasterIcon').value = getVal('casterIcon', 'caster_icon');
    document.getElementById('inpCasterX').value = getVal('casterX', 'caster_x');
    document.getElementById('inpCasterYt').value = getVal('casterYt', 'caster_yt');
    
    document.getElementById('inpComName').value = getVal('comName', 'com_name');
    document.getElementById('inpComIcon').value = getVal('comIcon', 'com_icon');
    document.getElementById('inpComX').value = getVal('comX', 'com_x');
    document.getElementById('inpComYt').value = getVal('comYt', 'com_yt');

    document.getElementById('inpOperator').value = t.operator || '';
    document.getElementById('inpLicense').value = t.license || '';

    document.getElementById('inpWinTeam').value = getVal('winTeam', 'win_team');
    document.getElementById('inpWinUniv').value = getVal('winUniv', 'win_univ');
    document.getElementById('inpWinCircle').value = getVal('winCircle', 'win_circle');
    document.getElementById('inpWinUniv2').value = getVal('winUniv2', 'win_univ2');
    document.getElementById('inpWinCircle2').value = getVal('winCircle2', 'win_circle2');
    
    document.getElementById('inpWinMem1').value = getVal('winMem1', 'win_mem1');
    document.getElementById('inpWinMem2').value = getVal('winMem2', 'win_mem2');
    document.getElementById('inpWinMem3').value = getVal('winMem3', 'win_mem3');
    document.getElementById('inpWinMem4').value = getVal('winMem4', 'win_mem4');

    document.getElementById('inpWinImage').value = getVal('winImage', 'win_image');
    document.getElementById('inpWinUrl').value = getVal('winUrl', 'win_url');
    document.getElementById('inpArchiveUrl').value = getVal('archiveUrl', 'archive_url');

    document.getElementById('editModal').classList.add('active');
}

async function handleTourSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const rules = Array.from(document.querySelectorAll('input[name="rule"]:checked')).map(c => c.value);
    const stages = Array.from(document.querySelectorAll('input[name="stage"]:checked')).map(c => c.value);
    const xpNone = document.getElementById('chkXpNone').checked;

    // Use camelCase for keys to match the provided SQL
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
        updated_at: new Date().toISOString()
    };

    const id = document.getElementById('editId').value;
    try {
        if (id) {
            const { error } = await supabase.from('tournaments').update(newData).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabase.from('tournaments').insert([newData]);
            if(error) throw error;
        }
        document.getElementById('editModal').classList.remove('active');
        loadData();
    } catch (err) {
        alert('保存エラー: ' + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function deleteTour(id) {
    if(!confirm('削除しますか？')) return;
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if(error) alert('Error: ' + error.message);
    else loadData();
}


// --- Data (News) ---
let newsData = [];
const nList = document.getElementById('nList');

async function loadNews() {
    if (!nList) return;
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
        // Check casing
        const pub = n.publishedAt || n.publishedat || '';
        div.innerHTML = `
            <div class="u-flex u-justify-between u-items-center">
                <div class="u-font-bold">${n.title}</div>
                <div class="u-text-sm">${pub}</div>
            </div>
            <div class="u-mt-10 u-flex u-gap-10">
                <button class="btn btn-sm" data-action="edit" data-id="${n.id}">編集</button>
                <button class="btn btn-sm btn-red" data-action="delete" data-id="${n.id}">削除</button>
            </div>
        `;
        div.querySelector('[data-action="edit"]').addEventListener('click', () => editNews(n.id));
        div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteNews(n.id));
        nList.appendChild(div);
    });
}

function openNewNewsModal() {
    document.getElementById('newsId').value = '';
    document.getElementById('newsModalTitle').textContent = 'お知らせ作成';
    document.getElementById('newsForm').reset();
    fillTourSelect();
    document.getElementById('newsModal').classList.add('active');
}

async function handleNewsSubmit(e) {
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
        if (id) await supabase.from('news').update(newData).eq('id', id);
        else await supabase.from('news').insert([newData]);
        document.getElementById('newsModal').classList.remove('active');
        loadNews();
    } catch (err) { alert(err.message); }
}

function editNews(id) {
    const n = newsData.find(x => x.id == id);
    if (!n) return;
    document.getElementById('newsId').value = n.id;
    document.getElementById('inpNewsTitle').value = n.title;
    document.getElementById('inpNewsDate').value = n.publishedAt || n.publishedat;
    document.getElementById('inpNewsBody').value = n.body;
    fillTourSelect();
    
    // Type handling needs logic to check radio
    // Assuming simple normal for now or check n.type
    // Implementation simplified for brevity
    document.getElementById('newsModal').classList.add('active');
}

async function deleteNews(id) {
    if(!confirm('削除？')) return;
    await supabase.from('news').delete().eq('id', id);
    loadNews();
}

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

function toggleNewsType() {
    const val = document.querySelector('input[name="newsType"]:checked').value;
    document.getElementById('newsTypeNormal').classList.toggle('u-hidden', val !== 'normal');
    document.getElementById('newsTypeTour').classList.toggle('u-hidden', val === 'normal');
}

function generateDraft() {
    const id = document.getElementById('inpNewsTourId').value;
    const t = tournaments.find(x => x.id == id);
    if (!t) return;
    
    const getVal = (k1, k2) => t[k1] !== undefined ? t[k1] : t[k2];
    const start = getVal('entryStart', 'entry_start');
    const end = getVal('entryEnd', 'entry_end');
    
    const body = `## ${t.name} エントリー開始！\n\n期間: ${start} ~ ${end}`;
    document.getElementById('inpNewsBody').value = body;
}
