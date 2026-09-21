// schemas/index.ts

// =========================================================
// PROGRAM & KONTEN
// =========================================================

import program from './program';
import news from './news';
import category from './category';
import donationTransaction from './donationTransaction';
import laporan from './laporan';
import heroBanner from './slider';

// =========================================================
// FUNDRAISER
// =========================================================

// Data profil / pendaftaran fundraiser
import fundraiser from './fundraiser';

// Data pengajuan & riwayat penarikan komisi fundraiser
import fundraiserWithdrawal from './fundraiserWithdrawal';

// =========================================================
// DAFTAR SELURUH SCHEMA
// =========================================================

export const schemaTypes = [
  // =======================================================
  // PROGRAM DONASI
  // =======================================================

  program,

  // =======================================================
  // LAPORAN
  // =======================================================

  laporan,

  // =======================================================
  // KATEGORI
  // =======================================================

  category,

  // =======================================================
  // BERITA / ARTIKEL
  // =======================================================

  news,

  // =======================================================
  // TRANSAKSI DONASI
  // =======================================================

  donationTransaction,

  // =======================================================
  // FUNDRAISER
  // =======================================================

  // Pendaftaran / profil fundraiser
  fundraiser,

  // Pengajuan & riwayat pencairan komisi
  fundraiserWithdrawal,

  // =======================================================
  // HERO BANNER / SLIDER
  // =======================================================

  heroBanner,
];