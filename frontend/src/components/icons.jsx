/*
 * 공용 아이콘 어댑터 — 앱 전체를 둥글둥글 귀여운 "고양이 감성"으로 통일
 *
 * 출처: Phosphor Icons (https://phosphoricons.com) — MIT License
 *   - react-icons (https://react-icons.github.io/react-icons) — MIT License 의 `pi`(Phosphor) 세트를 통해 사용
 *
 * 기존 lucide-react 아이콘 이름을 그대로 유지하면서 Phosphor 아이콘으로 매핑한다.
 * (각 화면은 import 출처만 'lucide-react' → 이 파일로 바꾸면 됨)
 *   - 장식/테마 아이콘: Duotone (부드러운 투톤)
 *   - 기능/내비 아이콘: Bold (또렷하고 둥근)
 * Phosphor 는 기본 color="currentColor" 라 기존 text-* / style color 가 그대로 적용된다.
 */
export {
  // 장식 · 테마 (Duotone)
  PiPulseDuotone as Activity,
  PiWarningDuotone as AlertTriangle,
  PiBellDuotone as Bell,
  PiBellSlashDuotone as BellOff,
  PiCalendarDotsDuotone as Calendar,
  PiCakeDuotone as Cake,
  PiCameraDuotone as Camera,
  PiCatDuotone as Cat,
  PiBoneDuotone as Bone,
  PiCheckCircleDuotone as CheckCircle2,
  PiClockDuotone as Clock,
  PiCookieDuotone as Cookie,
  PiCpuDuotone as Cpu,
  PiDogDuotone as Dog,
  PiDropDuotone as Droplets,
  PiEyeDuotone as Eye,
  PiEyeSlashDuotone as EyeOff,
  PiPawPrintDuotone as Footprints,
  PiHeartDuotone as Heart,
  PiHeartbeatDuotone as HeartPulse,
  PiTrayDuotone as Inbox,
  PiInfoDuotone as Info,
  PiKeyDuotone as KeyRound,
  PiSquaresFourDuotone as LayoutDashboard,
  PiLightbulbDuotone as Lightbulb,
  PiLockDuotone as Lock,
  PiSignInDuotone as LogIn,
  PiSignOutDuotone as LogOut,
  PiEnvelopeDuotone as Mail,
  PiMapPinDuotone as MapPin,
  PiMicrophoneDuotone as Mic,
  PiMicrophoneSlashDuotone as MicOff,
  PiMoonStarsDuotone as Moon,
  PiNavigationArrowDuotone as Navigation,
  PiConfettiDuotone as PartyPopper,
  PiPawPrintDuotone as PawPrint,
  PiPencilSimpleDuotone as Pencil,
  PiPhoneDuotone as Phone,
  PiPhoneCallDuotone as PhoneCall,
  PiAirplaneTiltDuotone as Plane,
  PiPlayDuotone as Play,
  PiPowerDuotone as Power,
  PiBroadcastDuotone as Radio,
  PiRulerDuotone as Ruler,
  PiScalesDuotone as Scale,
  PiGearSixDuotone as Settings,
  PiShieldWarningDuotone as ShieldAlert,
  PiCellSignalHighDuotone as Signal,
  PiSmileyDuotone as Smile,
  PiSparkleDuotone as Sparkles,
  PiStethoscopeDuotone as Stethoscope,
  PiSunDuotone as Sun,
  PiTargetDuotone as Target,
  PiTrashDuotone as Trash2,
  PiTrendDownDuotone as TrendingDown,
  PiTrendUpDuotone as TrendingUp,
  PiUserDuotone as User,
  PiUserMinusDuotone as UserX,
  PiForkKnifeDuotone as UtensilsCrossed,
  PiVideoCameraDuotone as Video,

  // 기능 · 내비게이션 (Bold)
  PiArrowLeftBold as ArrowLeft,
  PiArrowRightBold as ArrowRight,
  PiCheckBold as Check,
  PiChecksBold as CheckCheck,
  PiCaretDownBold as ChevronDown,
  PiCaretLeftBold as ChevronLeft,
  PiCaretRightBold as ChevronRight,
  PiCaretUpBold as ChevronUp,
  PiCircleNotchBold as Loader2,
  PiArrowsOutBold as Maximize2,
  PiArrowsInBold as Minimize2,
  PiMinusBold as Minus,
  PiPlusBold as Plus,
  PiArrowsClockwiseBold as RefreshCw,
  PiRepeatBold as Repeat,
  PiArrowClockwiseBold as RotateCw,
  PiMagnifyingGlassBold as Search,
  PiXBold as X,
} from 'react-icons/pi'

// 와이파이 계열은 Phosphor 가 도형처럼 보여 lucide 원본 유지 (또렷한 부채꼴 모양)
export { Wifi, WifiOff, Router } from 'lucide-react'
