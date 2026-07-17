# Kejohanan Olahraga Tahunan SK Ranggu

Laman rasmi Sistem Kejohanan Olahraga Tahunan Sekolah Kebangsaan Ranggu, Peti Surat 842, 91008 Tawau, Sabah.

## Cara admin mengisi maklumat

1. Buka fail `data.json` dalam repositori ini.
2. Tekan ikon pensel **Edit this file**.
3. Cari tahun yang mahu dikemas kini, bermula tahun 2026.
4. Isi maklumat rumah sukan, peserta, kawad kaki, atur cara dan keputusan.
5. Tekan **Commit changes**. Laman awam akan dikemas kini secara automatik.

Lima rumah sukan ialah **Merah, Biru, Kuning, Hijau dan Purple**. Semua data bermula kosong dan hanya akan dipaparkan selepas admin mengisinya.

### Contoh peserta

Masukkan dalam senarai `participants` bagi rumah berkenaan:

```json
{ "name": "Nama Murid", "event": "100m Tahun 6", "category": "Balapan" }
```

### Contoh keputusan

Masukkan dalam senarai `results` bagi tahun berkenaan. Jadual pingat dikira secara automatik daripada `place` 1, 2 dan 3.

```json
{ "athlete": "Nama Murid", "event": "100m Tahun 6", "house": "Merah", "place": 1, "mark": "13.25s" }
```

### Contoh atur cara

```json
{ "time": "8:00 pagi", "event": "100m Tahun 6", "category": "Balapan", "venue": "Padang SK Ranggu", "status": "Dijadualkan", "note": "Saringan" }
```

Hanya pengguna GitHub yang mempunyai kebenaran menulis pada repositori boleh menyimpan perubahan. Orang ramai hanya boleh melihat laman GitHub Pages.

— Dibangunkan oleh Cikgu Mohammad Fikrey bin Abdul Gapar.
