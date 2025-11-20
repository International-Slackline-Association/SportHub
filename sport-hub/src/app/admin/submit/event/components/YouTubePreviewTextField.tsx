'use client';
import { useState } from 'react';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../types';
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
  const { values, handleBlur: formikHandleBlur } = useFormikContext<EventSubmissionFormValues>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(values.event.thumbnailUrl || "");
  const youtubeVideo = values.event.thumbnailUrl;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const videoId = extractYouTubeId(youtubeVideo || '');
    if (videoId) {
      // Try high quality thumbnail first, falls back to default if not available
      setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    } else {
      setThumbnailUrl(null);
    }
    formikHandleBlur(e);
  };

  return (
    <div className="stack">
      {thumbnailUrl && (
        <div style={{ marginBottom: '16px' }}>
          <img
            alt="YouTube video thumbnail"
            className={styles.youtubeThumbnail}
            onError={(e) => {
              // Fallback to standard quality thumbnail if maxres fails
              const videoId = extractYouTubeId(youtubeVideo || '');
              if (videoId && e.currentTarget.src.includes('maxresdefault')) {
                e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }
            }}
            src={thumbnailUrl}
          />
        </div>
      )}
      <FormikTextField
        id="event.youtubeVideo"
        label="YouTube Video"
        placeholder="https://www.youtube.com/watch?v=example"
        onBlur={handleBlur}
      />
    </div>
  );
};