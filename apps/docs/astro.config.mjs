import path from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-check
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import { createStarlightTypeDocPlugin } from 'starlight-typedoc'

const dirname = fileURLToPath(new URL('.', import.meta.url))
const toPosix = (p) => p.replace(/\\/g, '/')
const tsconfig = toPosix(path.join(dirname, '../../tsconfig.base.json'))
const entry = (pkg) => toPosix(path.join(dirname, '../../packages', pkg, 'src/index.ts'))

const [coreTypeDoc, coreSidebarGroup] = createStarlightTypeDocPlugin()
const [biteshipTypeDoc, biteshipSidebarGroup] = createStarlightTypeDocPlugin()
const [komerceTypeDoc, komerceSidebarGroup] = createStarlightTypeDocPlugin()
const [shipperTypeDoc, shipperSidebarGroup] = createStarlightTypeDocPlugin()
const [cacheTypeDoc, cacheSidebarGroup] = createStarlightTypeDocPlugin()
const [honoTypeDoc, honoSidebarGroup] = createStarlightTypeDocPlugin()

const fontLinks = [
  { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
  { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } },
  {
    tag: 'link',
    attrs: {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap',
    },
  },
]

export default defineConfig({
  site: 'https://cakfan.github.io',
  base: '/ongkir-sdk/',
  integrations: [
    starlight({
      title: 'ongkir-sdk',
      description: 'SDK TypeScript multi-provider untuk cek ongkir & tracking pengiriman di Indonesia.',
      head: fontLinks,
      components: {
        Hero: './src/components/Hero.astro',
      },
      expressiveCode: {
        styleOverrides: {
          borderRadius: '0.875rem',
          borderWidth: '1px',
          borderColor: 'var(--sl-color-hairline)',
          codeFontSize: '0.875rem',
          frames: {
            editorTabBarBackground: 'var(--sl-color-bg-nav)',
            terminalBackground: 'var(--sl-color-bg-nav)',
          },
        },
      },
      locales: {
        root: { label: 'Bahasa Indonesia', lang: 'id' },
      },
      editLink: {
        baseUrl: 'https://github.com/cakfan/ongkir-sdk/edit/main/apps/docs/',
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/cakfan/ongkir-sdk' }],
      customCss: ['./src/styles/custom.css'],
      plugins: [
        coreTypeDoc({
          entryPoints: [entry('core')],
          tsconfig,
          output: 'api/core',
          sidebar: { label: '@ongkir-sdk/core', collapsed: true },
          typeDoc: { excludeExternals: true, skipErrorChecking: true },
        }),
        biteshipTypeDoc({
          entryPoints: [entry('provider-biteship')],
          tsconfig,
          output: 'api/biteship',
          sidebar: { label: '@ongkir-sdk/biteship', collapsed: true },
          typeDoc: { excludeExternals: true, skipErrorChecking: true },
        }),
        komerceTypeDoc({
          entryPoints: [entry('provider-komerce')],
          tsconfig,
          output: 'api/komerce',
          sidebar: { label: '@ongkir-sdk/komerce', collapsed: true },
          typeDoc: { excludeExternals: true, skipErrorChecking: true },
        }),
        shipperTypeDoc({
          entryPoints: [entry('provider-shipper')],
          tsconfig,
          output: 'api/shipper',
          sidebar: { label: '@ongkir-sdk/shipper', collapsed: true },
          typeDoc: { excludeExternals: true, skipErrorChecking: true },
        }),
        cacheTypeDoc({
          entryPoints: [entry('cache-memory')],
          tsconfig,
          output: 'api/cache-memory',
          sidebar: { label: '@ongkir-sdk/cache-memory', collapsed: true },
          typeDoc: { excludeExternals: true, skipErrorChecking: true },
        }),
        honoTypeDoc({
          entryPoints: [entry('hono')],
          tsconfig,
          output: 'api/hono',
          sidebar: { label: '@ongkir-sdk/hono', collapsed: true },
          typeDoc: { excludeExternals: true, skipErrorChecking: true },
        }),
      ],
      sidebar: [
        {
          label: 'Mulai',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Instalasi', link: '/getting-started/installation/' },
            { label: 'Quickstart', link: '/getting-started/quickstart/' },
          ],
        },
        {
          label: 'Providers',
          items: [
            { label: 'Biteship', link: '/providers/biteship/' },
            { label: 'Komerce', link: '/providers/komerce/' },
            { label: 'Shipper', link: '/providers/shipper/' },
          ],
        },
        {
          label: 'Panduan',
          items: [
            { label: 'Error handling', link: '/guides/errors/' },
            { label: 'Caching', link: '/guides/caching/' },
            { label: 'REST API (Hono)', link: '/guides/hono/' },
            { label: 'Webhooks', link: '/guides/webhooks/' },
            { label: 'Resolusi wilayah', link: '/guides/region/' },
            { label: 'Testing contract', link: '/guides/testing/' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            coreSidebarGroup,
            biteshipSidebarGroup,
            komerceSidebarGroup,
            shipperSidebarGroup,
            cacheSidebarGroup,
            honoSidebarGroup,
          ],
        },
      ],
    }),
  ],
})
