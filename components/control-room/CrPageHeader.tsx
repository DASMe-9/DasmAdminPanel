import type { ElementType, ReactNode } from "react";

interface CrPageHeaderProps {
  icon: ElementType;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "hero";
}

export default function CrPageHeader({
  icon: Icon,
  title,
  subtitle,
  meta,
  actions,
  footer,
  variant = "default",
}: CrPageHeaderProps) {
  if (variant === "hero") {
    return (
      <section className="cr-hero">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_#fff_0,_transparent_45%)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="text-sm md:text-base text-blue-100/90 mt-1 max-w-2xl leading-relaxed">
                  {subtitle}
                </p>
              ) : null}
              {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
        </div>
        {footer ? <div className="relative mt-4">{footer}</div> : null}
      </section>
    );
  }

  return (
    <section className="cr-panel">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
