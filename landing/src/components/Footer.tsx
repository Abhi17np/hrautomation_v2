const COLUMNS = [
  { title: 'Platform', links: [
    { label: 'Modules', href: '#platform' },
    { label: 'How it works', href: '#journey' },
    { label: 'The product', href: '#product' },
    { label: 'Intelligence', href: '#intelligence' },
  ]},
  { title: 'Live today', links: [
    { label: 'Employee records', href: '#product' },
    { label: 'Leave and approvals', href: '#product' },
    { label: 'Attendance', href: '#product' },
    { label: 'Payroll and payslips', href: '#product' },
  ]},
  { title: 'Company', links: [
    { label: 'Since 1999', href: '#company' },
    { label: 'Infopace Management', href: 'https://www.infopaceindia.com' },
  ]},
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface py-16">
      <div className="rail">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/infopace-logo.webp" alt="" width={300} height={128} className="h-6 w-auto" />
              <span className="h-5 w-px bg-hairline" />
              <span className="text-[13px] font-700 text-ink-2">HR Automation</span>
            </div>
            <p className="t-small mt-4 max-w-[36ch] text-ink-2">
              One record for HR operations, from a change management practice
              working with Indian enterprises since 1999.
            </p>
          </div>

          {COLUMNS.map(col => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="t-micro text-ink">{col.title}</h2>
              <ul className="mt-4 grid">
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href}
                       className="inline-flex min-h-11 items-center text-[14px] text-ink-2
                                  transition-colors duration-200 hover:text-brand-700">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6">
          <p className="t-small text-ink-3">&copy; 2026 Infopace Management Pvt Ltd</p>
          <p className="t-small text-ink-3">
            Figures and quotes shown on this page are illustrative.
          </p>
        </div>
      </div>
    </footer>
  );
}
