import type { ReactNode } from "react";

type BackgroundGradientProps = {
  children: ReactNode;
  active?: boolean;
  className?: string;
};

export function BackgroundGradient({
  children,
  active = false,
  className = "",
}: BackgroundGradientProps) {
  return (
    <div className={`relative rounded-full ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-10 rounded-full transition-all duration-500 ease-out ${
          active
            ? "scale-100 opacity-100 blur-3xl bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.18)_0%,rgba(251,191,36,0.12)_36%,transparent_74%)] dark:opacity-80 dark:bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.12)_0%,rgba(251,191,36,0.06)_40%,transparent_76%)]"
            : "scale-95 opacity-0"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-6 rounded-full transition-all duration-500 ease-out ${
          active
            ? "scale-100 opacity-100 blur-2xl bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.24)_0%,rgba(217,119,6,0.12)_44%,transparent_78%)] dark:opacity-75 dark:bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.17)_0%,rgba(217,119,6,0.08)_46%,transparent_80%)]"
            : "scale-95 opacity-0"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-3 rounded-full transition-all duration-300 ease-out ${
          active
            ? "scale-100 opacity-100 blur-xl bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.2)_0%,rgba(217,119,6,0.1)_52%,transparent_82%)] dark:opacity-60 dark:bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.13)_0%,rgba(217,119,6,0.06)_54%,transparent_84%)]"
            : "scale-95 opacity-0"
        }`}
      />
      <div className="relative z-10 rounded-full">{children}</div>
    </div>
  );
}
