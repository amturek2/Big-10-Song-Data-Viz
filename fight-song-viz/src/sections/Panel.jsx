import "./Panel.css";
export default function Panel({
  eyebrow,
  title,
  subtitle,
  children,
  rightSlot,
}) {
  return (
    <section className="panel">
      <header className="panel_header">
        <div className="panel_headerLeft">
          {eyebrow && <div className="panel_eyebrow">{eyebrow}</div>}
          {title && <div className="panel_title">{title}</div>}
          {subtitle && <div className="panel_subtitle">{subtitle}</div>}
        </div>

        {rightSlot && <div className="panel_headerRight">{rightSlot}</div>}
      </header>

      <div className="panel_body">{children}</div>
    </section>
  );
}
