# Contributing — ongkir-sdk

Makasih sudah tertarik berkontribusi! Repo ini kecil tapi aturannya jelas — baca dulu `README.md`, `PRD.md`, `ARCHITECTURE.md`, dan `ROADMAP.md` sebelum mulai kerja apa pun. Aturan operasional detail untuk kontributor (terutama yang bekerja sama dengan AI coding agent) ada di `AGENTS.md`.

## Setup development

Prasyarat: **Bun** (package manager dan runtime utama repo ini — jangan pakai npm/yarn/pnpm).

```bash
bun install
bun run lint        # biome check
bun run typecheck
bun run test
bun run build
```

## Struktur monorepo

- `packages/core` — tipe, contract `ShippingProvider`, error normalization, region resolver, dan shared contract test suite (`@ongkir-sdk/core/testing`)
- `packages/provider-biteship`, `provider-komerce`, `provider-shipper` — adapter provider
- `packages/cache-memory` — wrapper caching
- `packages/hono` — REST middleware
- `examples/*` — contoh pemakaian
- `apps/docs` — docsite (Astro Starlight)

Arah dependency selalu **provider → core**. Core tidak pernah import dari package provider.

## Alur kontribusi

1. Cek `ROADMAP.md` — jangan kerjakan task di luar fase yang sedang berjalan.
2. Buat issue dulu kalau itu fitur baru/perubahan contract (bukan bugfix sepele) — biar desainnya didiskusikan sebelum implementasi.
3. Fork + branch (`feat/...`, `fix/...`, `docs/...`).
4. Kerjakan, ikuti konvensi di bawah.
5. Kirim PR ke `main`, deskripsi PR sebutkan perubahan apa dan apakah perlu rilis (changeset).

## Aturan wajib saat menulis kode

- **TypeScript, runtime-agnostic** — pakai Web-standard API (`fetch`, `crypto.subtle`), jangan `fs`/`crypto` Node-native supaya tetap jalan di Node, Bun, Deno, dan Cloudflare Workers.
- **Dependency injection untuk HTTP client** — adapter menerima `httpClient` sebagai parameter constructor/config. Ini yang membuat testing tanpa API key asli jadi mungkin.
- **Error selalu dinormalisasi** ke `ShippingSDKError` sebelum keluar dari adapter — jangan biarkan raw error/response provider bocor ke consumer.
- **Contract di `core` adalah sumber kebenaran.** Kalau fitur baru butuh mengubah bentuk `contract.ts`, itu keputusan arsitektur — bahas dulu lewat issue, jangan langsung di-PR. Provider menyesuaikan diri ke contract, bukan sebaliknya.

## Menambah provider baru

1. Setup package dengan struktur yang sama seperti provider yang sudah ada: `adapter.ts`, `mapper.ts`, `errors.ts`, `index.ts`.
2. Tulis `mapper.ts` (transform request/response provider ↔ tipe core) + unit test mapper.
3. Simpan fixture response asli (JSON) di `__fixtures__/` — jangan generate on-the-fly dari live call.
4. Implementasikan semua method di `ShippingProvider`. Provider yang tidak mendukung sebuah fitur **wajib melempar error yang sesuai** (`WEBHOOK_NOT_SUPPORTED`, `CREATE_SHIPMENT_NOT_SUPPORTED`, dst) — bukan tidak mengimplementasi method.
5. Jalankan `runProviderContractTests()` dari `@ongkir-sdk/core/testing` — **wajib lulus** sebelum dianggap selesai.
6. Tambah `README.md` package dengan disclaimer unofficial di bagian atas.

## Testing

- Unit test mapper terpisah dari contract test.
- **Jangan** tambah test yang butuh API key asli/live call di suite yang jalan di CI.
- Butuh cek live? Taruh di folder `manual/` dengan nama file **bukan** berakhiran `.test.ts` (misal `manual/live.ts`), dan dokumentasikan cara jalankannya di `manual/README.md`. Nama `.manual.test.ts` pun tetap ketarik ke CI karena Bun scan glob `*.test.ts`.

## Versioning & changeset

- Bump versi **tidak pernah manual** — selalu lewat Changesets.
- Setiap PR yang mengubah code yang ter-publish **wajib** menyertakan changeset (`bunx changeset`).
- **SemVer per package** (independen): perubahan `contract.ts`/tipe publik core → **major**; fitur baru backward-compatible → **minor**; bugfix → **patch**.
- Playbook rilis (stabil maupun pre-release `alpha`/`beta`/`rc`) ada di `docs/release.md`.

## Legal & branding — hard rules

- **Jangan pernah** klaim afiliasi resmi dengan Biteship, Komerce, RajaOngkir, Shipper, atau provider lain — di kode, komentar, README, atau nama publik.
- **Jangan** copy-paste dokumentasi API provider secara verbatim. Tulis ulang dengan kata-kata sendiri.
- **Jangan** pakai logo/trademark provider di aset repo.
- **Jangan** commit API key asli/sandbox — pakai placeholder (`YOUR_API_KEY`) atau env var.
- **Jangan scraping** endpoint yang tidak didokumentasikan publik oleh provider.

## Docs

Perubahan perilaku/API yang user-facing sebaiknya diiringi update docsite (`apps/docs`, bahasa Indonesia) dan/atau README package yang relevan.

## Review

PR butuh minimal satu review. Beri komentar yang membangun, dan kalau ragu dengan keputusan desain — tanyakan dulu, jangan asumsi.
