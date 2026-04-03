import type { PropsWithChildren, ReactNode } from "react";

type PageSectionProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}>;

export function PageSection({
  eyebrow,
  title,
  description,
  action,
  children,
}: PageSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-ink-500">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="font-display text-5xl leading-none text-ink-900">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-base leading-7 text-ink-600">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
