# Release & Versioning — playbook maintainer

`ongkir-sdk` adalah monorepo dengan **versioning independen per package** yang dikelola lewat **Changesets**. Rilis stabil maupun pre-release (`alpha`/`beta`/`rc`) semua lewat alur yang sama: push ke `main`, lalu `.github/workflows/release.yml` mem-publish versi yang belum ada di npm dengan dist-tag yang benar.

---

## Kebijakan SemVer

Setiap package mengikuti SemVer (`MAJOR.MINOR.PATCH`). Versioning **independen** — perubahan di satu provider tidak otomatis bump package lain.

| Bump | Kapan |
|---|---|
| **MAJOR** | Breaking change. Untuk `@ongkir-sdk/core`: perubahan `contract.ts` atau tipe publik wajib major. |
| **MINOR** | Fitur baru backward-compatible (mis. adapter provider baru, method baru yang opsional). |
| **PATCH** | Bugfix, perbaikan dokumentasi, perubahan internal tanpa efek API. |

Aturan tambahan:

- **`core` adalah sumber kebenaran contract.** Kalau sebuah perubahan menyentuh bentuk `contract.ts`, itu keputusan arsitektur — diskusikan dulu (lihat `ARCHITECTURE.md` & `AGENTS.md`) sebelum menulis changeset.
- Jangan bump `package.json` secara manual; selalu lewat Changesets (`bunx changeset`).
- `dist/` tidak di-commit; build terjadi di CI sebelum publish.

---

## Stage rilis

Pre-release SemVer memakai suffix setelah versi: `X.Y.Z-alpha.1`, `X.Y.Z-beta.0`, `X.Y.Z-rc.1`. Urutan SemVer: `alpha < beta < rc < rilis stabil`. Versi pre-release **tidak ke-match** range `^`/`~` di consumer — ini justru tujuannya: orang yang `npm install @ongkir-sdk/core` tidak akan menerima build pre-release secara tidak sengaja.

| Stage | Dist-tag npm | Kapan dipakai |
|---|---|---|
| `alpha` | `alpha` | Fitur belum lengkap, API masih berubah. Buat testing awal / feedback desain contract. |
| `beta` | `beta` | Feature-complete, API sudah hampir final, masih ada bug. Buat uji coba lebih luas. |
| `rc` | `rc` | *Release candidate*: API dibekukan, hanya perbaikan bug. Sebelum naik ke `latest`. |
| stabil | `latest` | Rilis normal yang boleh dipakai production. |

Satu siklus pre-release memakai satu stage. Kalau sudah di `alpha` lalu mau naik ke `beta`, **keluar dulu** dari pre-mode lalu masuk lagi dengan stage baru (lihat alur di bawah).

---

## Alur rilis stabil (normal)

Rilis biasa cukup tambah changeset, bump, lalu push — CI yang publish.

```bash
bunx changeset            # pilih package + level bump + tulis deskripsi
bun run changeset:version # = changeset version, update package.json + CHANGELOG.md
git add -A && git commit  # commit hasil version
git push                  # push ke main → release.yml publish ke latest
```

Setelah push, verifikasi di [npm](https://www.npmjs.com/settings/cakfan/packages) bahwa dist-tag `latest` menunjuk ke versi baru.

---

## Alur pre-release (alpha / beta / rc)

Tujuan: publish versi pre-release ke dist-tag stage tertentu tanpa mencemari `latest`.

### 1. Masuk pre-mode

```bash
bun run changeset:enter alpha   # atau beta / rc
```

Ini membuat `.changeset/pre.json` dengan `{ "mode": "pre", "tag": "alpha", ... }`. Perintah berikutnya (`changeset version`) otomatis menghasilkan versi ber-suffix sesuai `tag`.

### 2. Tambah changeset & bump

```bash
bunx changeset             # perubahan fitur/bugfix seperti biasa
bun run changeset:version  # → contoh: core 2.1.0-alpha.0, biteship 1.2.0-alpha.0
git add -A && git commit
git push                   # release.yml publish dengan --tag alpha
```

Iterasi berikutnya di stage yang sama cukup ulangi langkah 2 — versi naik ke `.1`, `.2`, dst.

### 3. Naik stage (mis. alpha → beta)

```bash
bun run changeset:exit     # hapus .changeset/pre.json
bun run changeset:enter beta
bun run changeset:version  # → contoh: core 2.1.0-beta.0
git add -A && git commit
git push
```

### 4. Finalisasi ke rilis stabil

```bash
bun run changeset:exit     # keluar pre-mode
bun run changeset:version  # → contoh: core 2.1.0 (stabil), dist-tag latest
git add -A && git commit
git push
```

> **Perhatian:** jangan pernah push commit yang berisi `.changeset/pre.json` dengan `mode: pre` ke `main` saat berencana rilis stabil — release.yml akan menganggapnya pre-release dan publish ke dist-tag stage, bukan `latest`.

---

## Cara kerja CI (`.github/workflows/release.yml`)

- Trigger: push ke `main` (setelah lint/typecheck/test/build).
- Deteksi tag: jika `.changeset/pre.json` ada dan `mode === "pre"`, publish pakai `--tag <tag>` dari file itu; selain itu publish tanpa tag (default `latest`).
- Publish per package yang versinya belum ada di npm (skip logic `npm view "$name@$version"`), urut: `core`, `biteship`, `komerce`, `shipper`, `cache-memory`, `hono`.

Jangan ubah urutan publish tanpa alasan — `core` harus lebih dulu karena package lain ber-dependency ke sana.

---

## Verifikasi setelah rilis

```bash
npm view @ongkir-sdk/core dist-tags
# contoh hasil:
# {
#   latest: '2.1.0',
#   alpha: '2.1.0-alpha.0',
#   beta: '2.1.0-beta.0'
# }
```

Cek bahwa `latest` selalu menunjuk rilis stabil, bukan versi pre-release.
