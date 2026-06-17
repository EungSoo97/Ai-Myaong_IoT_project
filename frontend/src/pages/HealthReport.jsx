import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Sparkles } from '../components/icons';
import { Card } from "../components/ui";
import { HealthReportPanel } from "../components/HealthReportPanel";
import { useAccount, speciesLabel } from "../lib/accountRepository";

/**
 * AI 건강 분석 전용 페이지.
 * - /health-report/:idx 로 진입 (idx = 펫 인덱스, 대시보드는 0번 펫)
 * - 최신 리포트 조회 + 새 리포트 생성은 HealthReportPanel 이 담당
 */
export function HealthReport() {
  const navigate = useNavigate();
  const { idx } = useParams();
  const account = useAccount();
  const pets = account?.pets ?? [];
  const pet = pets[Number(idx)] || null;

  return (
    <div className="px-5 pb-6">
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
          AI 건강 분석
        </h1>
      </header>

      {/* 인트로 — 차분하게(시선은 아래 분석으로) */}
      <div className="flex items-start gap-2.5 px-1">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-brand-mute" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-brand-brown">
            {pet ? `${pet.name}의 생활 리포트` : "우리 아이 생활 리포트"}
          </p>
          <p className="mt-0.5 text-xs text-brand-mute leading-relaxed">
            최근 7일의 급식·급수·활동 데이터를 AI가 분석해 건강 상태를 알려드려요.
          </p>
        </div>
      </div>

      {pet ?
        <HealthReportPanel pet={pet} />
      : <Card className="mt-4 px-5 py-12 text-center">
          <p className="text-sm font-bold text-brand-brown">
            등록된 반려동물이 없어요
          </p>
          <p className="mt-1 text-xs text-brand-mute leading-relaxed">
            반려동물을 먼저 등록하면 AI 건강 분석을 받아볼 수 있어요.
          </p>
        </Card>
      }
    </div>
  );
}

export default HealthReport;
