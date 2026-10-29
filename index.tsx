import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 재배포 후 열려 있던 탭이 사라진 이전 청크를 요청하면 새로고침해 최신 버전을 받는다
// (서버 문제로 계속 실패할 때 무한 새로고침되지 않도록 30초에 한 번만)
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'docapp:chunk-reload-at';
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);