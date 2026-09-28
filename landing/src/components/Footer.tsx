const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Modules', href: '#modules' },
      { label: 'Rollout', href: '#rollout' },
      { label: 'Questions', href: '#faq' },
    ],
  },
  {
    title: 'Modules',
    links: [
      { label: 'Employee records', href: '#modules' },
      { label: 'Leave and approvals', href: '#modules' },
      { label: 'Attendance', href: '#modules' },
      { label: 'Payroll and payslips', href: '#modules' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Infopace Management', href: 'https://www.infopaceindia.com' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline py-16">
      <div className="rail">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <img src="/infopace-logo.webp" alt="" width={300} height={128} className="h-5 w-auto" />
              <span className="text-[15px] font-medium tracking-[-0.01em]">Infopace HR</span>
            </div>
            <p className="type-caption mt-3 max-w-[34ch] text-ink-2">
              HR records, leave, attendance and payroll for one company or many.
            </p>
          </div>

          {COLUMNS.map(col => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="type-caption font-medium text-ink">{col.title}</h2>
              <ul className="mt-2 grid">
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href}
                       className="inline-flex min-h-11 items-center type-caption text-ink-2
                                  transition-colors duration-200 ease-out hover:text-ink">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="type-caption mt-14 text-ink-2">
          &copy; 2026 Infopace Management Pvt Ltd
        </p>
      </div>
    </footer>
  );
}
