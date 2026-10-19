import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // 'server-only'는 Next.js 밖(테스트)에서는 빈 모듈로 둔다.
    alias: { 'server-only': new URL('./test/empty.ts', import.meta.url).pathname },
  },
});
