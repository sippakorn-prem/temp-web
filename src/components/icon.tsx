import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FileTextIcon,
  HistoryIcon,
  HouseIcon,
  ImageIcon,
  InfoIcon,
  LandmarkIcon,
  LifeBuoyIcon,
  LockIcon,
  MessageSquareIcon,
  MousePointer2Icon,
  PackageIcon,
  PlusIcon,
  ScaleIcon,
  SendIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StoreIcon,
  TriangleAlertIcon,
  TruckIcon,
  Undo2Icon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

// The design prototype addresses icons by SafeDeal-domain name ("shipment", "refund")
// rather than by glyph. Keep that vocabulary — screens name the concept, this map owns
// which lucide glyph draws it, so a glyph swap happens in one place.
export const icons = {
  alert: CircleAlertIcon,
  audit: FileTextIcon,
  chat: MessageSquareIcon,
  check: CircleCheckIcon,
  clock: ClockIcon,
  close: XIcon,
  conceal: EyeOffIcon,
  complete: CircleCheckIcon,
  copy: CopyIcon,
  deals: BriefcaseIcon,
  download: DownloadIcon,
  encrypted: LockIcon,
  file: FileIcon,
  history: HistoryIcon,
  home: HouseIcon,
  image: ImageIcon,
  info: InfoIcon,
  licensed: LandmarkIcon,
  package: PackageIcon,
  payment: CreditCardIcon,
  pointer: MousePointer2Icon,
  plus: PlusIcon,
  protection: ShieldCheckIcon,
  refund: Undo2Icon,
  reveal: EyeIcon,
  ruling: ScaleIcon,
  send: SendIcon,
  settings: SettingsIcon,
  shipment: TruckIcon,
  store: StoreIcon,
  support: LifeBuoyIcon,
  user: UserIcon,
  verified: BadgeCheckIcon,
  warning: TriangleAlertIcon,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Glyph = icons[name];
  return <Glyph className={className} aria-hidden />;
}
