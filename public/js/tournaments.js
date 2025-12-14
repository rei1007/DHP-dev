import { db, setupResModal, generateTourCard } from "./common.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const container = document.getElementById('tourListPage');

// モーダル初期化
setupResModal();

// グローバルロジック
window._tournamentsData = [];

async function loadTournaments() {
     // ローディング
     if(container) container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;">Loading...</div>';

    try {
        const q = query(collection(db, "tournaments"), orderBy("eventDate", "desc"));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            if(container) container.innerHTML = '<p style="grid-column:1/-1; text-align:center;">大会情報はまだありません。</p>';
            return;
        }

        let tours = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // クライアント側ソート: 受付中 -> 開催予定 -> 終了
        const statusOrder = { 'open': 1, 'upcoming': 2, 'closed': 3 };
        tours.sort((a, b) => {
            const sA = statusOrder[a.status] || 99;
            const sB = statusOrder[b.status] || 99;
            if (sA !== sB) return sA - sB;
             const dA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
             const dB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
             return dB - dA;
        });

        // モーダル用に保存
        window._tournamentsData = tours;

        let html = '';
        tours.forEach(t => {
            html += generateTourCard(t);
        });

        if(container) container.innerHTML = html;

        // 新しい要素にフェードアップを適用?
        // Common.jsのオブザーバーが監視...
        // 手動でクラスを追加して監視することもできますが、そのまま表示させます。
        // しかしinnerHTMLを置換したため、generateTourCard内のカードに'fade-up'クラスを追加した方が良いかもしれません?
        // generateTourCardはデフォルトでは'fade-up'を追加していません。
        // 現状はこれで問題ありません。

    } catch (e) {
        console.error(e);
        if(container) container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:red;">読み込みエラーが発生しました。</p>';
    }
}

loadTournaments();
