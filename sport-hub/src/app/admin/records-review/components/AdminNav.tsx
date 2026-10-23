import Button from '@ui/Button';

const LINKS = [
  { href: '/admin/records-review', label: 'Review queue', variant: 'secondary' },
  { href: '/admin/records-manage/records', label: 'Modify Records', variant: 'secondary' },
  { href: '/admin/records-categories', label: 'Modify Categories', variant: 'secondary' },
  { href: '/admin/records-manage/firsts', label: 'Modify Firsts', variant: 'secondary' },
  { href: '/admin/records-import', label: 'Import review', variant: 'ghost' },
] as const;

/** Admin shortcuts. The link to the page you are on is left out. */
export default function AdminNav({ current }: { current?: string }) {
  return (
    <section className="p-4 sm:p-0 flex gap-3 flex-wrap">
      {LINKS.filter(l => l.href !== current).map(l => (
        <Button key={l.href} as="link" href={l.href} variant={l.variant} size="small">{l.label}</Button>
      ))}
    </section>
  );
}
