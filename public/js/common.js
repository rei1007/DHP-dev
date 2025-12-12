import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCaVNHlJBoWcn9BQd7jPFtELxsOLHCZdv0",
    authDomain: "daigakuhai.firebaseapp.com",
    projectId: "daigakuhai",
    storageBucket: "daigakuhai.firebasestorage.app",
    messagingSenderId: "1003642519018",
    appId: "1:1003642519018:web:2700931b9f1c451ec74693"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export function parseMarkdown(text) {
    if (!text) return '';
    // Nested logic: Bold/Italic first, then Link, then List?
    // Regex is tricky for nested. Alternative:
    // 1. Headers
    // 2. Bold/Italic/Underline/Strike
    // 3. Links (allow tags inside text part)
    // 4. List
    // 5. Newline

    let html = text
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/__(.*)__/gim, '<u>$1</u>')
        .replace(/~~(.*)~~/gim, '<s>$1</s>')
        // Link: [text](time) -> Allow tags in text part. Non-greedy match for text `(.*?)`
        .replace(/\[(.*?)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
    
    return html;
}
