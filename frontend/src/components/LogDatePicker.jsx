import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "./icons";
import { getLogRawTime, toLogDateKey } from "../lib/logGrouping";

function makeDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeMonthDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay();
  const days = [];

  for (let i = 0; i < startOffset; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export function LogDatePicker({
  items,
  open,
  selectedDate,
  onToggle,
  onSelectDate,
  onClearDate,
  className = "",
}) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(`${selectedDate}T00:00:00`);
    return new Date();
  });

  const availableDates = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      const key = toLogDateKey(getLogRawTime(item));
      if (key) set.add(key);
    });
    return set;
  }, [items]);

  const monthDays = useMemo(() => makeMonthDays(viewDate), [viewDate]);
  const todayKey = makeDateKey(new Date());
  const selectedLabel = selectedDate ? selectedDate.replaceAll("-", ".") : "전체 날짜";

  const moveMonth = (amount) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 h-10 px-3 rounded-2xl bg-brand-cream text-brand-brown border border-dashed border-brand-brown/15 flex items-center justify-center gap-2 text-xs font-bold active:bg-brand-line/60 transition-colors"
        >
          <Calendar className="w-4 h-4 text-brand-primary" />
          <span className="truncate">{selectedDate ? `${selectedLabel} 로그` : "날짜 선택"}</span>
        </button>
        {selectedDate && (
          <button
            type="button"
            onClick={onClearDate}
            className="w-10 h-10 rounded-2xl bg-brand-cream text-brand-mute border border-dashed border-brand-brown/15 flex items-center justify-center active:bg-brand-danger/10 active:text-brand-danger transition-colors"
            aria-label="날짜 선택 해제"
            title="날짜 선택 해제"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-3xl bg-brand-card border border-dashed border-brand-brown/15 shadow-soft p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="w-9 h-9 rounded-2xl bg-brand-cream text-brand-brown flex items-center justify-center active:bg-brand-line/60"
                aria-label="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-display text-base font-bold text-brand-brown">
                {viewDate.getFullYear()}.{String(viewDate.getMonth() + 1).padStart(2, "0")}
              </p>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="w-9 h-9 rounded-2xl bg-brand-cream text-brand-brown flex items-center justify-center active:bg-brand-line/60"
                aria-label="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-brand-mute mb-1">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date, index) => {
                if (!date) return <span key={`empty-${index}`} className="aspect-square" />;

                const key = makeDateKey(date);
                const hasLog = availableDates.has(key);
                const selected = selectedDate === key;
                const today = todayKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => hasLog && onSelectDate(key)}
                    disabled={!hasLog}
                    className={`relative aspect-square rounded-2xl text-xs font-bold flex items-center justify-center transition-colors ${
                      selected
                        ? "bg-brand-primary text-white shadow-soft"
                        : hasLog
                          ? "bg-brand-cream text-brand-brown active:bg-brand-primary/15"
                          : "text-brand-mute/30"
                    } ${today && !selected ? "ring-1 ring-brand-primary/40" : ""}`}
                  >
                    {date.getDate()}
                    {hasLog && (
                      <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${selected ? "bg-white" : "bg-brand-primary"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
