'use client';

/**
 * The fields of a world record claim (requirements §8.1): a category, or a
 * proposal for a new one, then athletes, the value, witnesses and evidence.
 * Shared by the claimant's form and the admin "Modify" form.
 */

import { useEffect, useState } from 'react';
import { useFormikContext } from 'formik';
import { Alert } from '@ui/Alert';
import { FormikCheckboxField, FormikSelectField, FormikTextAreaField, FormikTextField, countryCodeOptions } from '@ui/Form';
import { deriveGender, GENDER_TITLE_LABELS, UNIT_SUGGESTIONS, unitKind, valueHint } from '@lib/records-logic';
import { RECORD_CATEGORY_GROUPS, type RecordCategoryTableItem } from '@lib/relational-types';
import { getAthleteGenders, getMarkToBeat } from '../../actions';
import type { ClaimFormValues } from '../types';
import type { EnsureClaimSaved } from './EvidenceFields';
import RecordCategoryPicker from './RecordCategoryPicker';
import { AthletesSection, EthicsSection, EvidenceSection, Section, WitnessesSection } from './ClaimSections';

export type WorldRecordClaimFieldsProps = {
  recordCategories: RecordCategoryTableItem[];
  claimantId: string;
  /** Admin mode hides the claimant's confirmations. */
  admin?: boolean;
  ensureSaved: EnsureClaimSaved;
  uploadsEnabled: boolean;
};

/** Tells the claimant the gender the claim counts for and the mark to beat or equal (FR-5). */
function GenderAndMark({ recordCategories }: { recordCategories: RecordCategoryTableItem[] }) {
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
            This claim counts as a <strong>{GENDER_TITLE_LABELS[gender].toLowerCase()} world record</strong>.
            {mark?.value && <> Current record: <strong>{mark.value}</strong> by {mark.holders.join(', ')}. Your value must beat or equal it.</>}
            {category && mark && !mark.value && <> There is no {GENDER_TITLE_LABELS[gender].toLowerCase()} record in this category yet.</>}
          </p>
        </Alert>
      )}
    </div>
  );
}

function CategoryFields({ recordCategories }: { recordCategories: RecordCategoryTableItem[] }) {
  const { values } = useFormikContext<ClaimFormValues>();

  if (values.path === 'existing') {
    return (
      <Section title="Category">
        <RecordCategoryPicker recordCategories={recordCategories} />
      </Section>
    );
  }
  return (
    <Section title="New category">
      <Alert variant="info" size="SM" showIcon={false}>
        The ISA checks a new category against the record criteria: measurable, standardisable, breakable, significant and separable from existing categories. It may map your claim to an existing category instead.
      </Alert>
      <FormikTextField id="newCategory.name" name="newCategory.name" label="Category name" required />
      <FormikSelectField
        id="newCategory.group"
        name="newCategory.group"
        label="Group"
        options={RECORD_CATEGORY_GROUPS.map(g => ({ value: g, label: g }))}
        placeholder="Choose a group"
        required
      />
      <FormikTextAreaField id="newCategory.measurement" name="newCategory.measurement" label="What is measured and how" required />
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
      <FormikTextAreaField id="newCategory.justification" name="newCategory.justification" label="Why is this a distinct record?" required />
    </Section>
  );
}

export default function WorldRecordClaimFields({ recordCategories, claimantId, admin = false, ensureSaved, uploadsEnabled }: WorldRecordClaimFieldsProps) {
  const { values } = useFormikContext<ClaimFormValues>();
  const category = values.path === 'existing' ? recordCategories.find(c => c.categoryId === values.categoryId) : undefined;
  const unit = values.path === 'new_category' ? values.newCategory.unit : category?.unit;
  const isCoordinates = unit !== undefined && unitKind(unit) === 'coordinates';

  return (
    <>
      <CategoryFields recordCategories={recordCategories} />

      <AthletesSection isFirst={false} claimantId={claimantId} admin={admin}>
        <GenderAndMark recordCategories={recordCategories} />
      </AthletesSection>

      <Section title="The record">
        <FormikTextField
          id="valueText"
          name="valueText"
          label={isCoordinates ? 'Coordinates' : 'Value'}
          caption={unit !== undefined ? valueHint(unit) : 'Choose a category first'}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormikTextField id="date" name="date" type="date" label="Date" required />
          <FormikTextField id="locationName" name="locationName" label="Location" required={!admin} />
          <FormikSelectField id="locationCountry" name="locationCountry" label="Country" options={countryCodeOptions} required={!admin} />
        </div>
        <FormikTextAreaField id="setup" name="setup" label="Setup" caption="Webbing, anchors, tension, rigging details" />
        <FormikTextAreaField id="furtherSpecs" name="furtherSpecs" label="Further specs" />
      </Section>

      <WitnessesSection isFirst={false} />

      <EvidenceSection description="A full, uncut video of the attempt is expected." ensureSaved={ensureSaved} uploadsEnabled={uploadsEnabled}>
        <FormikCheckboxField id="fullVideo" name="fullVideo" label="There is a full video of the attempt" />
        {!values.fullVideo && <FormikTextAreaField id="noFullVideoReason" name="noFullVideoReason" label="Why is there no full video?" required />}
      </EvidenceSection>

      {!admin && <EthicsSection />}
    </>
  );
}
