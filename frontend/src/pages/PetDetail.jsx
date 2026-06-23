import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  PawPrint,
  Calendar,
  Scale,
  Ruler,
  Cake,
  Bone,
  Heart,
  Pencil,
} from '../components/icons';
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

// 카드 배경: 흰색 80% + 크림 20% (지정) / 정보칸: 따뜻한 탄
const BG_CARD = "color-mix(in srgb, rgb(var(--brand-card)) 80%, rgb(var(--brand-cream)) 20%)";
const BG_INFO = "color-mix(in srgb, rgb(var(--brand-cream)) 78%, rgb(var(--brand-mute)) 22%)";

/* 펠트/스티치 느낌 카드 — 안쪽에 점선 테두리(바느질) */
function FeltCard({ bg, className = "", children }) {
  return (
    <div className="relative rounded-3xl shadow-soft" style={{ backgroundColor: bg }}>
      <span className="pointer-events-none absolute inset-[6px] rounded-[18px] border-2 border-dashed border-brand-brown/20" />
      <div className={`relative ${className}`}>{children}</div>
    </div>
  );
}

/* 종이질감 장식 아이콘 — 아이콘 실루엣(public/icons/*.svg)을 마스크로 써서
 * paper.jpg 텍스처를 그 모양 "안에만" 보이게 한다.
 * 아이콘 출처: Phosphor Icons (MIT) — public/icons/{paw,bone,heart}.svg */
function PaperIcon({ shape, color, className = "", opacity = 1 }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{
        backgroundColor: color,
        backgroundImage: "url(/paper.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "multiply",
        WebkitMaskImage: `url(/icons/${shape}.svg)`,
        maskImage: `url(/icons/${shape}.svg)`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        opacity,
      }}
    />
  );
}

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
    const { photoFile, ...localPet } = updated;
    let saved = localPet;
    try {
      if (pet?.pet_id) {
        const r = await api.updatePetApi(pet.pet_id, toApiPet(updated));
        saved = fromApiPet(r, updated.photo);
        if (photoFile) {
          const photoResult = await api.uploadPetPhoto(pet.pet_id, photoFile);
          saved = fromApiPet(photoResult, updated.photo);
        }
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
    const { photoFile, ...localPet } = newPet;
    let saved = localPet;
    try {
      const r = await api.createPet(toApiPet(newPet));
      saved = fromApiPet(r, newPet.photo);
      if (photoFile) {
        const photoResult = await api.uploadPetPhoto(r.pet_id, photoFile);
        saved = fromApiPet(photoResult, newPet.photo);
      }
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
      <header className="flex items-center gap-2 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="w-9 h-9 -ml-1 flex items-center justify-center text-brand-brown touch-active shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 font-cute text-2xl font-bold text-brand-brown leading-tight">
          반려동물 정보
        </h1>
        {pet && (
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-2xl border-2 border-dashed border-brand-brown/25 text-brand-brown text-sm font-bold shadow-soft touch-active shrink-0"
            style={{ backgroundColor: BG_INFO }}
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
  const ageLabel =
    pet.age !== "" && pet.age != null ?
      `${pet.age}살`
    : petAgeLabel(pet.birthDate);
  const bmi = petBmi(pet.weightKg, pet.heightCm);
  const grade = bmiGrade(bmi);

  return (
    <>
      {/* 프로필 카드 */}
      <FeltCard bg={BG_CARD} className="overflow-hidden px-5 py-6">
        {/* 종이질감 장식 (발바닥·뼈) */}
        <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.14} className="absolute left-4 top-5 w-9 h-9 -rotate-12" />
        <PaperIcon shape="bone" color="rgb(var(--brand-primary-deep))" opacity={0.13} className="absolute right-6 top-7 w-9 h-9 rotate-12" />
        <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute right-5 bottom-3 w-14 h-14 rotate-6" />
        <PaperIcon shape="bone" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute left-5 bottom-6 w-8 h-8 -rotate-12" />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative">
            <div className="aura-glow pointer-events-none absolute -inset-2 rounded-full blur-xl" style={{ background: "rgb(var(--brand-primary) / 0.16)" }} />
            <div
              className="relative w-28 h-28 rounded-full overflow-hidden flex items-center justify-center shadow-soft-inset ring-1 ring-brand-line/70"
              style={{ backgroundColor: BG_INFO }}
            >
              {pet.photo ?
                <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
              : <PaperIcon shape="paw" color="rgb(var(--brand-primary))" className="w-14 h-14" />}
            </div>
          </div>
          <p className="mt-4 text-sm font-bold" style={{ color: C.mute }}>
            내 소중한 단짝
          </p>
          <h2 className="font-display text-[28px] font-extrabold leading-tight" style={{ color: C.brown }}>
            {pet.name || "이름 미입력"}
          </h2>
          <p className="mt-1 text-sm font-semibold" style={{ color: C.mute }}>
            {speciesLabel(pet.species)} · {pet.breed || "품종 미입력"} ·{" "}
            {pet.gender === "F" ? "♀ 암컷" : "♂ 수컷"}
          </p>
        </div>
      </FeltCard>

      {/* 기본 정보 4칸 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <InfoCell bigIcon={<Cake className="w-9 h-9" />} iconColor="text-brand-primary" label="나이" value={ageLabel || "-"} />
        <InfoCell bigIcon={<Calendar className="w-9 h-9" />} iconColor="text-brand-primary-deep" label="생년월일" value={pet.birthDate || "-"} />
        <InfoCell bigIcon={<Scale className="w-9 h-9" />} iconColor="text-brand-water" label="몸무게" value={pet.weightKg ? `${pet.weightKg}kg` : "-"} />
        <InfoCell bigIcon={<Ruler className="w-9 h-9" />} iconColor="text-brand-warning" label="키" value={pet.heightCm ? `${pet.heightCm}cm` : "-"} />
      </div>

      {/* 건강 통계 (BMI) */}
      <FeltCard bg={BG_CARD} className="overflow-hidden mt-3 p-5">
        <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute right-6 top-4 w-10 h-10 rotate-6" />
        <PaperIcon shape="bone" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute left-6 bottom-3 w-8 h-8 -rotate-12" />

        <div className="relative">
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
                  <p className="font-display text-3xl font-bold leading-none mt-1" style={{ color: C.brown }}>
                    {bmi}
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: grade.color }}>
                  {grade.label}
                </span>
              </div>
              <div
                className="mt-4 relative h-2.5 rounded-full overflow-hidden"
                style={{ background: "linear-gradient(90deg,#F0B860,#7FB28A,#F0A56E,#E26D5C)" }}
              >
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2"
                  style={{ left: `calc(${grade.ratio * 100}% - 6px)`, borderColor: grade.color }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-semibold" style={{ color: C.mute }}>
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
        </div>
      </FeltCard>

      {/* 특이사항 */}
      {pet.notes && (
        <FeltCard bg={BG_CARD} className="mt-3 px-4 py-3">
          <p className="text-xs font-bold" style={{ color: C.primary }}>
            특이사항
          </p>
          <p className="mt-1 text-sm" style={{ color: C.brown }}>
            {pet.notes}
          </p>
        </FeltCard>
      )}
    </>
  );
}

function InfoCell({ bigIcon, iconColor, label, value }) {
  return (
    <FeltCard bg={BG_INFO} className="overflow-hidden px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold" style={{ color: "rgb(var(--brand-brown) / 0.7)" }}>
            {label}
          </p>
          <p className="mt-1 text-lg font-extrabold leading-none truncate" style={{ color: C.brown }}>
            {value}
          </p>
        </div>
        <span className={`shrink-0 ${iconColor}`}>{bigIcon}</span>
      </div>
    </FeltCard>
  );
}

export default PetDetail;
