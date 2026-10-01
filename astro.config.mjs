// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://recipes.nickwang.xyz',
  // The offline fallback is only for the service worker; keep it out of search engines.
  integrations: [sitemap({ filter: (page) => !page.endsWith('/offline/') })],
  trailingSlash: 'always',
  i18n: {
    locales: ['zh'],
    defaultLocale: 'zh',
    routing: { prefixDefaultLocale: false },
  },
});
