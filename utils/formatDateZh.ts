/** ISO / MySQL 时间 → 中文日期，如 2026年5月16日 */
export function formatDateZh(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** ISO / MySQL 时间 → 2026-3-14：14:05:37（24 小时，中文冒号） */
export function formatDateTimeZh24(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}：${hh}:${mm}:${ss}`;
}
