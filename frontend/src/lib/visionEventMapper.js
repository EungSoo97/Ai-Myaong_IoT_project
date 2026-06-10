export function formatVisionEventTime(iso) {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return "";

  const diff = Math.floor((Date.now() - created) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 172800) return "어제";
  return `${Math.floor(diff / 86400)}일 전`;
}

export function visionEventTone(type) {
  if (type === "away_person") return "danger";
  if (type === "clip_saved") return "primary";
  return "brown";
}

export function visionEventLocation(event) {
  if (event.type === "away_person") return "외출 모드";
  if (event.type === "capture_saved") return event.storage_path || "캡처 이미지";
  if (event.type === "clip_saved") return event.storage_path || "클립 저장 완료";
  return event.source || "로봇 비전";
}

export function mapVisionEventForList(event) {
  const stableId = `vision-${event.id}-${Date.parse(event.created_at) || 0}`;
  return {
    id: stableId,
    eventId: event.id,
    type: event.title,
    title: event.title,
    desc: event.message,
    time: formatVisionEventTime(event.created_at),
    rawTime: event.created_at,
    eventType: event.type,
    location: visionEventLocation(event),
    storage_path: event.storage_path,
    clip_id: null,
    danger: event.type === "away_person",
    tone: visionEventTone(event.type),
  };
}

export function mapVisionEventToNotification(event) {
  const stableId = `vision-${event.id}-${Date.parse(event.created_at) || 0}`;
  return {
    id: stableId,
    type: event.type,
    title: event.title,
    desc: event.message,
    time: event.created_at,
    read: false,
    link: event.type === "away_person" ? "/vision" : "/activity",
  };
}
