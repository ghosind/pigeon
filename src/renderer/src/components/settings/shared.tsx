import type { ReactNode } from 'react';

export function SectionTitle({ title, description }: { title: string; description: string }): React.JSX.Element {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function FieldGroup({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="field-group">
      {label && <h3 className="group-label">{label}</h3>}
      {hint && <p className="group-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className="setting-row">
      <div><strong>{title}</strong><span>{description}</span></div>
      {children}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
}): React.JSX.Element {
  return (
    <label className="field-stack">
      <span className="field-label">{label}{suffix ? ` (${suffix})` : ''}</span>
      <input
        type="number"
        className="text-input"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
