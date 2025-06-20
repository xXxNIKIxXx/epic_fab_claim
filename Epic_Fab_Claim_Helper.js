// ==UserScript==
// @name         Epic Claim Helper
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Automatically collects and claims Fab.com listings, removing .jpg images from the page.
// @author       xXx_NIKI_xXx
// @match        https://www.fab.com/*
// @grant        none
// @icon         https://www.fab.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/xXx-NIKI-xXx/Epic_Fab_Claim_Helper/main/Epic_Fab_Claim_Helper.js
// @downloadURL  https://raw.githubusercontent.com/xXx-NIKI-xXx/Epic_Fab_Claim_Helper/main/Epic_Fab_Claim_Helper.js
// ==/UserScript==

(function() {
    'use strict';

function removeJpgImages() {
    document.querySelectorAll('img[src$=".jpg"], img[src$=".jpeg"], img[src*=".jpg?"], img[src*=".jpeg?"]').forEach(img => img.parentElement.remove());
    document.querySelectorAll(".cUUvxo_s").forEach(el => el.parentElement.parentElement.parentElement.remove());
}
removeJpgImages();
const observer = new MutationObserver(() => removeJpgImages());
observer.observe(document.body, { childList: true, subtree: true });

async function scrollDown() {
    const originalScroll = window.scrollY;
    // Scroll to bottom smoothly
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    // Wait for scroll to finish (100ms)
    await new Promise(resolve => setTimeout(resolve, 5));
    // Scroll back to original position
    window.scrollTo({ top: originalScroll, behavior: 'instant' });
}

function collectLinks(collected, updateStats) {
    const uuidPattern = /https:\/\/www\.fab\.com\/listings\/[0-9a-fA-F\-]{36}/;
    let added = 0;
    Array.from(document.querySelectorAll('a'))
        .filter(a => uuidPattern.test(a.href) &&
            !(a.parentElement?.parentElement?.querySelector(".cUUvxo_s")))
        .forEach(a => {
            if (!collected.has(a.href)) {
                collected.add(a.href);
                added++;
            }
        });
    if (added > 0 && updateStats) updateStats();
}

function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

let running = false;
let intervalId = null;
let collectedLinks = new Set();
let success = 0;
let fail = 0;

function createButton(text, onClick, id) {
    if (document.getElementById(id)) return;
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.margin = '5px';
    btn.style.padding = '10px';
    btn.style.background = '#0078d4';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.id = id;
    btn.onclick = onClick;
    return btn;
}

function createOverlay() {
    if (document.getElementById('epicHelperOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'epicHelperOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '10px';
    overlay.style.left = '10px';
    overlay.style.zIndex = 9999;
    overlay.style.background = 'rgba(30,30,30,0.95)';
    overlay.style.padding = '10px';
    overlay.style.borderRadius = '8px';
    overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'stretch';
    overlay.style.cursor = 'move';
    document.body.appendChild(overlay);
    makeDraggable(overlay);
    return overlay;
}

// --- Stats Popup (always present) ---
function createOrUpdateStatsPopup() {
    let statsPopup = document.getElementById('epicHelperStatsPopup');
    if (!statsPopup) {
        statsPopup = document.createElement('div');
        statsPopup.id = 'epicHelperStatsPopup';
        statsPopup.style.position = 'fixed';
        statsPopup.style.top = '10px';
        statsPopup.style.right = '10px';
        statsPopup.style.zIndex = 10000;
        statsPopup.style.background = 'rgba(30,30,30,0.95)';
        statsPopup.style.color = 'white';
        statsPopup.style.padding = '14px 24px';
        statsPopup.style.borderRadius = '8px';
        statsPopup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        statsPopup.style.fontSize = '16px';
        statsPopup.style.fontFamily = 'sans-serif';
        statsPopup.innerHTML = `
            <b>Epic Claim Stats</b><br>
            <span style="color:#00e676;">Success: <span id="epicHelperSuccess">0</span></span>
            /
            <span id="epicHelperTotal">0</span>
            (<span id="epicHelperSuccessPercent" style="color:#00e676;">0%</span>)<br>
            <span style="color:#ff1744;">Fail: <span id="epicHelperFail">0</span></span>
            (<span id="epicHelperFailPercent" style="color:#ff1744;">0%</span>)<br>
            <span style="color:#ffd600;">Pending: <span id="epicHelperPending">0</span></span>
            (<span id="epicHelperPendingPercent" style="color:#ffd600;">100%</span>)<br>
            <hr style="border:0;border-top:1px solid #444;margin:8px 0;">
            <span style="color:#90caf9;">Started at: <span id="epicHelperStarted">${new Date().toLocaleTimeString()}</span></span>
        `;
        document.body.appendChild(statsPopup);
    }
    updateStats();
}

function updateStats() {
    const total = collectedLinks.size;
    const done = success + fail;
    const pending = total - done;
    const successPercent = total ? ((success / total) * 100).toFixed(1) : 0;
    const failPercent = total ? ((fail / total) * 100).toFixed(1) : 0;
    const pendingPercent = total ? ((pending / total) * 100).toFixed(1) : 0;
    document.getElementById('epicHelperTotal').textContent = total;
    document.getElementById('epicHelperSuccess').textContent = success;
    document.getElementById('epicHelperFail').textContent = fail;
    document.getElementById('epicHelperPending').textContent = pending;
    document.getElementById('epicHelperSuccessPercent').textContent = `${successPercent}%`;
    document.getElementById('epicHelperFailPercent').textContent = `${failPercent}%`;
    document.getElementById('epicHelperPendingPercent').textContent = `${pendingPercent}%`;
}

function startCollecting() {
    if (running) return;
    running = true;
    success = 0;
    fail = 0;
    collectedLinks.clear();
    document.getElementById('toggleBtn').textContent = 'Stop & Print Links';
    document.getElementById('epicHelperStarted').textContent = new Date().toLocaleTimeString();
    updateStats();
    intervalId = setInterval(() => {
        scrollDown(3, 500);
        collectLinks(collectedLinks, updateStats);
    }, 1500);
}

function stopCollecting() {
    running = false;
    document.getElementById('toggleBtn').textContent = 'Start Collecting Links';
    clearInterval(intervalId);
    let idx = 1;
    let total = collectedLinks.size;
    updateStats();

    collectedLinks.forEach(link => {
        console.log(`${idx++}: ${link}`);
        const uuid = link.match(/[0-9a-fA-F\-]{36}/)?.[0];
        if (uuid) {
            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            }
            const csrfToken = getCookie('fab_csrftoken');
            fetch(`https://www.fab.com/i/listings/${uuid}/prices-infos`, {
                credentials: 'include'
            })
            .then(resp => resp.json())
            .then(data => {
                const eurOffer = data?.offers?.find(o => o.currencyCode === "EUR");
                const offer_id = eurOffer?.offerId;
                if (offer_id) {
                    fetch(`https://www.fab.com/i/listings/${uuid}/add-to-library`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-CSRFToken': csrfToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            offer_id: offer_id
                        })
                    })
                    .then(res => res.json())
                    .then(result => {
                        success++;
                        updateStats();
                    })
                    .catch(err => {
                        fail++;
                        updateStats();
                    });
                } else {
                    fail++;
                    updateStats();
                }
            })
            .catch(() => {
                fail++;
                updateStats();
            });
        } else {
            fail++;
            updateStats();
        }
    });
}

// --- Add Button to Overlay ---
const overlay = createOverlay();
overlay.appendChild(createButton('Start Collecting Links', () => {
    if (!running) startCollecting();
    else stopCollecting();
}, 'toggleBtn'));

// --- Always show stats popup ---
createOrUpdateStatsPopup();

})();
