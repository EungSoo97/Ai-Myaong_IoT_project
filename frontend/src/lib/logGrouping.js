function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getLogRawTime(item) {
  return item?.rawTime || item?.created_at || item?.time || "";
}

export function toLogDateKey(rawTime) {
  const date = new Date(rawTime);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatLogDateLabel(rawTime) {
  const date = new Date(rawTime);
  if (Number.isNaN(date.getTime())) return "날짜 없음";

  const today = new Date();
  const diffDays = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function filterLogsByDate(items, dateKey) {
  if (!dateKey) return items;
  return items.filter((item) => toLogDateKey(getLogRawTime(item)) === dateKey);
}

export function groupLogsByDate(items) {
  return items.reduce((groups, item) => {
    const label = formatLogDateLabel(getLogRawTime(item));
    const last = groups[groups.length - 1];

    if (last?.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }

    return groups;
  }, []);
}
