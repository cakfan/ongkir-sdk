# AGENTS.md — ongkir-sdk

Aturan operasional untuk AI coding agent yang bekerja di repo ini. Baca `PRD.md`, `ARCHITECTURE.md`, dan `ROADMAP.md` dulu sebelum mulai kerja apa pun.

---

## 1. Prinsip dasar

- **Design before development**: semua keputusan arsitektur ada di `ARCHITECTURE.md`. Kalau task butuh keputusan yang belum ada di dokumen itu (bukan sekadar detail implementasi kecil), **stop dan tanya dulu** — jangan improvisasi keputusan arsitektur sendiri.
- **Contract di `@ongkir-sdk/core` adalah sumber kebenaran.** Provider adapter (`biteship`, `komerce`, dst) menyesuaikan diri ke contract, bukan sebaliknya. Kalau provider baru butuh field yang tidak ada di contract, itu tanda perlu diskusi ulang desain — bukan alasan untuk hardcode workaround di satu adapter.
- **Core tidak pernah import dari package provider.** Arah dependency selalu: provider → core. Kalau ada kebutuhan yang bikin core harus tahu provider spesifik, itu red flag desain.

## 2. Scope kerja per fase

Ikuti urutan fase di `ROADMAP.md`. Jangan kerjakan task Fase 2+ sebelum exit criteria fase sebelumnya terpenuhi, kecuali diminta eksplisit.

- **v1 = read-only.** `createShipment` **tidak boleh** ditambahkan ke `contract.ts` atau adapter mana pun sebelum Fase 4 secara eksplisit dimulai. Kalau ada task yang menyinggung "buat order pengiriman", konfirmasi dulu apakah ini memang sudah masuk Fase 4.

## 3. Konvensi kode

- **TypeScript, runtime-agnostic** — jangan pakai API spesifik Node (`fs`, `crypto` Node-native module). Pakai Web-standard API (`fetch`, `crypto.subtle`, `Headers`, `Request`/`Response`).
- **Dependency injection untuk HTTP client** — provider adapter menerima `httpClient` sebagai parameter constructor/config, bukan hardcode `fetch` langsung. Ini yang bikin testing tanpa API key asli bisa jalan.
- **Error selalu dinormalisasi** ke `ShippingSDKError` sebelum keluar dari adapter. Jangan biarkan raw error/response provider bocor ke consumer.
- **Package manager: Bun.** Semua script pakai `bun run`, bukan `npm run`/`pnpm run`.
- **Build**: `tsup`, output dual ESM + CJS + `.d.ts`. Jangan commit hasil build (`dist/`) ke git.

## 4. Testing — wajib sebelum PR/commit selesai

- Provider adapter baru **wajib** lulus `runProviderContractTests()` dari `@ongkir-sdk/core/testing` sebelum dianggap selesai.
- Unit test mapper (request/response transform) terpisah dari contract test.
- **Tidak boleh** menambahkan test yang butuh API key asli/live call ke provider di suite yang jalan di CI. Kalau perlu integration test manual, taruh di folder `manual/` package yang bersangkutan dengan nama file **bukan** berakhiran `.test.ts` (misal `manual/live.ts`) — `bun test` ikut men-scan glob `*.test.ts`, jadi akhiran `.manual.test.ts` pun tetap ketarik ke CI. Dokumentasikan cara jalankannya di `manual/README.md`.
- Fixture response provider disimpan di `__fixtures__/`, bukan di-generate on-the-fly dari live call.

## 5. Legal & branding — hard rules

- **Jangan pernah** klaim afiliasi resmi dengan Biteship, Komerce, RajaOngkir, atau provider lain di kode, komentar, README, atau nama variabel/package publik.
- **Jangan** copy-paste teks dokumentasi API provider secara verbatim ke README/JSDoc/komentar kode. Tulis ulang dengan kata-kata sendiri kalau perlu menjelaskan behavior provider.
- **Jangan** gunakan logo/trademark provider di aset repo (README image, favicon, dst).
- Setiap README package provider (`biteship`, `komerce`, dst) wajib punya disclaimer unofficial di bagian atas — jangan dihapus saat update README.

## 6. Versioning & release

- Rilis dikelola lewat **Changesets**, bukan manual bump `package.json`.
- Kalau mengerjakan perubahan yang perlu rilis, tambahkan changeset (`bunx changeset`) sebagai bagian dari task — jangan tinggalkan untuk manusia lakukan terpisah, kecuali diminta.
- Versioning **independen per package**. Perubahan di satu provider adapter tidak otomatis bump versi package lain.
- **SemVer per package**: perubahan `contract.ts`/tipe publik `core` → major; fitur baru backward-compatible → minor; bugfix → patch. Playbook lengkap di `docs/release.md`.
- **Pre-release memakai Changesets pre-mode** dengan dist-tag per stage: `bun run changeset:enter alpha|beta|rc` → `changeset version` (jadi `X.Y.Z-<stage>.0`) → push (release.yml publish ke dist-tag stage). Naik stage: `changeset:exit` dulu lalu `enter` stage baru. Finalisasi: `changeset:exit` → `changeset version` (stabil, `latest`).
- **Jangan pernah** push commit yang berisi `.changeset/pre.json` dengan `mode: pre` kalau tujuannya rilis stabil — CI akan publish ke dist-tag stage, bukan `latest`.

## 7. Larangan eksplisit

- **Jangan scraping** endpoint yang tidak didokumentasikan publik oleh provider mana pun, dengan alasan apa pun (termasuk "biar lebih lengkap datanya").
- **Jangan tambahkan** backend/server yang menyimpan atau mem-proxy API key user. SDK ini bring-your-own-key, murni client-side library (kecuali `@ongkir-sdk/hono` yang jalan di server milik consumer sendiri, bukan server milik proyek ini).
- **Jangan** commit API key asli/sandbox ke repo, termasuk di fixture atau contoh kode. Pakai placeholder (`YOUR_API_KEY`) atau env var.

## 8. Kalau ragu

Kalau instruksi task ambigu antara "detail implementasi kecil" (boleh diputuskan sendiri, ikuti pola yang sudah ada di `ARCHITECTURE.md`) vs "keputusan arsitektur baru" (perlu dikonfirmasi dulu), **default ke bertanya**, terutama untuk:
- Perubahan bentuk `contract.ts` atau tipe publik di core.
- Penambahan dependency baru ke `package.json` mana pun.
- Apa pun yang menyentuh Fase yang belum "exit criteria"-nya terpenuhi di ROADMAP.