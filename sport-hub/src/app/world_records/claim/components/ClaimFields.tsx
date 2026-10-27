'use client';

/**
 * The claim form's fields (requirements §8), shared by the claimant's claim
 * form and the admin "Modify" form. The fields adapt to the chosen path:
 * record in an existing category, record in a new category, or world first.
 */

import { useEffect, useMemo, useState } from 'react';
import { Field, FieldArray, useFormikContext } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { FormikCheckboxField, FormikRadioGroup, FormikSelectField, FormikTextField, countryCodeOptions } from '@ui/Form';
import { deriveGender, GENDER_TITLE_LABELS, UNIT_SUGGESTIONS, unitKind, valueHint } from '@lib/records-logic';
import { ETHICS_STATEMENT, MAX_ATHLETES, MAX_WITNESSES, MIN_WITNESSES, RECORDS_TEAM_EMAIL } from '@lib/records-rules';
import type { FirstCategoryRecord, RecordCategoryRecord } from '@lib/relational-types';
import { getAthleteGenders, getMarkToBeat } from '../../actions';
import type { ClaimFormValues, ClaimPath } from '../types';
import AthletePicker from './AthletePicker';

type Props = {
  recordCategories: RecordCategoryRecord[];
  firstCategories: FirstCategoryRecord[];
  claimantId: string;
  /** Admin mode hides the claimant's confirmations and keeps the kind fixed. */
  admin?: boolean;
};

const PATH_OPTIONS: { value: ClaimPath; label: string }[] = [
  { value: 'existing', label: 'A world record in an existing category' },
  { value: 'new_category', label: 'A world record in a new category' },
  { value: 'first', label: 'A world first (a new trick)' },
];

function Section({ title, children, description }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="p-4 sm:p-0 stack gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <div className="text-sm text-gray-600">{description}</div>}
      {children}
    </section>
  );
}

function TextArea({ name, label, required, caption }: { name: string; label: string; required?: boolean; caption?: string }) {
  return (
    <div className="stack gap-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-600">{label}{required ? '*' : ''}</label>
      {caption && <small className="text-xs">{caption}</small>}
      <Field as="textarea" id={name} name={name} rows={3} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
    </div>
  );
}

/** Tells the claimant the gender the claim counts for and the mark to beat or equal (FR-5). */
function GenderAndMark({ recordCategories }: { recordCategories: RecordCategoryRecord[] }) {
  const { values } = useFormikContext<ClaimFormValues>();
  const [profileGenders, setProfileGenders] = useState<Record<string, string | null>>({});
  const [mark, setMark] = useState<Awaited<ReturnType<typeof getMarkToBeat>>>(null);

  const userIds = values.athletes.map(a => a.userId).filter((id): id is string => !!id);
  const userIdsKey = userIds.join(',');
  useEffect(() => {
    if (userIds.length === 0) return;
    getAthleteGenders(userIds).then(setProfileGenders).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdsKey]);

  const genders = values.athletes.map(a => {
    if (a.userId) return profileGenders[a.userId] ?? undefined;
    if (a.pendingUser?.gender === 'male') return 'MEN';
    if (a.pendingUser?.gender === 'female') return 'WOMEN';
    return undefined;
  });
  const missing = values.athletes.filter((a, i) => (a.userId || a.pendingUser) && genders[i] !== 'MEN' && genders[i] !== 'WOMEN');
  const known = genders.filter((g): g is 'MEN' | 'WOMEN' => g === 'MEN' || g === 'WOMEN');
  const gender: ContestGender | null = known.length > 0 && missing.length === 0 ? deriveGender(known.map(gender => ({ gender }))) : null;
  const gendersKey = known.join(',');

  const category = values.path === 'existing' ? recordCategories.find(c => c.categoryId === values.categoryId) : undefined;
  useEffect(() => {
    if (!category || !gender) { setMark(null); return; }
    getMarkToBeat(category.categoryId, known).then(setMark).catch(() => setMark(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.categoryId, gendersKey, gender]);

  const loadedAll = userIds.every(id => id in profileGenders);
  return (
    <div className="stack gap-2">
      {loadedAll && missing.map(a => (
        <Alert key={a.userId ?? a.name} variant="warning" size="SM">
          {a.name || 'An athlete'} has no male or female gender {a.userId ? 'on their profile' : 'set'}. A claim can only be submitted once it is set.
        </Alert>
      ))}
      {gender && (
        <Alert variant="info" size="SM" showIcon={false}>
          {/* One paragraph, so the text flows inline inside the flex alert */}
          <p>
            This claim counts as a <strong>{GENDER_TITLE_LABELS[gender].toLowerCase()} {values.path === 'first' ? 'world first' : 'world record'}</strong>.
            {mark?.value && <> Current record: <strong>{mark.value}</strong> by {mark.holders.join(', ')}. Your value must beat or equal it.</>}
            {category && mark && !mark.value && <> There is no {GENDER_TITLE_LABELS[gender].toLowerCase()} record in this category yet.</>}
          </p>
        </Alert>
      )}
    </div>
  );
}

export default function ClaimFields({ recordCategories, firstCategories, claimantId, admin = false }: Props) {
  const { values } = useFormikContext<ClaimFormValues>();
  const isFirst = values.path === 'first';
  const editing = !!values.entryId;
  const category = values.path === 'existing' ? recordCategories.find(c => c.categoryId === values.categoryId) : undefined;

  const categoryOptions = useMemo(
    () => recordCategories.map(c => ({ value: c.categoryId, label: `${c.group} · ${c.name}${c.status === 'unchallenged' ? ' (unchallenged)' : ''}` })),
    [recordCategories],
  );
  const firstOptions = firstCategories.map(c => ({ value: c.categoryId, label: c.name }));

  const athleteCount = values.athletes.length;
  const claimantIsOnlyAthlete = athleteCount === 1 && values.athletes[0].userId === claimantId;
  const unit = values.path === 'new_category' ? values.newCategory.unit : category?.unit;

  return (
    <>
      <Section title={admin ? 'Category' : 'What are you claiming?'}>
        <FormikRadioGroup
          id="path"
          name="path"
          options={editing || admin ? PATH_OPTIONS.filter(o => (o.value === 'first') === isFirst) : PATH_OPTIONS}
        />
        {/* FR-1: attempts are announced by email, not in the app (v1) */}
        {!isFirst && !admin && (
          <Alert variant="info" size="SM" showIcon={false}>
            <p>
              Planning a record attempt? As the ISA framework asks, email <a href={`mailto:${RECORDS_TEAM_EMAIL}`} className="underline">{RECORDS_TEAM_EMAIL}</a> before the attempt, so the definitions can be agreed in advance.
            </p>
          </Alert>
        )}
        {values.path === 'existing' && (
          <div className="stack gap-1">
            <FormikSelectField id="categoryId" name="categoryId" label="Record category" options={categoryOptions} required />
            {category?.description && <p className="text-sm text-gray-600">{category.description}</p>}
          </div>
        )}
        {values.path === 'first' && (
          <FormikSelectField id="categoryId" name="categoryId" label="Discipline" options={firstOptions} required />
        )}
        {values.path === 'new_category' && (
          <div className="stack gap-3">
            <Alert variant="info" size="SM" showIcon={false}>
              The ISA checks a new category against the record criteria: measurable, standardisable, breakable, significant and separable from existing categories. It may map your claim to an existing category instead.
            </Alert>
            <FormikTextField id="newCategory.name" name="newCategory.name" label="Category name" required />
            <TextArea name="newCategory.measurement" label="What is measured and how" required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="stack gap-1">
                <FormikTextField id="newCategory.unit" name="newCategory.unit" label="Unit" list="claim-unit-suggestions" required />
                <datalist id="claim-unit-suggestions">
                  {UNIT_SUGGESTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </datalist>
              </div>
              <FormikSelectField
                id="newCategory.direction"
                name="newCategory.direction"
                label="Better is"
                options={[{ value: 'higher', label: 'Higher' }, { value: 'lower', label: 'Lower' }]}
                required
              />
            </div>
            <TextArea name="newCategory.justification" label="Why is this a distinct record?" required />
          </div>
        )}
      </Section>

      <Section
        title="Athletes"
        description={
          <div className="stack gap-1">
            <p>Add more than one athlete only if they did this <strong>together, as one joint performance</strong> (for example a tandem walk or a group rigging). They then hold one {isFirst ? 'first' : 'record'} with several athletes.</p>
            <p>If several people reached the same {isFirst ? 'trick' : 'value'} <strong>separately</strong>, they are co-holders: each of them submits their own claim with their own video and witnesses.</p>
          </div>
        }
      >
        <FieldArray name="athletes">
          {({ push, remove }) => (
            <div className="stack gap-3">
              {values.athletes.map((_, i) => (
                <AthletePicker key={i} index={i} onRemove={athleteCount > 1 ? () => remove(i) : undefined} />
              ))}
              {athleteCount < MAX_ATHLETES && (
                <div>
                  <Button type="button" variant="secondary" size="small" onClick={() => push({ name: '' })}>
                    Add an athlete to this joint performance
                  </Button>
                </div>
              )}
            </div>
          )}
        </FieldArray>
        {athleteCount > 1 && !admin && (
          <FormikCheckboxField
            id="jointConfirmed"
            name="jointConfirmed"
            label="These athletes did this together as one joint performance. They are not co-holders who did it separately."
          />
        )}
        {!claimantIsOnlyAthlete && !admin && (
          <FormikCheckboxField
            id="consentConfirmed"
            name="consentConfirmed"
            label="I have the consent of every athlete on this claim to submit it for them."
          />
        )}
        {!isFirst && <GenderAndMark recordCategories={recordCategories} />}
      </Section>

      {isFirst ? (
        <Section title="The trick">
          <FormikTextField id="trickName" name="trickName" label="Trick name" required />
          <TextArea name="description" label="Description of the trick" required />
          <TextArea name="whyFirst" label="Why is it a first?" required caption="What makes it new compared to existing tricks." />
          <TextArea name="similarTricks" label="Similar tricks" caption="Tricks that come close, so the ISA can tell them apart." />
          <FormikTextField id="lineDetails" name="lineDetails" label="Line details" caption="Line type, length, height, tension" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormikTextField id="date" name="date" type="date" label="Date of the landing" required />
            <FormikTextField id="locationName" name="locationName" label="Location" />
          </div>
        </Section>
      ) : (
        <Section title="The record">
          <FormikTextField
            id="valueText"
            name="valueText"
            label={unit !== undefined && unitKind(unit) === 'coordinates' ? 'Coordinates' : 'Value'}
            caption={unit !== undefined ? valueHint(unit) : 'Choose a category first'}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormikTextField id="date" name="date" type="date" label="Date" required />
            <FormikTextField id="locationName" name="locationName" label="Location" required />
            <FormikSelectField id="locationCountry" name="locationCountry" label="Country" options={countryCodeOptions} required />
          </div>
          <TextArea name="setup" label="Setup" caption="Webbing, anchors, tension, rigging details" />
          <TextArea name="furtherSpecs" label="Further specs" />
        </Section>
      )}

      {!isFirst && (
        <Section title="Witnesses" description={`At least ${MIN_WITNESSES} witnesses who saw the attempt.`}>
          <FieldArray name="witnesses">
            {({ push, remove }) => (
              <div className="stack gap-3">
                {values.witnesses.map((_, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                    <FormikTextField id={`witnesses.${i}.name`} name={`witnesses.${i}.name`} label="Name" required={i < MIN_WITNESSES} />
                    <FormikTextField id={`witnesses.${i}.email`} name={`witnesses.${i}.email`} type="email" label="Email" required={i < MIN_WITNESSES} />
                    <FormikTextField id={`witnesses.${i}.phone`} name={`witnesses.${i}.phone`} type="tel" label="Phone" />
                    {i >= MIN_WITNESSES ? (
                      <button type="button" className="text-xs text-red-600 underline pb-2" onClick={() => remove(i)}>Remove</button>
                    ) : <span />}
                  </div>
                ))}
                {values.witnesses.length < MAX_WITNESSES && (
                  <div>
                    <Button type="button" variant="secondary" size="small" onClick={() => push({ name: '', email: '', phone: '' })}>Add a witness</Button>
                  </div>
                )}
              </div>
            )}
          </FieldArray>
        </Section>
      )}

      <Section
        title="Video and evidence"
        description={isFirst ? 'At least one video link showing the trick being landed.' : 'A full, uncut video of the attempt is expected.'}
      >
        {!isFirst && (
          <>
            <FormikCheckboxField id="fullVideo" name="fullVideo" label="There is a full video of the attempt" />
            {!values.fullVideo && <TextArea name="noFullVideoReason" label="Why is there no full video?" required />}
          </>
        )}
        {(isFirst || values.fullVideo) && (
          <FieldArray name="evidence">
            {({ push, remove }) => (
              <div className="stack gap-2">
                {values.evidence.map((_, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <FormikTextField className="flex-1" id={`evidence.${i}`} name={`evidence.${i}`} label={i === 0 ? 'Video link' : `Link ${i + 1}`} placeholder="https://" required={i === 0} />
                    {i > 0 && <button type="button" className="text-xs text-red-600 underline pb-2" onClick={() => remove(i)}>Remove</button>}
                  </div>
                ))}
                <div><Button type="button" variant="secondary" size="small" onClick={() => push('')}>Add a link</Button></div>
              </div>
            )}
          </FieldArray>
        )}
      </Section>

      {!admin && (
        <Section title="Ethics">
          <FormikCheckboxField id="ethicsConfirmed" name="ethicsConfirmed" label={ETHICS_STATEMENT} />
        </Section>
      )}
    </>
  );
}

/** Clears the category when switching between record and first paths. */
export function PathResetter({ path, onChange }: { path: ClaimPath; onChange: () => void }) {
  const [previous, setPrevious] = useState(path);
  useEffect(() => {
    if (path !== previous) {
      if ((path === 'first') !== (previous === 'first') || path === 'new_category') onChange();
      setPrevious(path);
    }
  }, [path, previous, onChange]);
  return null;
}
