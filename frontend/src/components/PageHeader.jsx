export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="col-span-12 mb-sm flex flex-wrap items-end justify-between gap-sm">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
        {subtitle && <p className="mt-xs text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-sm">{actions}</div> : null}
    </div>
  );
}
