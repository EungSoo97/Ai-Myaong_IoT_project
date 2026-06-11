import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  PawPrint,
  Calendar,
  Scale,
  Ruler,
  Activity,
  Heart,
  Pencil,
  FileText,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Card, PrimaryButton } from "../components/ui";
import {
  useAccount,
  petAgeLabel,
  speciesLabel,
  petBmi,
  bmiGrade,
  updatePet,
  addPet,
  removePet,
  getAccount,
  saveAccount,
} from "../lib/accountRepository";
import { AddPetModal } from "../components/AddPetModal";
import { api } from "../api/api";
import { toApiPet, fromApiPet } from "../lib/petMap";

const C = {
  cream: "rgb(var(--brand-cream))",
  input: "rgb(var(--brand-input))",
  border: "rgb(var(--brand-line))",
  brown: "rgb(var(--brand-brown))",
  mute: "rgb(var(--brand-mute))",
  primary: "rgb(var(--brand-primary))",
};

export function PetDetail() {
  const navigate = useNavigate();
  const { idx } = useParams();
  const account = useAccount();
  const pets = account?.pets ?? [];
  const pet = pets[Number(idx)] || null;
  const [showEdit, setShowEdit] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // 토스트
  const [toast, setToast] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    requestAnimationFrame(() => setToastOn(true));
    toastTimer.current = setTimeout(() => {
      setToastOn(false);
      setTimeout(() => setToast(""), 300);
    }, 2000);
  };

  // 수정 — DB 반영 + 로컬 동기화
  const handleEdit = async (updated) => {
    setShowEdit(false);
    let saved = updated;
    try {
      if (pet?.pet_id) {
        const r = await api.updatePetApi(pet.pet_id, toApiPet(updated));
        saved = fromApiPet(r, updated.photo);
      }
    } catch {
      /* 백엔드 미연결 → 로컬만 */
    }
    updatePet(Number(idx), saved);
    showToast("정보를 수정했어요 ✨");
  };

  // 펫이 없을 때 새로 등록 — DB 반영 + 로컬 동기화
  const handleRegister = async (newPet) => {
    setShowRegister(false);
    let saved = newPet;
    try {
      const r = await api.createPet(toApiPet(newPet));
      saved = fromApiPet(r, newPet.photo);
    } catch {
      /* 백엔드 미연결 → 로컬만 */
    }
    if (!getAccount()) {
      saveAccount({
        provider: "guest",
        user: { userId: "guest", nickname: "집사" },
        pets: [saved],
        createdAt: new Date().toISOString(),
      });
    } else {
      addPet(saved);
    }
    showToast(`🐾 ${saved.name || "반려동물"} 등록 완료`);
  };

  // 삭제 — DB 반영 + 로컬 동기화
  const handleDelete = async () => {
    setBusy(true);
    const name = pet?.name || "반려동물";
    try {
      if (pet?.pet_id) await api.deletePetApi(pet.pet_id);
    } catch {
      /* 백엔드 미연결 → 로컬만 */
    }
    removePet(Number(idx));
    setBusy(false);
    setShowDelete(false);
    showToast(`${name} 정보를 삭제했어요`);
    setTimeout(() => navigate("/"), 700);
  };

  return (
    <div className="px-5 pb-6">
      {/* 헤더 + 뒤로가기 + 수정 */}
      <header className="flex items-center gap-2.5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="w-10 h-10 rounded-2xl bg-brand-card shadow-soft flex items-center justify-center text-brand-brown touch-active shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 font-display text-2xl font-bold text-brand-brown leading-tight">
          반려동물 정보
        </h1>
        {pet && (
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-brand-cream text-brand-brown text-sm font-bold shadow-soft touch-active shrink-0"
          >
            <Pencil className="w-4 h-4" /> 수정
          </button>
        )}
      </header>

      {!pet ?
        <Card className="px-5 py-12 text-center">
          <span className="mx-auto w-16 h-16 rounded-3xl bg-brand-cream flex items-center justify-center mb-3">
            <PawPrint className="w-8 h-8 text-brand-primary/70" />
          </span>
          <p className="font-display text-lg font-bold text-brand-brown">
            아직 등록된 반려동물이 없어요
          </p>
          <p className="text-sm text-brand-mute mt-1">
            우리 아이를 등록하고 건강을 관리해 보세요 🐾
          </p>
          <PrimaryButton
            className="mt-5 mx-auto"
            onClick={() => setShowRegister(true)}
          >
            <PawPrint className="w-4 h-4" /> 반려동물 등록하기
          </PrimaryButton>
        </Card>
      : <PetBody pet={pet} />}

      {pet && (
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="mt-6 mx-auto block text-xs font-semibold text-brand-mute/70 hover:underline underline-offset-2 touch-active"
        >
          반려동물 삭제
        </button>
      )}

      {showEdit && pet && (
        <AddPetModal
          initial={pet}
          title="반려동물 수정"
          submitLabel="저장"
          onClose={() => setShowEdit(false)}
          onSave={handleEdit}
        />
      )}

      {showRegister && (
        <AddPetModal
          title="반려동물 등록"
          submitLabel="등록"
          onClose={() => setShowRegister(false)}
          onSave={handleRegister}
        />
      )}

      {showDelete && pet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => !busy && setShowDelete(false)}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(45,37,32,0.45)" }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] rounded-t-3xl bg-brand-bg px-5 pt-3 pb-8 shadow-soft-lg"
          >
            <div className="mx-auto w-10 h-1.5 rounded-full bg-brand-line mb-4" />
            <div className="text-center">
              <p className="font-display text-lg font-bold text-brand-brown">
                {pet.name}, 정말 보내줄까요?
              </p>
              <p className="text-sm text-brand-mute mt-1.5">
                삭제하면 등록된 정보가 사라져요.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={busy}
                className="flex-1 rounded-2xl py-3.5 text-base font-bold bg-brand-cream text-brand-brown touch-active disabled:opacity-60"
              >
                조금 더 둘게요
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 rounded-2xl py-3.5 text-base font-bold text-white bg-brand-danger shadow-soft touch-active disabled:opacity-60"
              >
                {busy ? "삭제 중…" : "보내주기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 bottom-24 z-[70] px-5 py-3 rounded-2xl shadow-soft-lg text-sm font-bold text-white"
          style={{
            transform: `translateX(-50%) translateY(${toastOn ? "0" : "10px"})`,
            opacity: toastOn ? 1 : 0,
            transition: "all 250ms ease",
            background: "#4B3621",
            maxWidth: "88%",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function PetBody({ pet }) {
  const ageLabel = petAgeLabel(pet.birthDate);
  const bmi = petBmi(pet.weightKg, pet.heightCm);
  const grade = bmiGrade(bmi);

  return (
    <>
      {/* 프로필 */}
      <Card className="paw-watermark px-5 py-6 flex flex-col items-center text-center">
        <div
          className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-soft-inset"
          style={{ background: C.cream }}
        >
          {pet.photo ?
            <img
              src={pet.photo}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          : <PawPrint className="w-10 h-10" style={{ color: C.primary }} />}
        </div>
        <h2
          className="mt-3 font-display text-2xl font-bold"
          style={{ color: C.brown }}
        >
          {pet.name || "이름 미입력"}
        </h2>
        <p className="text-sm" style={{ color: C.mute }}>
          {speciesLabel(pet.species)} · {pet.breed || "품종 미입력"} ·{" "}
          {pet.gender === "F" ? "♀ 암컷" : "♂ 수컷"}
        </p>
      </Card>

      {/* 기본 정보 */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <InfoCell
          icon={<Calendar className="w-4 h-4" />}
          label="나이"
          value={ageLabel || "-"}
        />
        <InfoCell
          icon={<Calendar className="w-4 h-4" />}
          label="생년월일"
          value={pet.birthDate || "-"}
        />
        <InfoCell
          icon={<Scale className="w-4 h-4" />}
          label="몸무게"
          value={pet.weightKg ? `${pet.weightKg}kg` : "-"}
        />
        <InfoCell
          icon={<Ruler className="w-4 h-4" />}
          label="키"
          value={pet.heightCm ? `${pet.heightCm}cm` : "-"}
        />
      </div>

      {/* 건강 통계 (BMI) */}
      <Card className="mt-4 p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Heart className="w-4 h-4" style={{ color: C.primary }} />
          <p className="text-sm font-bold" style={{ color: C.brown }}>
            건강 통계
          </p>
        </div>

        {bmi != null ?
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: C.mute }}>
                  체질량지수 (BMI)
                </p>
                <p
                  className="font-display text-3xl font-bold leading-none mt-1"
                  style={{ color: C.brown }}
                >
                  {bmi}
                </p>
              </div>
              <span
                className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ background: grade.color }}
              >
                {grade.label}
              </span>
            </div>
            <div
              className="mt-4 relative h-2.5 rounded-full overflow-hidden"
              style={{
                background:
                  "linear-gradient(90deg,#F0B860,#7FB28A,#F0A56E,#E26D5C)",
              }}
            >
              <span
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2"
                style={{
                  left: `calc(${grade.ratio * 100}% - 6px)`,
                  borderColor: grade.color,
                }}
              />
            </div>
            <div
              className="mt-1.5 flex justify-between text-[10px] font-semibold"
              style={{ color: C.mute }}
            >
              <span>저체중</span>
              <span>정상</span>
              <span>과체중</span>
              <span>비만</span>
            </div>
          </>
        : <p className="text-sm" style={{ color: C.mute }}>
            몸무게와 키를 입력하면 BMI 건강 통계를 볼 수 있어요.
          </p>
        }
      </Card>

      {/* 활동량 (참고용 mock) */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="오늘 활동량"
          value="68%"
        />
        <StatCard
          icon={<PawPrint className="w-4 h-4" />}
          label="목표 달성"
          value="3/4회"
        />
      </div>

      <HealthReportPanel pet={pet} />

      {/* 특이사항 */}
      {pet.notes && (
        <Card className="mt-3 px-4 py-3">
          <p className="text-xs font-bold" style={{ color: C.primary }}>
            특이사항
          </p>
          <p className="mt-1 text-sm" style={{ color: C.brown }}>
            {pet.notes}
          </p>
        </Card>
      )}
    </>
  );
}

function HealthReportPanel({ pet }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!pet?.pet_id) return undefined;

    setInitialLoading(true);
    setError("");
    api
      .getLatestHealthReport(pet.pet_id)
      .then((data) => {
        if (alive) setReport(data);
      })
      .catch(() => {
        if (alive) setReport(null);
      })
      .finally(() => {
        if (alive) setInitialLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [pet?.pet_id]);

  const handleCreate = async () => {
    if (!pet?.pet_id || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.createHealthReport(pet.pet_id);
      setReport(data);
    } catch (err) {
      setError(err?.message || "건강 리포트를 만들지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const advice = parseReportResult(report?.llm_result);
  const metrics = report?.input_summary?.computed_metrics;
  const quality = report?.input_summary?.data_quality;
  const period = report?.period;

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" style={{ color: C.primary }} />
            <p className="text-sm font-bold" style={{ color: C.brown }}>
              생활 리포트
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mute }}>
            최근 7일의 급식, 급수, 활동 요약을 바탕으로 생성돼요.
          </p>
        </div>
        {report?.risk_level && <RiskBadge risk={report.risk_level} />}
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!pet?.pet_id || loading}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-press touch-active disabled:opacity-60 disabled:active:scale-100"
      >
        {loading ?
          <RefreshCw className="w-4 h-4 animate-spin" />
        : <Sparkles className="w-4 h-4" />}
        {loading ?
          "리포트 생성 중"
        : report ?
          "새 리포트 생성"
        : "건강 리포트 생성"}
      </button>

      {!pet?.pet_id && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: C.mute }}>
          서버에 저장된 반려동물만 리포트를 만들 수 있어요. 로그인 후 반려동물을
          등록해 주세요.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-2xl px-3 py-2.5 bg-brand-danger/10 text-brand-danger text-xs font-semibold leading-relaxed">
          {error}
        </div>
      )}

      {initialLoading ?
        <div
          className="mt-4 rounded-2xl px-4 py-4"
          style={{ background: C.cream }}
        >
          <p className="text-sm font-bold" style={{ color: C.brown }}>
            최근 리포트를 불러오는 중이에요.
          </p>
        </div>
      : report ?
        <div className="mt-4 space-y-3">
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: C.cream }}
          >
            <p className="text-xs font-bold" style={{ color: C.mute }}>
              {period ? `${period.start} ~ ${period.end}` : "최근 리포트"}
            </p>
            <p
              className="mt-1 text-sm font-bold leading-relaxed"
              style={{ color: C.brown }}
            >
              {advice.summary || "리포트 요약을 표시할 수 없어요."}
            </p>
          </div>

          {metrics && (
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric
                label="급식 평균"
                value={formatAmount(metrics.avg_food_g_per_day, "g")}
              />
              <MiniMetric
                label="급수 평균"
                value={formatAmount(metrics.avg_water_ml_per_day, "ml")}
              />
              <MiniMetric
                label="활동 평균"
                value={formatAmount(metrics.avg_activity_level, "")}
              />
            </div>
          )}

          {quality && (
            <p
              className="text-[11px] font-semibold leading-relaxed"
              style={{ color: C.mute }}
            >
              데이터 품질: 급식 {quality.feed_days}일 · 급수{" "}
              {quality.water_days}일 · 활동 {quality.activity_days}일
            </p>
          )}

          <ReferenceComparison items={advice.reference_comparison} />
          <FindingList items={advice.key_findings} />
          <AdviceList items={advice.personalized_advice} />
          <WatchPointList items={advice.watch_points} />
          <ReportList title="분석 한계" items={advice.data_limitations} />

          {advice.disclaimer && (
            <p className="rounded-2xl px-3 py-2.5 bg-brand-warning/15 text-[11px] font-semibold leading-relaxed text-[#8B641C]">
              {advice.disclaimer}
            </p>
          )}
        </div>
      : <p className="mt-3 text-xs leading-relaxed" style={{ color: C.mute }}>
          아직 생성된 리포트가 없어요. 버튼을 누르면 서버가 최근 데이터를
          요약하고 리포트를 저장해요.
        </p>
      }
    </Card>
  );
}

function parseReportResult(value) {
  const fallback = {
    summary: "",
    reference_comparison: [],
    key_findings: [],
    personalized_advice: [],
    watch_points: [],
    data_limitations: [],
    disclaimer: "",
  };
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return {
      summary: parsed.summary || "",
      reference_comparison:
        Array.isArray(parsed.reference_comparison) ?
          parsed.reference_comparison
        : [],
      key_findings:
        Array.isArray(parsed.key_findings) ? parsed.key_findings
        : Array.isArray(parsed.observations) ?
          parsed.observations.map((item) => ({
            title: "관찰 요약",
            evidence: item,
            meaning: "",
          }))
        : [],
      personalized_advice:
        Array.isArray(parsed.personalized_advice) ? parsed.personalized_advice
        : Array.isArray(parsed.advice) ?
          parsed.advice.map((item) => ({
            action: item,
            reason: "",
            check_after: "",
          }))
        : [],
      watch_points:
        Array.isArray(parsed.watch_points) ? parsed.watch_points
        : Array.isArray(parsed.warning_signs) ?
          parsed.warning_signs.map((item) => ({
            item,
            why: "",
            when_to_consult_vet: "",
          }))
        : [],
      data_limitations:
        Array.isArray(parsed.data_limitations) ? parsed.data_limitations : [],
      disclaimer: parsed.disclaimer || "",
    };
  } catch {
    return {
      ...fallback,
      summary: value,
    };
  }
}

function RiskBadge({ risk }) {
  const tone =
    {
      low: "bg-brand-success/20 text-[#2F6A2E]",
      medium: "bg-brand-warning/20 text-[#8B641C]",
      high: "bg-brand-danger/15 text-brand-danger",
      unknown: "bg-brand-brown/10 text-brand-brown",
    }[risk] || "bg-brand-brown/10 text-brand-brown";
  const label =
    {
      low: "낮음",
      medium: "보통",
      high: "높음",
      unknown: "확인 필요",
    }[risk] || "확인 필요";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      {label}
    </span>
  );
}

function ReferenceComparison({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold" style={{ color: C.primary }}>
        품종·나이 기준 비교
      </p>
      <div className="mt-1.5 space-y-2">
        {items.map((item, index) => (
          <div
            key={`reference-${index}`}
            className="rounded-2xl px-3 py-3"
            style={{ background: C.cream }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: C.brown }}>
                {item.metric || "비교 항목"}
              </p>
              {item.judgment && (
                <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold text-brand-brown">
                  {item.judgment}
                </span>
              )}
            </div>
            {item.reference && (
              <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mute }}>
                기준: {item.reference}
              </p>
            )}
            {item.actual && (
              <p className="mt-1 text-xs font-semibold leading-relaxed" style={{ color: C.brown }}>
                실제: {item.actual}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FindingList({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold" style={{ color: C.primary }}>
        핵심 관찰
      </p>
      <div className="mt-1.5 space-y-2">
        {items.map((item, index) => (
          <div key={`finding-${index}`} className="text-sm leading-relaxed">
            <p className="font-bold" style={{ color: C.brown }}>
              {item.title || "관찰"}
            </p>
            {item.evidence && <p style={{ color: C.brown }}>{item.evidence}</p>}
            {item.meaning && (
              <p className="text-xs mt-0.5" style={{ color: C.mute }}>
                {item.meaning}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdviceList({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold" style={{ color: C.primary }}>
        맞춤 조언
      </p>
      <div className="mt-1.5 space-y-2">
        {items.map((item, index) => (
          <div key={`advice-${index}`} className="text-sm leading-relaxed">
            <p className="font-bold" style={{ color: C.brown }}>
              {item.action || "확인할 행동"}
            </p>
            {item.reason && <p style={{ color: C.brown }}>{item.reason}</p>}
            {item.check_after && (
              <p className="text-xs mt-0.5" style={{ color: C.mute }}>
                {item.check_after}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchPointList({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="flex items-center gap-1 text-xs font-bold" style={{ color: C.primary }}>
        <ShieldAlert className="w-3.5 h-3.5" />
        주의 신호
      </p>
      <div className="mt-1.5 space-y-2">
        {items.map((item, index) => (
          <div key={`watch-${index}`} className="text-sm leading-relaxed">
            <p className="font-bold" style={{ color: C.brown }}>
              {item.item || "주의 항목"}
            </p>
            {item.why && <p style={{ color: C.brown }}>{item.why}</p>}
            {item.when_to_consult_vet && (
              <p className="text-xs mt-0.5" style={{ color: C.mute }}>
                {item.when_to_consult_vet}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div
      className="rounded-2xl px-2.5 py-2 text-center"
      style={{ background: C.cream }}
    >
      <p className="text-[10px] font-semibold" style={{ color: C.mute }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: C.brown }}>
        {value}
      </p>
    </div>
  );
}

function ReportList({ title, items, icon = null }) {
  if (!items?.length) return null;
  return (
    <div>
      <p
        className="flex items-center gap-1 text-xs font-bold"
        style={{ color: C.primary }}
      >
        {icon}
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="text-sm leading-relaxed"
            style={{ color: C.brown }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatAmount(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const numeric = Number(value);
  const formatted =
    Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  return unit ? `${formatted}${unit}` : formatted;
}

function InfoCell({ icon, label, value }) {
  return (
    <div className="rounded-2xl px-3 py-2.5" style={{ background: C.cream }}>
      <p
        className="text-[11px] font-semibold flex items-center gap-1"
        style={{ color: C.mute }}
      >
        {icon} {label}
      </p>
      <p className="text-sm font-bold mt-0.5" style={{ color: C.brown }}>
        {value}
      </p>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <Card className="px-3 py-3 text-center">
      <p
        className="text-[11px] font-semibold flex items-center justify-center gap-1"
        style={{ color: C.mute }}
      >
        {icon} {label}
      </p>
      <p
        className="font-display text-xl font-bold mt-0.5"
        style={{ color: C.brown }}
      >
        {value}
      </p>
    </Card>
  );
}

export default PetDetail;
