// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://recipes.nickwang.xyz',
  // The offline fallback is only for the service worker; keep it out of search engines.
  integrations: [sitemap({
    filter: (page) => !page.endsWith('/offline/'),
    i18n: { defaultLocale: 'zh', locales: { zh: 'zh-CN', en: 'en' } },
  })],
  trailingSlash: 'always',
});
