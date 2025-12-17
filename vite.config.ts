import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoBase = '/skilled-chinese-almanac/';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? repoBase : '/',
});
