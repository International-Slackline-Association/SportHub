'use client';

import { useState } from 'react';
import { useFormikContext } from 'formik';
import {
  FormikTextField,
  FormikSelectField,
  FormikCheckboxGroup,
  countryCodeOptions,
  disciplineOptions
} from '@ui/Form';
import { EventSubmissionFormValues } from '../../types';
import { cn } from '@utils/cn';
import sharedStyles from '../styles.module.css';
import styles from '../styles.module.css'
import { ChevronIcon } from '@ui/Icons';
import EventAutocomplete from './EventAutocomplete';
import YouTubePreviewTextField from './YouTubePreviewTextField'
import FileInputField from './FileInputField';
import { ErrorMessage } from '../ErrorMessage';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        aria-expanded={isOpen}
        className={cn(sharedStyles.sectionHeader, "cluster", "align-center")}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
          <h3>{title}</h3>
          <ChevronIcon color="dark" direction={isOpen ? "up" : "down"} />
      </button>
      <div
        className={cn(
          sharedStyles.sectionContent,
          isOpen ? styles.accordionOpen : styles.accordionClose
        )}
      >
        {children}
      </div>
    </section>
  );
};

export default function EventForm() {
  const { errors, values, } = useFormikContext<EventSubmissionFormValues>();

  const isError = Object.keys(errors.event || {}).length > 0;

  return (
    <div className={styles.eventForm}>
      {isError && (
        <ErrorMessage>
          Event form has errors, please review.
        </ErrorMessage>
      )}
      <section>
        <div className={cn(sharedStyles.formGrid, sharedStyles.sectionContent)}>
          <FileInputField />
          <YouTubePreviewTextField />
        </div>
      </section>
      <CollapsibleSection title="General Information" defaultOpen>
        <div className={sharedStyles.formGrid}>
          <EventAutocomplete />
          <FormikTextField
            id="event.website"
            label="Website"
            placeholder="https://example.com"
            type="url"
          />
          <FormikTextField
            id="event.city"
            label="City"
            placeholder="Enter city"
            required
          />
          <FormikSelectField
            id="event.country"
            label="Country"
            options={countryCodeOptions}
            placeholder="Select country"
            required
          />
          <FormikTextField
            id="event.date"
            label="Date"
            placeholder="YYYY-MM-DD"
            type="date"
            required
          />
          <FormikCheckboxGroup
            className={sharedStyles.formBox}
            direction="row"
            id="event.disciplines"
            label="Disciplines"
            options={disciplineOptions}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Social Media" defaultOpen>
        <div className={sharedStyles.formGrid}>
          <FormikTextField
            id="event.socialMedia.instagram"
            label="Instagram"
            placeholder="@username or profile URL"
          />
          <FormikTextField
            id="event.socialMedia.youtube"
            label="YouTube"
            placeholder="https://youtube.com/..."
            type="url"
          />
          <FormikTextField
            id="event.socialMedia.facebook"
            label="Facebook"
            placeholder="https://facebook.com/..."
            type="url"
          />
          <FormikTextField
            id="event.socialMedia.tiktok"
            label="TikTok"
            placeholder="@username or profile URL"
          />
          <FormikTextField
            id="event.socialMedia.twitch"
            label="Twitch"
            placeholder="https://twitch.tv/..."
            type="url"
          />
        </div>
      </CollapsibleSection>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <details className={sharedStyles.debugInfo}>
            <summary>Form State (Debug)</summary>
            <pre>values.event = {JSON.stringify(values.event, null, 2)}</pre>
            <pre>errors.event = {JSON.stringify(errors.event, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}
