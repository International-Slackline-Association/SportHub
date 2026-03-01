'use client';
import { useState } from 'react';
import { useFormikContext } from 'formik';
import Image from 'next/image';
import { EventSubmissionFormValues } from '../../types';
import { FormikTextField } from '@ui/Form';
import styles from './styles.module.css'

// Extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export default function YouTubePreviewTextField() {
  const {
    values: {
      event: {
        thumbnailUrl
      },
    },
    handleBlur: formikHandleBlur,
  } = useFormikContext<EventSubmissionFormValues>();

  const [displayUrl, setDisplayUrl] = useState(thumbnailUrl || "");
  const youtubeId = extractYouTubeId(displayUrl || '');

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (youtubeId) {
      // Try high quality thumbnail first, falls back to default if not available
      setDisplayUrl(`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`);
    } else {
      setDisplayUrl("");
    }
    formikHandleBlur(e);
  };

  return (
    <div className="stack">
      {thumbnailUrl && (
        <div style={{ marginBottom: '16px' }}>
          <Image
            alt="YouTube video thumbnail"
            className={styles.youtubeThumbnail}
            width={1280}
            height={720}
            onError={(e) => {
              // Fallback to standard quality thumbnail if maxres fails
              if (youtubeId && e.currentTarget.src.includes('maxresdefault')) {
                e.currentTarget.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }
            }}
            src={thumbnailUrl}
          />
        </div>
      )}
      <FormikTextField
        id="event.youtubeVideo"
        name="event.youtubeVideo"
        label="YouTube Video"
        placeholder="https://www.youtube.com/watch?v=example"
        onBlur={handleBlur}
      />
    </div>
  );
};