'use client';
import { getIn, useFormikContext } from 'formik';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { EventSubmissionFormValues } from '../../types';
import formStyles from '@ui/Form/styles.module.css';
import styles from './styles.module.css';
import Button from '@ui/Button';
import { FormikFormField } from '@ui/Form';
import { cn } from '@utils/cn';

export default function FileInputField() {
  const { values, errors, setFieldValue } = useFormikContext<EventSubmissionFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formError = getIn(errors, 'event.profileUrl');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setUploadError(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setFieldValue('event.profileUrl', result);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setFieldValue('event.profileUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <FormikFormField
      id="event.profileUrl"
      label="Profile Image"
    >
      <input
        accept="image/*"
        aria-label="Upload image"
        capture="environment"
        onChange={handleFileSelect}
        id="profile-image-input"
        ref={fileInputRef}
        style={{ display: 'none' }}
        type="file"
      />
      {values.event.profileUrl ? (
        <div style={{ position: 'relative' }}>
          <Image
            alt="Profile image preview"
            className={styles.youtubeThumbnail}
            width={1280}
            height={720}
            src={values.event.profileUrl}
          />
          <div className={cn("cluster", "gap-2", "mt-3")}>
            <Button
              onClick={handleButtonClick}
              variant="default"
            >
              Change Image
            </Button>
            <Button
              onClick={handleRemove}
              variant="destructive-secondary"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.uploadPlaceholder}>
          <p className={styles.uploadText}>
            No image selected
          </p>
          <Button
            onClick={handleButtonClick}
            variant="secondary"
          >
            Upload Image
          </Button>
        </div>
      )}

      {(uploadError || formError) && (
        <div className={formStyles.errorMessage}>{uploadError || formError}</div>
      )}
    </FormikFormField>
  );
}