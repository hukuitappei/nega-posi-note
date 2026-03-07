/** 確認ダイアログの状態とロジックを管理するモジュール */
let pendingOk = null;

export function showConfirm(title, msg, onOk) {
  document.getElementById('cfmTitle').textContent = title;
  document.getElementById('cfmMsg').textContent   = msg;
  pendingOk = onOk;
  document.getElementById('confirmModal').classList.add('show');
  // キャンセルボタンへフォーカスを移動
  setTimeout(() => document.getElementById('cfmCancel').focus(), 50);
}

export function initConfirmModal() {
  const modal     = document.getElementById('confirmModal');
  const cancelBtn = document.getElementById('cfmCancel');
  const okBtn     = document.getElementById('cfmOk');

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    pendingOk = null;
  });

  okBtn.addEventListener('click', () => {
    if (pendingOk) { pendingOk(); pendingOk = null; }
    modal.classList.remove('show');
  });

  // Escape キーで閉じる
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      modal.classList.remove('show');
      pendingOk = null;
    }
  });

  // フォーカストラップ（Tab / Shift+Tab で modal 内に留まる）
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === cancelBtn) {
      okBtn.focus(); e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === okBtn) {
      cancelBtn.focus(); e.preventDefault();
    }
  });
}
