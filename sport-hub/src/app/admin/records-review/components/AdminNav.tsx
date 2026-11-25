import Link from 'next/link';
import { Button } from '@slacklineinternational/onsight/react';

const LINKS = [
  { href: '/admin/records-review', label: 'Review queue', variant: 'secondary' },
  { href: '/admin/records-all', label: 'All records and firsts', variant: 'secondary' },
  { href: '/admin/records-manage/records', label: 'Modify Records', variant: 'secondary' },
  { href: '/admin/records-categories', label: 'Modify Categories', variant: 'secondary' },
  { href: '/admin/records-manage/firsts', label: 'Modify Firsts', variant: 'secondary' },
  { href: '/admin/records-import', label: 'Import review', variant: 'secondary' },
  { href: '/admin/records-export', label: 'Export CSV', variant: 'secondary' },
] as const;

/** Admin shortcuts. The link to the page you are on is left out. */
export default function AdminNav({ current }: { current?: string }) {
  return (
    <section className="flex gap-3 flex-wrap">
      {LINKS.filter(l => l.href !== current).map(l => (
        <Button key={l.href} as={Link} href={l.href} variant={l.variant} size="small">{l.label}</Button>
      ))}
    </section>
  );
}
