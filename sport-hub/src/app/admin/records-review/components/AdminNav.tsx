import Button from '@ui/Button';

export default function AdminNav() {
  return (
    <section className="p-4 sm:p-0 flex gap-3 flex-wrap">
      <Button as="link" href="/admin/records-review" variant="secondary" size="small">Review queue</Button>
      <Button as="link" href="/admin/records-categories" variant="secondary" size="small">Modify Categories</Button>
      <Button as="link" href="/admin/records-manage/records" variant="secondary" size="small">Modify Records</Button>
      <Button as="link" href="/admin/records-manage/firsts" variant="secondary" size="small">Modify Firsts</Button>
      <Button as="link" href="/admin/records-import" variant="ghost" size="small">Import review</Button>
    </section>
  );
}
