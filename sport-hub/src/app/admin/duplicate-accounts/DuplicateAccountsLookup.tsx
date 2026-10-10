'use client';

import { useState } from 'react';
import { Form, Formik } from 'formik';
import UserAutocomplete from '../../events/submit/components/contest-inputs/UserAutocomplete';
import { AthleteProfileCard } from '../../athlete/components/AthleteProfileCard';
import { fetchUserProfileAndRecords, mergeDuplicateAccounts, UserProfileAndRecords } from './actions';
import Button from '@ui/Button';
import { Alert, AlertProps } from '@ui/Alert';
import { FormikCheckboxField } from '@ui/Form';
import { ResultEntryList } from './ResultEntryList';

export type DuplicateAccountFormValues = {
  primaryUser: { id: string; name: string };
  secondaryUser: { id: string; name: string };
  deleteSecondaryAccount: boolean;
  mergeUserProfile: boolean;
};

const initialValues: DuplicateAccountFormValues = {
  primaryUser: { id: '', name: '' },
  secondaryUser: { id: '', name: '' },
  deleteSecondaryAccount: false,
  mergeUserProfile: false,
};

const AthletePreview = ({
  profileAndRecords: { profile, eventRecords, contestRecords, participationRecords },
  variant
}: {
  profileAndRecords: UserProfileAndRecords;
  variant: 'primary' | 'secondary'
}) => {
  const formattedVariant = variant.at(0)?.toUpperCase() + variant.slice(1);
  if (!profile) {
    return (
      <p>{formattedVariant} account not found.</p>
    )
  }

  return (
    <div className="space-y-4">
      <AthleteProfileCard
        {...profile}
        disciplines={[...new Set(participationRecords.map((p) => p.discipline).filter(Boolean))] as Discipline[]}
      />
      <div className="space-y-1 text-sm text-gray-600">
        <p>User ID: {profile.userId}</p>
        <p>ISA ID: {profile.isaUsersId || 'None'}</p>
        <p>Email: {profile.email || 'None'}</p>
      </div>
      <ResultEntryList
        contests={contestRecords}
        events={eventRecords}
        participations={participationRecords}
        title={`${formattedVariant} account results`}
      />
    </div>
  );
}

export default function DuplicateAccountsLookup() {
  const [alert, setAlertMessage] = useState<string | null>(null);
  const [alertStatus, setAlertStatus] = useState<AlertProps['variant']>('info');
  const [primaryUserProfileAndRecords, setPrimaryUserProfileAndRecords] = useState<UserProfileAndRecords | null>(null);
  const [secondaryUserProfileAndRecords, setSecondaryUserProfileAndRecords] = useState<UserProfileAndRecords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasReviewedResults, setHasReviewedResults] = useState(false);

  const handleComparisonLookup = async (values: DuplicateAccountFormValues) => {
    setAlertMessage(null);
    setAlertStatus('info');
    setHasReviewedResults(false);

    if (!values.primaryUser.id || !values.secondaryUser.id) {
      return;
    }

    setIsLoading(true);
    try {
      const resultsPrimaryAccount = await fetchUserProfileAndRecords(values.primaryUser.id);
      const resultsSecondaryAccount = await fetchUserProfileAndRecords(values.secondaryUser.id);
      setPrimaryUserProfileAndRecords(resultsPrimaryAccount);
      setSecondaryUserProfileAndRecords(resultsSecondaryAccount);
      setHasReviewedResults(true);
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : 'Unable to compare the selected accounts.');
      setAlertStatus('error');
      setPrimaryUserProfileAndRecords(null);
      setSecondaryUserProfileAndRecords(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={async (values, { setSubmitting }) => {
        setAlertMessage(null);

        const isMissingData = !values.primaryUser.id
          || !values.secondaryUser.id 
          || !primaryUserProfileAndRecords 
          || !secondaryUserProfileAndRecords;

        if (isMissingData) {
          return;
        }

        try {
          const result = await mergeDuplicateAccounts({
            primaryUserProfileAndRecords,
            secondaryUserProfileAndRecords,
            deleteSecondaryAccount: values.deleteSecondaryAccount,
            mergeUserProfile: values.mergeUserProfile,
            dryRun: false,
            verbose: false,
          });
  
          setAlertMessage(
            `Moved ${result.participationRecordsMoved} participation records,`
            + ` updated ${result.contestRecordsUpdated} contest records`
            + ` and ${result.metadataRecordsUpdated} metadata records.`
            + (result.profileUpdated ? ' Primary profile updated.' : '')
            + ' Please review changes.'
          );
          setAlertStatus('success');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to merge duplicate accounts.';
          setAlertMessage(message);
          setAlertStatus('error');
        } finally {
          setSubmitting(false);
          setPrimaryUserProfileAndRecords(null);
          setSecondaryUserProfileAndRecords(null);
          handleComparisonLookup(values);
        }
      }}
    >
      {({ isSubmitting, values }) => {
        const isLookUpValid = values.primaryUser.id && values.secondaryUser.id && values.primaryUser.id !== values.secondaryUser.id;
        return (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                <h3>Primary account</h3>
                <UserAutocomplete formKey="primaryUser" />
              </div>
              <div className="space-y-2">
                <h3>Secondary account</h3>
                <UserAutocomplete formKey="secondaryUser" />
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-3 items-center border border-gray-200 rounded-lg p-4">
              <div>
                <p>Compare selected accounts</p>
                <p>Review the contest results before changing ownership.</p>
              </div>
              <Button
                disabled={isLoading || !isLookUpValid}
                onClick={() => handleComparisonLookup(values)}
              >
                {isLoading ? 'Loading…' : 'Compare accounts'}
              </Button>
            </div>

            {primaryUserProfileAndRecords && secondaryUserProfileAndRecords && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-center gap-3 text-sm font-medium text-gray-700">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Primary account</span>
                  <span className="text-2xl text-blue-500">←</span>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Secondary</span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-5 items-start">
                  <AthletePreview profileAndRecords={primaryUserProfileAndRecords} variant="primary" />
                  <div className="hidden xl:flex h-full min-h-[200px] items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl text-blue-600">←</div>
                  </div>
                  <AthletePreview profileAndRecords={secondaryUserProfileAndRecords} variant="secondary" />
                </div>
              </div>
            )}

            {alert && (
              <Alert variant={alertStatus}>{alert}</Alert>
            )}

            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div>
                <p>Review before merging</p>
                <p>
                  This will replace the secondary user ID with the primary user ID on all
                  Participation:* records and related contest results. This does not update events
                  judged or organized.
                </p>
              </div>

              <FormikCheckboxField
                id="mergeUserProfile"
                name="mergeUserProfile"
                label={
                  <>
                    Replace missing details in the primary profile with details from the secondary
                    profile: email, ISA ID, profile pic, country, and birthdate. 
                    <strong>This does not update names.</strong>
                  </>
                }
              />

              <FormikCheckboxField
                id="deleteSecondaryAccount"
                name="deleteSecondaryAccount"
                label="Delete the secondary profile after the merge finishes. THIS CANNOT BE UNDONE."
              />

              <div className="flex justify-end">
                <Button
                  disabled={isSubmitting || !isLookUpValid || !hasReviewedResults}
                  type="submit"
                  variant="destructive"
                >
                  {isSubmitting ? 'Merging…' : 'Merge accounts'}
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
