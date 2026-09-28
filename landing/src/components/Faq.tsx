import { PlusIcon } from '@phosphor-icons/react';

const QUESTIONS = [
  {
    q: 'Can we keep our existing letter formats?',
    a: 'Yes. Upload your Word templates once and the system fills them with each employee\'s details. Offer, appointment, relieving and experience letters all work this way.',
  },
  {
    q: 'Does it work with our biometric device?',
    a: 'The sync service polls eSSL and ZKTeco attendance devices and writes punches into the same daily record as web logins. Staff without a device punch can log in from a browser instead.',
  },
  {
    q: 'How does leave get calculated?',
    a: 'Each leave type carries its own monthly quota. Balances update as requests are approved, and the approver sees the remaining balance before deciding.',
  },
  {
    q: 'Can one installation serve more than one company?',
    a: 'Yes. Every record is scoped to its tenant, with its own admins, roles and indexes. Staff in one company cannot see another company\'s data.',
  },
  {
    q: 'What happens to documents we upload?',
    a: 'Identity and bank documents are encrypted before they are stored. Access follows the same role rules as the rest of the system, and every read is written to the audit log.',
  },
  {
    q: 'Can we pull the data into our other systems?',
    a: 'There is a public API with per-tenant keys, plus webhooks that fire on the events you subscribe to, so your finance or ERP tools can stay in step.',
  },
];

export default function Faq() {
  return (
    <section id="faq" className="py-32 md:py-40">
      <div className="rail">
        <header className="mx-auto max-w-[65ch]">
          <h2 className="type-section text-balance">Questions we get asked</h2>
        </header>

        <div className="mx-auto mt-12 max-w-[65ch]">
          {QUESTIONS.map(item => (
            <details key={item.q} className="group border-b border-hairline">
              <summary className="flex items-start justify-between gap-6 py-6 text-left">
                <span className="text-[19px] font-medium tracking-[-0.015em]">{item.q}</span>
                <PlusIcon
                  size={20} weight="light" aria-hidden
                  className="mt-1 shrink-0 text-ink-2 transition-transform duration-200
                             ease-out group-open:rotate-45"
                />
              </summary>
              <p className="type-body max-w-[62ch] pb-7 text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
