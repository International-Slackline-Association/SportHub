'use client';

import { useState } from 'react';
import { getIn, useFormikContext } from 'formik';
import {
  FormikTextField,
  FormikSelectField,
  FormikCheckboxGroup,
  countryCodeOptions,
  disciplineOptions,
  TextFieldProps
} from '@ui/Form';
import { EventSubmissionFormValues } from '../../types';
import { cn } from '@utils/cn';
import sharedStyles from '../styles.module.css';
import styles from '../styles.module.css'
import { ChevronIcon } from '@ui/Icons';
import EventAutocomplete from './EventAutocomplete';
import YouTubePreviewTextField from './YouTubePreviewTextField'
import FileInputField from './FileInputField';
import { Alert } from '@ui/Alert';
import { SocialIcon } from 'react-social-icons';
import Button from '@ui/Button';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({
  defaultOpen = true,
  children,
  title,
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

const LinkFormikTextField = ({ className, id, onRemove, ...props }: TextFieldProps & { onRemove: () => void }) => {
  const { values } = useFormikContext<EventSubmissionFormValues>();
  const url = getIn(values, id);
  return (
    <div className={cn(className, "cluster gap-4")}>
      <SocialIcon bgColor="transparent" fgColor="#000000" url={url} />
      <FormikTextField
        className="mb-2 grow"
        id={id}
        name={id}
        type="url"
        {...props}
      />
      <Button
        onClick={onRemove}
        variant="destructive-secondary"
        size="small"
        style={{ height: "min-content", marginTop: "8px" }}
      >
        Remove
      </Button>
    </div>
  );
};

export default function EventForm() {
  const { errors, values, setFieldValue} = useFormikContext<EventSubmissionFormValues>();

  const isError = Object.keys(errors.event || {}).length > 0;
  const links = getIn(values, "event.links");

  return (
    <div className={styles.eventForm}>
      {isError && (
        <Alert>
          Event form has errors, please review.
        </Alert>
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
            label="Event Website"
            name="event.website"
            placeholder="https://example.com"
            type="url"
          />
          <FormikTextField
            id="event.city"
            label="City"
            name="event.city"
            placeholder="Enter city"
            required
          />
          <FormikSelectField
            id="event.country"
            label="Country"
            name="event.country"
            options={countryCodeOptions}
            placeholder="Select country"
            required
          />
          <FormikTextField
            id="event.startDate"
            label="Start Date"
            name="event.startDate"
            placeholder="YYYY-MM-DD"
            type="date"
            required
          />
          <FormikTextField
            id="event.endDate"
            label="End Date"
            name="event.endDate"
            placeholder="YYYY-MM-DD"
            type="date"
            required
          />
          <div className="col-span-2">
            <FormikCheckboxGroup
              direction="row"
              id="event.disciplines"
              label="Disciplines"
              name="event.disciplines"
              options={disciplineOptions}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Links" defaultOpen>
        <div>
          {links?.map((_: string, idx: number) => (
            <LinkFormikTextField
              id={`event.links[${idx}]`}
              key={`event.links[${idx}]`}
              onRemove={() => {
                const nextLinks = [...links];
                nextLinks.splice(idx, 1);
                console.log(links, "next", nextLinks);
                setFieldValue("event.links", nextLinks);
              }}
              placeholder="Social network, live stream, event details, etc."
            />
          ))}
          <Button
            onClick={() => setFieldValue("event.links", [...links, ""])}
            variant="default"
          >
            Add link
          </Button>
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
