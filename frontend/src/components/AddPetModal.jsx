import { useEffect, useRef, useState } from 'react'
import { X, PawPrint, Dog, Cat, Camera } from './icons'
import { DateWheel } from './DateWheel'

// 카드 배경: 흰색 80% + 크림 20% (대시보드·마이페이지와 동일) / 정보·입력칸: 따뜻한 탄
const BG_CARD = 'color-mix(in srgb, rgb(var(--brand-card)) 80%, rgb(var(--brand-cream)) 20%)'
const BG_INFO = 'color-mix(in srgb, rgb(var(--brand-cream)) 78%, rgb(var(--brand-mute)) 22%)'

/* 안쪽 점선 바느질 테두리 (펠트 느낌) */
function Stitch({ className = '' }) {
  return (
    <span className={`pointer-events-none absolute inset-[6px] rounded-[18px] border border-dashed border-brand-brown/15 ${className}`} />
  )
}

/* 종이질감 장식 아이콘 — public/icons/*.svg 실루엣을 마스크로, paper.jpg 텍스처를 그 안에만. */
function PaperIcon({ shape, color, className = '', opacity = 1 }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{
        backgroundColor: color,
        backgroundImage: 'url(/paper.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'multiply',
        WebkitMaskImage: `url(/icons/${shape}.svg)`,
        maskImage: `url(/icons/${shape}.svg)`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        opacity,
      }}
    />
  )
}

const TODAY = new Date().toISOString().slice(0, 10) // 미래 생일 선택 방지
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 프로필 이미지 최대 5MB

const emptyPet = () => ({
  name: '', species: 'DOG', breed: '', gender: 'M',
  birthDate: '', age: '', weightKg: '', heightCm: '',
  circumference: '', legLength: '', // (선택) 체지방률 계산용
  photo: '', photoFile: null, notes: '',
})

/**
 * 펫 추가/수정 바텀 시트 (펠트/대시보드 디자인).
 * - 회원가입 펫 입력과 동일한 필드 (몸무게/키 포함 → BMI 계산에 사용)
 * - initial 이 있으면 수정 모드(프리필)
 * - onSave(pet) 로 전달 → 호출부에서 addPet / updatePet
 */
export function AddPetModal({ onClose, onSave, initial = null, title = '반려동물 추가', submitLabel = '추가하기' }) {
  const [pet, setPet] = useState(() => ({ ...emptyPet(), ...(initial || {}) }))
  const [err, setErr] = useState('')
  const [show, setShow] = useState(false) // 바텀 시트 슬라이드 인/아웃
  const fileRef = useRef(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const dismiss = (after) => {
    setShow(false)
    setTimeout(after, 280)
  }

  const set = (k, v) => setPet((p) => ({ ...p, [k]: v }))

  const onPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setErr('이미지는 5MB 이하로 업로드해 주세요.')
      e.target.value = '' // 같은 파일 다시 고를 수 있게 초기화
      return
    }
    setErr('')
    const reader = new FileReader()
    reader.onload = () => setPet((p) => ({ ...p, photo: reader.result, photoFile: file })) // Base64 preview + upload file
    reader.readAsDataURL(file)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!pet.name.trim()) { setErr('이름을 입력해 주세요.'); return }
    if (!pet.breed.trim()) { setErr('품종을 입력해 주세요.'); return }
    if (pet.birthDate && pet.birthDate > TODAY) { setErr('생년월일은 오늘 이후로 선택할 수 없어요.'); return }
    if (pet.age !== '' && Number(pet.age) < 0) { setErr('나이는 0 이상으로 입력해 주세요.'); return }
    dismiss(() => onSave(pet))
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={() => dismiss(onClose)}
    >
      {/* 뒷배경 */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: 'rgba(45,37,32,0.45)', opacity: show ? 1 : 0 }}
      />

      {/* 바텀 시트 */}
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pt-3 pb-8 shadow-soft-lg transition-transform duration-300 ease-out"
        style={{ background: 'rgb(var(--brand-cream))', transform: show ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="mx-auto w-10 h-1.5 rounded-full mb-4" style={{ background: 'rgb(var(--brand-line))' }} />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cute text-xl font-bold text-brand-brown flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-brand-primary" /> {title}
          </h3>
          <button type="button" onClick={() => dismiss(onClose)} aria-label="닫기" className="text-brand-mute touch-active">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 기본 정보 카드 */}
        <section className="relative overflow-hidden rounded-3xl shadow-soft px-5 py-5" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute -right-3 -bottom-3 w-20 h-20 rotate-6" />
          <PaperIcon shape="heart" color="rgb(var(--brand-primary))" opacity={0.5} className="absolute right-5 top-4 w-3.5 h-3.5" />
          <div className="relative z-10">
            {/* 프로필 이미지 — 펫정보 카드처럼 둥근 사각형 */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden border border-dashed border-brand-brown/25"
                style={{ background: BG_INFO }}
              >
                {pet.photo
                  ? <img src={pet.photo} alt="펫" className="w-full h-full object-cover" />
                  : <Camera className="w-7 h-7 text-brand-mute" />}
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white bg-brand-primary border-2 border-white text-lg leading-none">＋</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-brand-mute">
              JPG · PNG · 5MB 이하로 업로드해 주세요
            </p>

            <Field icon={<PawPrint className="w-5 h-5" />} label="이름" value={pet.name}
              onChange={(v) => set('name', v)} placeholder="예: 초코" />

            <Label>종류</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              <Seg active={pet.species === 'DOG'} onClick={() => set('species', 'DOG')} icon={<Dog className="w-5 h-5" />} label="강아지" />
              <Seg active={pet.species === 'CAT'} onClick={() => set('species', 'CAT')} icon={<Cat className="w-5 h-5" />} label="고양이" />
            </div>

            <Field icon={<PawPrint className="w-5 h-5" />} label="품종" value={pet.breed}
              onChange={(v) => set('breed', v)} placeholder="예: 푸들" />

            <Label>성별</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              <Seg active={pet.gender === 'M'} onClick={() => set('gender', 'M')} label="♂ 수컷" />
              <Seg active={pet.gender === 'F'} onClick={() => set('gender', 'F')} label="♀ 암컷" />
            </div>
          </div>
        </section>

        {/* 신체 정보 카드 */}
        <section className="relative overflow-hidden rounded-3xl shadow-soft px-5 py-5 mt-4" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="bone" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute right-4 top-3 w-9 h-9 rotate-12" />
          <div className="relative z-10">
            <h4 className="font-display text-sm font-bold text-brand-brown mb-2">신체 정보</h4>

            <Label>생년월일</Label>
            <div className="mt-1.5">
              <DateWheel value={pet.birthDate} onChange={(v) => set('birthDate', v)} />
            </div>
            <Field label="나이" value={pet.age} onChange={(v) => set('age', v)} placeholder="예: 3" type="number" min="0" />
            <Field label="몸무게 (kg)" value={pet.weightKg} onChange={(v) => set('weightKg', v)} placeholder="예: 4.2" type="number" />
            <Field label="키 (cm)" value={pet.heightCm} onChange={(v) => set('heightCm', v)} placeholder="예: 25" type="number" />
            <Field label={`${pet.species === 'CAT' ? '갈비뼈 둘레' : '골반 둘레'} (cm)`} value={pet.circumference}
              onChange={(v) => set('circumference', v)} placeholder="선택 · 체지방률 계산용" type="number" />
            <Field label="하퇴골 길이 (cm)" value={pet.legLength} onChange={(v) => set('legLength', v)} placeholder="선택 · 체지방률 계산용" type="number" />
          </div>
        </section>

        {/* 특이사항 카드 */}
        <section className="relative overflow-hidden rounded-3xl shadow-soft px-5 py-5 mt-4" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="heart" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute right-4 top-3 w-8 h-8 rotate-6" />
          <div className="relative z-10">
            <h4 className="font-display text-sm font-bold text-brand-brown mb-2">특이사항</h4>
            <textarea
              value={pet.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="알러지, 복용 약, 성격 등"
              className="w-full rounded-2xl px-4 py-3 text-base font-semibold text-brand-brown outline-none resize-none border border-brand-brown/15 focus:border-brand-primary/50 transition-colors placeholder:font-normal placeholder:text-brand-mute/60"
              style={{ backgroundColor: BG_INFO }}
            />
          </div>
        </section>

        {err && <p className="mt-3 text-sm font-bold text-brand-danger">{err}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => dismiss(onClose)}
            className="flex-1 rounded-2xl py-3.5 text-base font-bold text-brand-brown border border-dashed border-brand-brown/20 touch-active"
            style={{ backgroundColor: BG_INFO }}>
            취소
          </button>
          <button type="submit"
            className="flex-1 rounded-2xl py-3.5 text-base font-bold text-white bg-brand-primary shadow-soft touch-active">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

function Label({ children }) {
  return <span className="mt-4 block text-xs font-bold text-brand-mute pl-1">{children}</span>
}

function Field({ icon, label, value, onChange, type = 'text', placeholder, max, min }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-bold text-brand-mute pl-1">{label}</span>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl px-4 py-3.5 border border-brand-brown/15 focus-within:border-brand-primary/50 transition-colors" style={{ backgroundColor: BG_INFO }}>
        {icon && <span className="text-brand-primary">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          max={max}
          min={min}
          className="flex-1 min-w-0 bg-transparent text-base font-semibold text-brand-brown outline-none placeholder:font-normal placeholder:text-brand-mute/60"
        />
      </div>
    </label>
  )
}

function Seg({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl py-3.5 text-base font-bold transition-colors border border-dashed ${
        active ? 'bg-brand-primary text-white border-white/30 shadow-soft' : 'text-brand-brown border-brand-brown/20'
      }`}
      style={active ? undefined : { backgroundColor: BG_INFO }}
    >
      {icon}{label}
    </button>
  )
}

export default AddPetModal
