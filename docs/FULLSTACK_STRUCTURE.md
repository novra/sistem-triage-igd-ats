# Struktur Full Stack E-Triase IGD ATS

Dokumen ini adalah rancangan struktur program yang lebih kuat untuk dipakai minimal 5 petugas secara simultan. Targetnya tetap sederhana untuk dijalankan di laptop/server lokal IGD, tetapi sudah memisahkan frontend, backend, database, rule engine, dan audit log.

## Masalah Struktur Saat Ini

Struktur saat ini cukup baik untuk demo atau satu pengguna, tetapi belum ideal untuk pemakaian bersamaan:

- `server.ts` memegang terlalu banyak tanggung jawab: routing, AI provider, rule ATS, database file, export, dan Vite server.
- Penyimpanan memakai `data/triage_records.json`; bila 2-5 user menyimpan bersamaan, ada risiko race condition dan data terakhir menimpa data sebelumnya.
- Belum ada lapisan repository/service, sehingga validasi, audit, dan migrasi database sulit dikontrol.
- Belum ada autentikasi user/petugas yang formal.

## Struktur Folder Rekomendasi

```text
sistem-triage-igd-ats/
  backend/
    src/
      app.ts
      server.ts
      config/
        env.ts
        logger.ts
      database/
        client.ts
        migrations/
          001_init.sql
        schema.sql
      modules/
        auth/
          auth.routes.ts
          auth.service.ts
          auth.types.ts
        triage/
          triage.routes.ts
          triage.controller.ts
          triage.service.ts
          triage.repository.ts
          triage.validation.ts
          triage.types.ts
        ats/
          ats.routes.ts
          ats.service.ts
          atsRuleEngine.ts
          pediatricVitals.ts
          aiProvider.ts
        records/
          records.routes.ts
          records.service.ts
          export.service.ts
        audit/
          audit.service.ts
          audit.repository.ts
      middleware/
        authRequired.ts
        errorHandler.ts
        requestId.ts
        rateLimit.ts
      shared/
        http.ts
        dates.ts
        ids.ts
    tests/
      atsRuleEngine.test.ts
      triage.service.test.ts
    package.json

  frontend/
    src/
      app/
        App.tsx
        routes.tsx
      components/
        triage/
        records/
        layout/
        shared/
      features/
        triage/
          api.ts
          hooks.ts
          types.ts
        records/
          api.ts
          hooks.ts
      lib/
        apiClient.ts
        storage.ts
      styles/
        index.css
    package.json

  shared/
    types/
      triage.ts
      ats.ts
      user.ts

  docs/
    FULLSTACK_STRUCTURE.md
    DEPLOYMENT.md
    DATABASE.md

  .env.example
  package.json
```

## Arsitektur Runtime

```text
Browser petugas 1-5
  -> React frontend
  -> API Express/Fastify backend
  -> Service layer
  -> Repository layer
  -> Database transactional
```

Rekomendasi database:

- Untuk lokal/sederhana: SQLite dengan WAL mode.
- Untuk LAN rumah sakit/produksi kecil: PostgreSQL.

SQLite WAL cukup untuk 5 user simultan bila transaksi write dibuat pendek. PostgreSQL lebih kuat bila nanti dipakai banyak ruangan, multi-device, atau perlu backup terpusat.

## Pembagian Tanggung Jawab

### Frontend

Frontend hanya menangani input, tampilan, validasi ringan, dan pengalaman pengguna.

- `features/triage/api.ts`: panggilan API klasifikasi dan simpan triase.
- `features/triage/hooks.ts`: state dan alur form.
- `components/triage/*`: form identitas, keluhan, vital sign, nyeri, SOAP, hasil ATS.
- `components/records/*`: riwayat, filter, detail, export.

Frontend tidak menentukan ATS final sendiri. Ia hanya menampilkan hasil backend dan override petugas.

### Backend

Backend menjadi sumber kebenaran.

- `triage.controller.ts`: membaca request dan mengirim response.
- `triage.service.ts`: orkestrasi simpan data, klasifikasi, audit log.
- `triage.repository.ts`: operasi database.
- `atsRuleEngine.ts`: guard rail rule-based ATS dewasa/anak.
- `aiProvider.ts`: pemanggilan Gemini/Hugging Face/custom model.
- `audit.service.ts`: catatan siapa melakukan apa dan kapan.

### Database

Minimal tabel:

```sql
users(
  id text primary key,
  name text not null,
  role text not null,
  password_hash text,
  created_at text not null
);

triage_records(
  id text primary key,
  patient_rm text,
  patient_name text,
  patient_age integer,
  payload_json text not null,
  ats_predicted integer,
  ats_final integer,
  emergency_indicator integer not null default 0,
  created_by text,
  created_at text not null,
  updated_at text not null
);

audit_logs(
  id text primary key,
  record_id text,
  user_id text,
  action text not null,
  detail_json text,
  created_at text not null
);
```

Untuk fase awal, `payload_json` boleh menyimpan seluruh struktur triase agar migrasi dari form saat ini cepat. Kolom penting seperti `ats_final`, `patient_rm`, dan `created_at` tetap dibuat terpisah supaya pencarian/filter cepat.

## Alur Simpan Data Aman untuk 5 User

```text
1. Petugas mengisi form di browser.
2. Frontend POST /api/triage/classify.
3. Backend menjalankan:
   - validasi data
   - rule-based ATS guard rail
   - AI provider bila tersedia
   - final safety override
4. Petugas validasi/override bila perlu.
5. Frontend POST /api/triage/records.
6. Backend membuka transaksi database:
   - insert/update triage_records
   - insert audit_logs
   - commit
7. Response sukses dikembalikan.
```

Semua write harus lewat transaksi. Jangan menulis file JSON langsung untuk data klinis aktif.

## Endpoint API Rekomendasi

```text
GET    /api/health
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/me

POST   /api/triage/classify
POST   /api/triage/records
GET    /api/triage/records
GET    /api/triage/records/:id
PATCH  /api/triage/records/:id/final-ats
DELETE /api/triage/records/:id
GET    /api/triage/export

GET    /api/audit/records/:id
```

## Guard Rail ATS

Rule engine harus berdiri sendiri supaya mudah diuji:

```text
atsRuleEngine.ts
  classifyByRules(record) -> {
    level,
    warnings,
    emergency,
    matchedRules
  }
```

Prinsip guard rail:

- Rule paling gawat menang: ATS 1 mengalahkan ATS 2-5.
- AI boleh membantu reasoning, tetapi tidak boleh menurunkan kategori bila rule mendeteksi kondisi lebih gawat.
- Petugas boleh override final, tetapi harus menyimpan nama, jabatan, alasan, dan audit log.

## Konfigurasi Produksi Kecil

Minimal `.env`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./data/triage.db
DATABASE_PROVIDER=sqlite
SESSION_SECRET=change-this-long-random-value
GEMINI_API_KEY=
HUGGINGFACE_API_KEY=
CUSTOM_MODEL_URL=
```

Untuk SQLite:

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
```

`busy_timeout` membantu ketika 2-5 user menyimpan hampir bersamaan.

## Tahap Migrasi dari Repo Saat Ini

1. Pisahkan `server.ts` menjadi `backend/src/app.ts`, routes, service, repository.
2. Pindahkan `runRuleBasedTriageV2` ke `backend/src/modules/ats/atsRuleEngine.ts`.
3. Ganti `triage_records.json` dengan SQLite WAL atau PostgreSQL.
4. Tambahkan audit log untuk simpan, hapus, dan override ATS.
5. Tambahkan login petugas sederhana.
6. Tambahkan test untuk rule ATS dewasa/anak.
7. Baru setelah stabil, pisahkan package frontend/backend bila diperlukan.

## Struktur Ringkas Jika Ingin Tetap Satu Package

Kalau belum ingin memecah package, struktur yang masih praktis:

```text
server/
  app.ts
  routes/
  services/
  repositories/
  database/
  ats/
src/
  components/
  features/
  lib/
  types.ts
```

Ini cukup untuk 5 user simultan selama penyimpanan sudah memakai database transactional, bukan file JSON.

