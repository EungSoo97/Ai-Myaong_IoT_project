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
  if (["away_person", "fall_detected", "no_motion", "no_motion_emergency", "seizure_suspected"].includes(type)) {
    return "danger";
  }
  if (type === "no_motion_warning") return "warn";
  if (type === "clip_saved") return "primary";
  return "brown";
}

export function visionEventLocation(event) {
  if (event.storage_path) return event.storage_path;
  if (event.type === "away_person") return "외출 모드";
  if (event.type === "capture_saved") return "캡처 이미지";
  if (event.type === "clip_saved") return "클립 저장 완료";
  if (["fall_detected", "no_motion", "no_motion_warning", "no_motion_emergency", "seizure_suspected"].includes(event.type)) {
    return "로봇 비전 긴급 감지";
  }
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
    danger: ["away_person", "fall_detected", "no_motion", "no_motion_emergency", "seizure_suspected"].includes(event.type),
    warning: event.type === "no_motion_warning",
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
    link: ["away_person", "fall_detected", "no_motion", "no_motion_warning", "no_motion_emergency", "seizure_suspected"].includes(event.type)
      ? "/vision"
      : "/activity",
  };
}
