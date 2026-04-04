import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { ReaderSettings } from "../../types/domain";

type ReaderControlsProps = {
  settings: ReaderSettings;
  setSettings: Dispatch<SetStateAction<ReaderSettings>>;
  className?: string;
  layout?: "panel" | "toolbar";
};

type RangeControlProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
  tone: ControlTone;
};

type SegmentedOption<T extends string | number> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string | number> = {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
  tone: ControlTone;
};

type ControlTone = {
  label: string;
  labelStrong: string;
  valueText: string;
  segmentedActive: string;
  segmentedInactive: string;
  rangeClassName: string;
  toolbarSurface: string;
};

const fontSizePresets = [
  { label: "Small", value: 15 },
  { label: "Medium", value: 19 },
  { label: "Large", value: 25 },
] as const;

function getControlTone(theme: ReaderSettings["theme"], compact: boolean): ControlTone {
  if (!compact) {
    return {
      label: "text-ink-200",
      labelStrong: "",
      valueText: "text-ink-400",
      segmentedActive: "bg-white text-ink-900",
      segmentedInactive: "bg-white/8 text-ink-300 hover:bg-white/14",
      rangeClassName: "w-full accent-amber-400",
      toolbarSurface: "",
    };
  }

  if (theme === "night") {
    return {
      label: "text-[#d2c6b3]",
      labelStrong: "font-medium text-[#f0e8d8]",
      valueText: "text-[#aa9e8b]",
      segmentedActive:
        "border border-[#6c604f] bg-[#f0e8d8] text-[#221d19] shadow-[0_6px_16px_rgba(0,0,0,0.22)]",
      segmentedInactive:
        "border border-[#4b4338] bg-[#2d2722] text-[#d2c6b3] hover:bg-[#393128]",
      rangeClassName: "reader-range reader-range-night w-full",
      toolbarSurface:
        "border border-white/10 bg-[#221d19]/90 shadow-[0_14px_28px_rgba(0,0,0,0.28)]",
    };
  }

  if (theme === "day") {
    return {
      label: "text-[#5c544a]",
      labelStrong: "font-medium text-[#312b24]",
      valueText: "text-[#7c7267]",
      segmentedActive:
        "border border-[#ddd4c5] bg-white text-[#2c261f] shadow-[0_6px_16px_rgba(87,74,52,0.08)]",
      segmentedInactive:
        "border border-[#e8dfd2] bg-[#f1ece4] text-[#6a6256] hover:bg-[#ebe4d9]",
      rangeClassName: "reader-range reader-range-day w-full",
      toolbarSurface:
        "border border-[#ddd4c5] bg-[#f4efe4]/96 shadow-[0_14px_28px_rgba(87,74,52,0.08)]",
    };
  }

  return {
    label: "text-[#5f5447]",
    labelStrong: "font-medium text-[#4e4438]",
    valueText: "text-[#7a6d5e]",
    segmentedActive:
      "border border-[#dfcfb2] bg-white text-[#3e352c] shadow-[0_6px_16px_rgba(131,109,66,0.14)]",
    segmentedInactive:
      "border border-[#e7dcc8] bg-[#ede3d0] text-[#6d6152] hover:bg-[#e8dcc6]",
    rangeClassName: "reader-range reader-range-sepia w-full",
    toolbarSurface:
      "border border-[#decfb8] bg-[#f4ead8]/95 shadow-[0_14px_28px_rgba(77,60,33,0.08)]",
  };
}

function RangeControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
  compact = false,
  tone,
}: RangeControlProps) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <label className={`space-y-2 text-sm ${tone.label}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={compact ? tone.labelStrong : ""}>{label}</span>
        <span className={tone.valueText}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={tone.rangeClassName}
        style={
          {
            "--reader-range-progress": `${progress}%`,
          } as CSSProperties
        }
      />
    </label>
  );
}

function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  compact = false,
  tone,
}: SegmentedControlProps<T>) {
  return (
    <div className={`space-y-2 text-sm ${tone.label}`}>
      <span className={compact ? tone.labelStrong : ""}>{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full px-3 py-2 transition",
              value === option.value ? tone.segmentedActive : tone.segmentedInactive,
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getClosestFontSizePreset(value: number) {
  return fontSizePresets.reduce((closest, preset) => {
    const closestDistance = Math.abs(closest.value - value);
    const presetDistance = Math.abs(preset.value - value);
    return presetDistance < closestDistance ? preset : closest;
  }, fontSizePresets[0]);
}

export function ReaderControls({
  settings,
  setSettings,
  className = "",
  layout = "panel",
}: ReaderControlsProps) {
  const isToolbar = layout === "toolbar";
  const tone = getControlTone(settings.theme, isToolbar);

  return (
    <aside
      className={[
        isToolbar
          ? `w-full rounded-[28px] px-5 py-4 backdrop-blur ${tone.toolbarSurface}`
          : "w-full rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur md:max-w-sm",
        className,
      ].join(" ")}
    >
      <div className={isToolbar ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "space-y-4"}>
        <SegmentedControl
          label="Theme"
          value={settings.theme}
          compact={isToolbar}
          tone={tone}
          options={[
            { label: "Day", value: "day" },
            { label: "Sepia", value: "sepia" },
            { label: "Night", value: "night" },
          ]}
          onChange={(theme) => setSettings((current) => ({ ...current, theme }))}
        />

        <SegmentedControl
          label="Text size"
          value={getClosestFontSizePreset(settings.fontSize).value}
          compact={isToolbar}
          tone={tone}
          options={fontSizePresets}
          onChange={(fontSize) => setSettings((current) => ({ ...current, fontSize }))}
        />

        <RangeControl
          label="Line height"
          min={1.4}
          max={2.3}
          step={0.1}
          value={Number(settings.lineHeight.toFixed(1))}
          compact={isToolbar}
          tone={tone}
          onChange={(lineHeight) =>
            setSettings((current) => ({
              ...current,
              lineHeight,
            }))
          }
        />

        <RangeControl
          label="Paragraph spacing"
          min={0.8}
          max={2}
          step={0.1}
          value={Number(settings.paragraphSpacing.toFixed(1))}
          compact={isToolbar}
          tone={tone}
          onChange={(paragraphSpacing) =>
            setSettings((current) => ({
              ...current,
              paragraphSpacing,
            }))
          }
        />
      </div>
    </aside>
  );
}
