import {
  AlertCircle, AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, BarChart3, Calendar, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, CircleDot, CircleSlash, Clock,
  CloudUpload, Copy, Eye, EyeOff, FileSpreadsheet, FileText, Filter, Gauge, History, Inbox, Info, Key, LayoutDashboard,
  Link2, Link2Off, ListChecks, Lock, LockKeyhole, LogOut, Mail, Menu, MoreHorizontal, Pencil, Percent, Plus, PlusCircle,
  Printer, RefreshCw, Scale, ScrollText, Search, Settings, Shield, ShieldAlert, ShieldCheck, Siren, SlidersHorizontal,
  Sparkles, Timer, Trash2, Unlock, Upload, User, UserCog, UserPlus, UserRound, UserSearch, Users, Vote, WifiOff, X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Maps the semantic icon names used across the app (originally Material Symbols names) onto Lucide line icons,
 * so the whole platform shares one consistent icon family and no icon web-font has to download.
 */
const ICONS: Record<string, LucideIcon> = {
  // navigation
  dashboard: LayoutDashboard, analytics: BarChart3, groups: Users, group: Users, person_search: UserSearch,
  list_alt: ListChecks, history: History, settings: Settings, description: FileText, manage_accounts: UserCog,
  visibility: Eye, visibility_off: EyeOff, how_to_vote: Vote, menu: Menu, logout: LogOut, account_circle: UserRound,
  person: User, inbox: Inbox,
  // actions
  add: Plus, add_circle: PlusCircle, edit: Pencil, delete: Trash2, close: X, search: Search, refresh: RefreshCw,
  download: ArrowDownToLine, upload_file: Upload, cloud_upload: CloudUpload, content_copy: Copy, print: Printer,
  link: Link2, link_off: Link2Off, mail: Mail, key: Key, group_add: UserPlus, filter: Filter, tune: SlidersHorizontal,
  more: MoreHorizontal, unfold: ChevronsUpDown,
  // arrows
  chevron_right: ChevronRight, chevron_left: ChevronLeft, expand_more: ChevronDown, expand_less: ChevronUp,
  arrow_forward: ArrowRight, arrow_back: ArrowLeft, arrow_upward: ArrowUp,
  // status
  check: Check, check_circle: CheckCircle2, verified: BadgeCheck, verified_user: ShieldCheck, gpp_good: ShieldCheck,
  shield: Shield, security: ShieldCheck, lock: Lock, lock_person: LockKeyhole, lock_clock: LockKeyhole, lock_open: Unlock,
  error: AlertCircle, warning: AlertTriangle, info: Info, emergency: Siren, report: ShieldAlert, block: CircleSlash,
  timer: Timer, schedule: Clock, event: Calendar, wifi_off: WifiOff, balance: Scale, percent: Percent,
  speed: Gauge, receipt: ScrollText, table: FileSpreadsheet, radio: CircleDot, spark: Sparkles,
};

export interface IconProps {
  name: string;
  className?: string;
  /** Kept for API compatibility: Lucide is outline-only, so "filled" draws a slightly heavier stroke. */
  filled?: boolean;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, className, filled = false, size = 20, strokeWidth }: IconProps) {
  const Glyph = ICONS[name] ?? CircleDot;
  if (import.meta.env.DEV && !ICONS[name]) console.warn(`[Icon] no mapping for "${name}"`);
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={strokeWidth ?? (filled ? 2.25 : 1.75)}
      className={cn('inline-block shrink-0 align-middle', className)}
    />
  );
}
