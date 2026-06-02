import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, PawPrint, Calendar, Scale, Ruler, Activity, Heart, Pencil } from 'lucide-react'
import { Card } from '../components/ui'
import { useAccount, petAgeLabel, speciesLabel, petBmi, bmiGrade, updatePet } from '../lib/accountRepository'
import { AddPetModal } from '../components/AddPetModal'

const C = {
  cream: 'rgb(var(--brand-cream))',
  input: 'rgb(var(--brand-input))',
  border: 'rgb(var(--brand-line))',
  brown: 'rgb(var(--brand-brown))',
  mute: 'rgb(var(--brand-mute))',
  primary: 'rgb(var(--brand-primary))',
}

export function PetDetail() {
  const navigate = useNavigate()
  const { idx } = useParams()
  const account = useAccount()
  const pets = account?.pets ?? []
  const pet = pets[Number(idx)] || null
  const [showEdit, setShowEdit] = useState(false)

  const handleEdit = (updated) => {
    updatePet(Number(idx), updated)
    setShowEdit(false)
  }

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
        <h1 className="flex-1 font-display text-2xl font-bold text-brand-brown leading-tight">반려동물 정보</h1>
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

      {!pet ? (
        <Card className="px-5 py-10 text-center">
          <p className="text-sm text-brand-mute">반려동물 정보를 찾을 수 없어요.</p>
        </Card>
      ) : (
        <PetBody pet={pet} />
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
    </div>
  )
}

function PetBody({ pet }) {
  const ageLabel = petAgeLabel(pet.birthDate)
  const bmi = petBmi(pet.weightKg, pet.heightCm)
  const grade = bmiGrade(bmi)

  return (
    <>
      {/* 프로필 */}
      <Card className="paw-watermark px-5 py-6 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-soft-inset" style={{ background: C.cream }}>
          {pet.photo
            ? <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
            : <PawPrint className="w-10 h-10" style={{ color: C.primary }} />}
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold" style={{ color: C.brown }}>{pet.name || '이름 미입력'}</h2>
        <p className="text-sm" style={{ color: C.mute }}>
          {speciesLabel(pet.species)} · {pet.breed || '품종 미입력'} · {pet.gender === 'F' ? '♀ 암컷' : '♂ 수컷'}
        </p>
      </Card>

      {/* 기본 정보 */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <InfoCell icon={<Calendar className="w-4 h-4" />} label="나이" value={ageLabel || '-'} />
        <InfoCell icon={<Calendar className="w-4 h-4" />} label="생년월일" value={pet.birthDate || '-'} />
        <InfoCell icon={<Scale className="w-4 h-4" />} label="몸무게" value={pet.weightKg ? `${pet.weightKg}kg` : '-'} />
        <InfoCell icon={<Ruler className="w-4 h-4" />} label="키" value={pet.heightCm ? `${pet.heightCm}cm` : '-'} />
      </div>

      {/* 건강 통계 (BMI) */}
      <Card className="mt-4 p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Heart className="w-4 h-4" style={{ color: C.primary }} />
          <p className="text-sm font-bold" style={{ color: C.brown }}>건강 통계</p>
        </div>

        {bmi != null ? (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: C.mute }}>체질량지수 (BMI)</p>
                <p className="font-display text-3xl font-bold leading-none mt-1" style={{ color: C.brown }}>{bmi}</p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: grade.color }}>
                {grade.label}
              </span>
            </div>
            <div className="mt-4 relative h-2.5 rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(90deg,#F0B860,#7FB28A,#F0A56E,#E26D5C)' }}>
              <span
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2"
                style={{ left: `calc(${grade.ratio * 100}% - 6px)`, borderColor: grade.color }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold" style={{ color: C.mute }}>
              <span>저체중</span><span>정상</span><span>과체중</span><span>비만</span>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: C.mute }}>몸무게와 키를 입력하면 BMI 건강 통계를 볼 수 있어요.</p>
        )}
      </Card>

      {/* 활동량 (참고용 mock) */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatCard icon={<Activity className="w-4 h-4" />} label="오늘 활동량" value="68%" />
        <StatCard icon={<PawPrint className="w-4 h-4" />} label="목표 달성" value="3/4회" />
      </div>

      {/* 특이사항 */}
      {pet.notes && (
        <Card className="mt-3 px-4 py-3">
          <p className="text-xs font-bold" style={{ color: C.primary }}>특이사항</p>
          <p className="mt-1 text-sm" style={{ color: C.brown }}>{pet.notes}</p>
        </Card>
      )}
    </>
  )
}

function InfoCell({ icon, label, value }) {
  return (
    <div className="rounded-2xl px-3 py-2.5" style={{ background: C.cream }}>
      <p className="text-[11px] font-semibold flex items-center gap-1" style={{ color: C.mute }}>{icon} {label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: C.brown }}>{value}</p>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <Card className="px-3 py-3 text-center">
      <p className="text-[11px] font-semibold flex items-center justify-center gap-1" style={{ color: C.mute }}>{icon} {label}</p>
      <p className="font-display text-xl font-bold mt-0.5" style={{ color: C.brown }}>{value}</p>
    </Card>
  )
}

export default PetDetail
