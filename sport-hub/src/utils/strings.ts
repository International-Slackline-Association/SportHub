// sampleWord -> Sample Word
export const pascalCaseToTitleCase = (text: string) =>
  text[0].toUpperCase() + text.slice(1).replace(/([A-Z])/g, ' $1');

// SAMPLE_WORD -> Sample Word
export const snakeCaseToTitleCase = (text: string) =>
  text?.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

// sample-word -> Sample Word
export const kebabCaseToTitleCase = (text: string) =>
  text
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export const textToTitleCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
