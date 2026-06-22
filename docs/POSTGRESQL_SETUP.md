# Setup PostgreSQL

Aplikasi sekarang memakai PostgreSQL sebagai database utama.

## 1. Buat Database

Contoh via `psql`:

```sql
create database triage_ats;
```

## 2. Konfigurasi Environment

Buat/isi environment berikut sebelum menjalankan server:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/triage_ats
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=
HUGGINGFACE_API_KEY=
CUSTOM_MODEL_URL=
```

Format umum:

```text
postgres://USER:PASSWORD@HOST:PORT/DATABASE
```

## 3. Jalankan Aplikasi

```bash
npm run dev
```

Saat startup, backend otomatis membuat tabel:

- `triage_records`
- `audit_logs`

## 4. Catatan Simultan 5 User

Backend memakai PostgreSQL connection pool dengan default maksimal 10 koneksi. Penyimpanan triase memakai transaksi, sehingga beberapa petugas bisa menyimpan data bersamaan tanpa menimpa record lain seperti risiko pada file JSON.

