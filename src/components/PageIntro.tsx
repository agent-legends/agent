import type { LucideIcon } from "lucide-react";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  icon: Icon,
}: PageIntroProps) {
  return (
    <header className="page-intro">
      <span className="page-kicker">
        <Icon aria-hidden="true" />
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
