"use client";

import { icons, type LucideProps } from "lucide-react";
import type { CSSProperties } from "react";

/**
 * Lucide icon by name — same API as the prototype's <Icon name="Users" size={16} />.
 * Names are lucide PascalCase names (e.g. "CheckCircle2", "LayoutDashboard").
 */
export function Icon({
  name,
  size = 16,
  className = "",
  style = {},
  strokeWidth = 2,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[resolve(name)] || icons.Circle;
  return (
    <span className={"inline-flex items-center " + className} style={{ width: size, height: size, lineHeight: 0, ...style }}>
      <Cmp size={size} strokeWidth={strokeWidth} />
    </span>
  );
}

// lucide renamed a few icons over time; map the prototype's names to current ones.
const ALIASES: Record<string, string> = {
  CheckCircle2: "CircleCheck",
  CheckCircle: "CircleCheckBig",
  XCircle: "CircleX",
  AlertCircle: "CircleAlert",
  AlertTriangle: "TriangleAlert",
  PauseCircle: "CirclePause",
  PlayCircle: "CirclePlay",
  HelpCircle: "CircleQuestionMark",
  Building2: "Building",
  Trash2: "Trash",
  History: "RotateCcwClock",
  AlertOctagon: "OctagonAlert",
  BarChart4: "ChartColumnStacked",
  Columns: "Columns2",
  DownloadCloud: "CloudDownload",
  UploadCloud: "CloudUpload",
  FileCheck2: "FileCheck",
  FileSearch2: "FileSearch",
  MessageCircleQuestion: "MessageCircleQuestionMark",
  ShieldQuestion: "ShieldQuestionMark",
  PlusCircle: "CirclePlus",
  MinusCircle: "CircleMinus",
  Loader2: "LoaderCircle",
  BarChart3: "ChartColumn",
  BarChart2: "ChartBar",
  BarChart: "ChartNoAxesColumn",
  LineChart: "ChartLine",
  PieChart: "ChartPie",
  Edit: "SquarePen",
  Edit2: "Pen",
  Edit3: "PenLine",
  CheckSquare: "SquareCheckBig",
  Unlock: "LockOpen",
  Home: "House",
  Grid: "Grid3x3",
  SortAsc: "ArrowUpNarrowWide",
  SortDesc: "ArrowDownWideNarrow",
  MoreHorizontal: "Ellipsis",
  MoreVertical: "EllipsisVertical",
  Filter: "Funnel",
  ShieldAlert: "ShieldAlert",
  Wand2: "WandSparkles",
  Fingerprint: "FingerprintPattern",
};

function resolve(name: string) {
  const all = icons as Record<string, unknown>;
  if (all[name]) return name;
  const alias = ALIASES[name];
  if (alias && all[alias]) return alias;
  const stripped = name.replace(/\d+$/, "");
  if (all[stripped]) return stripped;
  return name;
}
