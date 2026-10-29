import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      optimizeDeps: {
        include: ['dompurify'],
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            // 자주 바뀌지 않는 라이브러리를 분리해 재배포 시 캐시를 살린다
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
              'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-image', '@tiptap/extension-placeholder', '@tiptap/extension-text-style'],
              'vendor-markdown': ['marked', 'dompurify', 'highlight.js/lib/common'],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
