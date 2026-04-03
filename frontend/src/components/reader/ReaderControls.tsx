import type { Dispatch, SetStateAction } from "react";
import type { ReaderSettings } from "../../types/domain";

type ReaderControlsProps = {
  settings: ReaderSettings;
  setSettings: Dispatch<SetStateAction<ReaderSettings>>;
};

type RangeControlProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

function RangeControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: RangeControlProps) {
  return (
    <label className="space-y-2 text-sm text-ink-200">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-ink-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-400"
      />
    </label>
  );
}

export function ReaderControls({ settings, setSettings }: ReaderControlsProps) {
  return (
    <aside className="w-full rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur md:max-w-sm">
      <div className="mb-5">
        <h2 className="font-medium text-white">Reader settings</h2>
        <p className="mt-1 text-sm text-ink-400">
          Tuned for long sessions with quiet visual controls.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2 text-sm text-ink-200">
          <span>Theme</span>
          <div className="grid grid-cols-3 gap-2">
            {(["day", "sepia", "night"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setSettings((current) => ({ ...current, theme }))}
                className={[
                  "rounded-full px-3 py-2 capitalize transition",
                  settings.theme === theme
                    ? "bg-white text-ink-900"
                    : "bg-white/8 text-ink-300 hover:bg-white/14",
                ].join(" ")}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-sm text-ink-200">
          <span>Font family</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["literary", "Book"],
                ["serif", "Serif"],
                ["sans", "Sans"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setSettings((current) => ({ ...current, fontFamily: value }))
                }
                className={[
                  "rounded-full px-3 py-2 transition",
                  settings.fontFamily === value
                    ? "bg-white text-ink-900"
                    : "bg-white/8 text-ink-300 hover:bg-white/14",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <RangeControl
          label="Font size"
          min={15}
          max={28}
          step={1}
          value={settings.fontSize}
          onChange={(fontSize) =>
            setSettings((current) => ({
              ...current,
              fontSize,
            }))
          }
        />

        <RangeControl
          label="Line height"
          min={1.4}
          max={2.3}
          step={0.1}
          value={Number(settings.lineHeight.toFixed(1))}
          onChange={(lineHeight) =>
            setSettings((current) => ({
              ...current,
              lineHeight,
            }))
          }
        />

        <RangeControl
          label="Content width"
          min={560}
          max={920}
          step={20}
          value={settings.contentWidth}
          onChange={(contentWidth) =>
            setSettings((current) => ({
              ...current,
              contentWidth,
            }))
          }
        />

        <RangeControl
          label="Paragraph spacing"
          min={0.8}
          max={2}
          step={0.1}
          value={Number(settings.paragraphSpacing.toFixed(1))}
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
