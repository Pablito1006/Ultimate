import type { ReactElement } from "react";

interface NavItemProps {
  label: string;
  hint?: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function NavItem({
  label,
  hint,
  active,
  disabled,
  onSelect,
}: NavItemProps): ReactElement {
  const className = [
    "mm-nav__item",
    active ? "mm-nav__item--active" : "",
    disabled ? "mm-nav__item--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
    >
      <span className="mm-nav__label">{label}</span>
      {hint ? <span className="mm-nav__hint">{hint}</span> : null}
    </button>
  );
}
