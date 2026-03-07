import { PRESETS } from './constants.js';
import { ar } from './utils.js';

// 音声入力のブラウザ対応チェック（モジュール読み込み時に1回のみ実行）
const SPEECH_SUPPORTED = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// ===== 画像ステート =====
export const imageState = { dataUrl: null };

// ===== 感情 =====
export function toggleEmo(btn) { btn.classList.toggle('on'); }

export function getEmotions() {
  return Array.from(document.querySelectorAll('.emo-chip.on')).map(b => b.dataset.e);
}

// ===== エントリアイテム =====
export function addItem(type, text = '', tags = []) {
  const container = document.getElementById(type + 'Items');
  const div = document.createElement('div');
  div.className = 'eitem';

  const presetHtml = PRESETS.map(t =>
    `<button class="tc${tags.includes(t) ? ' on' : ''}" data-t="${t}">${t}</button>`
  ).join('');
  const customHtml = tags.filter(t => !PRESETS.includes(t)).map(t =>
    `<button class="tc on custom-del" data-t="${t}">${t} ✕</button>`
  ).join('');

  div.innerHTML = `
    <div class="eitem-top">
      <textarea class="ei" placeholder="${type === 'pos' ? '良かったこと...' : '辛かったこと...'}" rows="1"></textarea>
      <button class="mic-btn" title="音声入力">🎤</button>
      <button class="rm">✕</button>
    </div>
    <div class="tag-bar">${presetHtml}${customHtml}</div>
    <div class="ctr">
      <input class="cti" type="text" placeholder="カスタムタグ..." maxlength="10">
      <button class="cta">＋</button>
    </div>`;

  const textarea = div.querySelector('textarea');
  textarea.value = text;
  textarea.addEventListener('input', () => ar(textarea));

  div.querySelector('.rm').addEventListener('click', () => div.remove());

  const micBtn = div.querySelector('.mic-btn');
  if (SPEECH_SUPPORTED) {
    micBtn.addEventListener('click', function () { startVoice(this); });
  } else {
    micBtn.disabled          = true;
    micBtn.title             = '音声入力はこのブラウザでは使えません（Chrome をお試しください）';
    micBtn.style.opacity     = '0.35';
    micBtn.style.cursor      = 'not-allowed';
  }

  const ctiInput = div.querySelector('.cti');
  const tagBar   = div.querySelector('.tag-bar');
  div.querySelector('.cta').addEventListener('click', () => addCustomTag(ctiInput, tagBar));
  ctiInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomTag(ctiInput, tagBar); }
  });

  // タグボタン（プリセット toggle ／ カスタム削除）
  tagBar.addEventListener('click', e => {
    const btn = e.target.closest('.tc');
    if (!btn) return;
    if (btn.classList.contains('custom-del')) btn.remove();
    else btn.classList.toggle('on');
  });

  container.appendChild(div);
  setTimeout(() => ar(textarea), 0);
}

export function addCustomTag(input, tagBar) {
  const val = input.value.trim();
  if (!val) return;
  if (Array.from(tagBar.querySelectorAll('.tc')).some(b => b.dataset.t === val)) {
    input.value = '';
    return;
  }
  const btn = document.createElement('button');
  btn.className = 'tc on custom-del';
  btn.dataset.t = val;
  btn.textContent = val + ' ✕';
  btn.addEventListener('click', () => btn.remove());
  tagBar.appendChild(btn);
  input.value = '';
}

export function getItems(type) {
  return Array.from(document.querySelectorAll(`#${type}Items .eitem`)).map(item => ({
    text: item.querySelector('textarea').value.trim(),
    tags: Array.from(item.querySelectorAll('.tc.on')).map(b => b.dataset.t),
  })).filter(i => i.text);
}

// ===== 音声入力 =====
let activeRecognition = null;

function startVoice(btn) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('このブラウザは音声入力に対応していません。\nChromeをお試しください。');
    return;
  }
  if (activeRecognition) { activeRecognition.stop(); return; }

  const textarea = btn.closest('.eitem-top').querySelector('textarea');
  const rec = new SpeechRec();
  rec.lang = 'ja-JP';
  rec.continuous = false;
  rec.interimResults = true;
  btn.classList.add('listening');
  activeRecognition = rec;

  rec.onresult = e => {
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
    }
    if (final) { textarea.value = (textarea.value + final).trim(); ar(textarea); }
  };
  rec.onerror = () => { btn.classList.remove('listening'); activeRecognition = null; };
  rec.onend   = () => { btn.classList.remove('listening'); activeRecognition = null; };
  rec.start();
}

// ===== 画像 =====
const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1 MB

export function handleImageFile(file) {
  if (!file) return;
  if (file.size > MAX_IMAGE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    alert(`画像が大きすぎます（${sizeMB} MB）。\n1 MB 以下の画像を選んでください。\n※ 容量を節約するため、写真アプリで圧縮してから選択することをおすすめします。`);
    return;
  }
  const reader = new FileReader();
  reader.onload = e => { imageState.dataUrl = e.target.result; _showImg(e.target.result); };
  reader.readAsDataURL(file);
}

export function handleDrop(e) {
  e.preventDefault();
  document.getElementById('imgDrop').classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleImageFile(file);
}

export function removeImage() {
  imageState.dataUrl = null;
  document.getElementById('imgPreview').src = '';
  document.getElementById('imgPW').style.display = 'none';
  document.getElementById('imgDrop').style.display = 'block';
  document.getElementById('imgInput').value = '';
}

export function showImgFromUrl(url) { _showImg(url); }

function _showImg(url) {
  document.getElementById('imgPreview').src = url;
  document.getElementById('imgPW').style.display = 'block';
  document.getElementById('imgDrop').style.display = 'none';
}
