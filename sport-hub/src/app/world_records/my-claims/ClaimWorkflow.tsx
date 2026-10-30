import type { ClaimStatus } from '@lib/relational-types';
import { CLAIM_STATUS_LABELS } from '../components/claimStatus';

/** Colours match the status badges (claimStatus.tsx). */
const COLORS: Record<ClaimStatus, { fill: string; stroke: string; text: string }> = {
  draft: { fill: '#f3f4f6', stroke: '#9ca3af', text: '#374151' },
  pending: { fill: '#eff6ff', stroke: '#60a5fa', text: '#1d4ed8' },
  changes_requested: { fill: '#fffbeb', stroke: '#f59e0b', text: '#92400e' },
  published: { fill: '#f0fdf4', stroke: '#22c55e', text: '#15803d' },
  rejected: { fill: '#fef2f2', stroke: '#f87171', text: '#b91c1c' },
  historical: { fill: '#f9fafb', stroke: '#9ca3af', text: '#4b5563' },
};

const W = 160;
const H = 40;

/** Top-left corner of each step in the diagram. */
const NODES: Record<ClaimStatus, { x: number; y: number }> = {
  draft: { x: 10, y: 30 },
  pending: { x: 260, y: 30 },
  published: { x: 510, y: 30 },
  historical: { x: 760, y: 30 },
  changes_requested: { x: 260, y: 140 },
  rejected: { x: 510, y: 140 },
};

const STEPS: { status: ClaimStatus; text: string }[] = [
  { status: 'draft', text: 'You saved the claim but have not sent it yet. Only you can see it.' },
  { status: 'pending', text: 'The ISA is reviewing your claim. You can withdraw it, which turns it back into a draft.' },
  { status: 'changes_requested', text: 'The ISA sent the claim back with a comment. Edit it and submit it again.' },
  { status: 'published', text: 'Approved and shown publicly on Records & Firsts. You can download the certificate.' },
  { status: 'rejected', text: 'Not accepted, with the reason from the ISA. It is not shown publicly.' },
  { status: 'historical', text: 'Records only: a newer record beat it. It is a Former World Record and stays in the record history.' },
];

function Arrow({ d, label, lx, ly, anchor = 'middle' }: { d: string; label: string; lx: number; ly: number; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#claim-arrow)" />
      <text x={lx} y={ly} textAnchor={anchor} fontSize={13} fill="#4b5563">{label}</text>
    </g>
  );
}

/**
 * How a claim moves from draft to published (requirements §5). Steps that hold
 * some of the user's claims are highlighted with their number.
 */
export default function ClaimWorkflow({ counts }: { counts: Partial<Record<ClaimStatus, number>> }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 stack gap-2">
      <div className="stack gap-1">
        <h3 className="font-semibold">How a claim works</h3>
        <p className="text-sm text-gray-600">The highlighted steps show where your claims are now, with how many are in each step.</p>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 930 190" className="w-full max-w-3xl min-w-[560px]" role="img" aria-label="Claim workflow: draft, under review, published, former world record; under review can lead to changes requested, rejected, or back to draft">
          <defs>
            <marker id="claim-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
            </marker>
          </defs>

          {/* Draft ⇄ Under review */}
          <Arrow d={`M ${10 + W} 42 L 258 42`} label="Submit" lx={215} ly={35} />
          <Arrow d={`M 258 60 L ${12 + W} 60`} label="Withdraw" lx={215} ly={80} />
          {/* Under review → Published → Historical */}
          <Arrow d={`M ${260 + W} 50 L 508 50`} label="Approved" lx={465} ly={42} />
          <Arrow d={`M ${510 + W} 50 L 758 50`} label="Beaten" lx={715} ly={42} />
          <text x={715} y={68} textAnchor="middle" fontSize={11} fill="#6b7280">(records only)</text>
          {/* Under review ⇄ Changes requested */}
          <Arrow d="M 315 70 L 315 138" label="Changes requested" lx={308} ly={109} anchor="end" />
          <Arrow d="M 365 140 L 365 72" label="Resubmit" lx={373} ly={109} anchor="start" />
          {/* Under review → Rejected */}
          <Arrow d={`M ${260 + W} 66 L 530 138`} label="Rejected" lx={492} ly={98} anchor="start" />

          {(Object.keys(NODES) as ClaimStatus[]).map(status => {
            const { x, y } = NODES[status];
            const color = COLORS[status];
            const count = counts[status] ?? 0;
            const active = count > 0;
            return (
              <g key={status}>
                <rect
                  x={x} y={y} width={W} height={H} rx={8}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={active ? 3 : 1}
                  opacity={active ? 1 : 0.75}
                />
                <text x={x + W / 2} y={y + H / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={active ? 700 : 500} fill={color.text}>
                  {status === 'historical' ? 'Former' : CLAIM_STATUS_LABELS[status]}
                </text>
                {active && (
                  <g>
                    <circle cx={x + W - 4} cy={y + 4} r={12} fill={color.stroke} />
                    <text x={x + W - 4} y={y + 9} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{count}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-700 font-medium">What each step means</summary>
        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          {STEPS.map(s => (
            <div key={s.status} className="contents">
              <dt className="font-medium" style={{ color: COLORS[s.status].text }}>{CLAIM_STATUS_LABELS[s.status]}</dt>
              <dd className="text-gray-600 mb-1 sm:mb-0">{s.text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
