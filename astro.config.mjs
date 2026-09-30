// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://recipes.nickwang.xyz',
  trailingSlash: 'always',
  i18n: {
    locales: ['zh'],
    defaultLocale: 'zh',
    routing: { prefixDefaultLocale: false },
  },
});
