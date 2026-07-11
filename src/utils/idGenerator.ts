// src/utils/idGenerator.ts
// ─── Menggantikan semua Date.now().toString() di seluruh proyek ───────────────
// Gunakan generateId() setiap kali membuat entity baru (service, employee, dll).
// crypto.randomUUID() menghasilkan UUID v4 yang unik secara kriptografis,
// tidak rentan collision seperti Date.now().

/**
 * Generate ID unik yang aman dan tidak rentan collision.
 * Menggantikan pattern Date.now().toString() di seluruh codebase.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
