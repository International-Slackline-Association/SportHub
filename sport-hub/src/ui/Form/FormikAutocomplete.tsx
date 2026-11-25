'use client';

import { useField, useFormikContext } from 'formik';
import { Autocomplete, Spinner } from '@slacklineinternational/onsight/react';
import { BaseFormFieldProps } from '@ui/Form';
import { pascalCaseToTitleCase } from '@utils/strings';

export interface FormikAutocompleteProps extends BaseFormFieldProps<HTMLInputElement> {
  hideErrorMessage?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  options: Option[];
  onSelectOption?: (option: Option) => void;
  /** When true (default), picking an option writes mapOptionToValue into the field. */
  setFieldOnSelect?: boolean;
  /** Maps an Option to the value stored in the form field. Defaults to option.value. */
  mapOptionToValue?: (option: Option) => unknown;
  /**
   * Input text for the current field value.
   * Defaults to the matching option's label, or the value when it is a string.
   */
  getDisplayValue?: (value: unknown, options: Option[]) => string;
}

// Onsight only displays a value that is one of `options`. Free text (a name
// the person typed, before or without a pick) is passed as this extra option
// so the field can show it. It is not a real choice.
const ECHO = '\u0000';

/**
 * Autocomplete connected to Formik. The field stores either an option value
 * or, while the person is typing, the text itself.
 */
export default function FormikAutocomplete({
  caption,
  className,
  hideErrorMessage = false,
  id,
  isError = false,
  isLoading = false,
  label,
  name,
  options,
  onSelectOption,
  setFieldOnSelect = true,
  mapOptionToValue,
  getDisplayValue,
  required,
  tooltip,
  ...inputProps
}: FormikAutocompleteProps) {
  const fieldName = name ?? id;
  const [field, meta, helpers] = useField(fieldName);
  const toFormValue = mapOptionToValue ?? ((option: Option) => option.value);
  const toDisplay = getDisplayValue ?? ((value: unknown, opts: Option[]) => {
    const match = opts.find((option) => option.value === value);
    if (match) return match.label;
    return typeof value === 'string' ? value : '';
  });

  const display = toDisplay(field.value, options);
  const matched = options.find((option) => option.value === field.value || toFormValue(option) === field.value);
  const echo = !matched && display ? [{ value: `${ECHO}${display}`, label: display }] : [];
  const widgetValue = matched ? matched.value : display ? `${ECHO}${display}` : '';
  const { submitCount } = useFormikContext();
  const fieldError = !hideErrorMessage && (meta.touched || submitCount > 0) && typeof meta.error === 'string' ? meta.error : undefined;

  return (
    <Autocomplete
      {...inputProps}
      id={id}
      className={className}
      label={
        isLoading
          ? <span className="inline-flex items-center gap-2"><Spinner size="small" label="Loading options" />{label ?? pascalCaseToTitleCase(id)}</span>
          : (label ?? pascalCaseToTitleCase(id))
      }
      help={caption ?? tooltip}
      error={isError ? 'Could not load options' : fieldError}
      required={required}
      options={[...echo, ...options]}
      value={widgetValue}
      noResultsText={isLoading ? 'Loading…' : 'No matches'}
      onInputChange={(text) => {
        helpers.setValue(text);
        helpers.setTouched(true, false);
      }}
      onChange={(value, option) => {
        if (!option || value.startsWith(ECHO)) return;
        if (setFieldOnSelect) helpers.setValue(toFormValue(option));
        helpers.setTouched(true, false);
        onSelectOption?.(option);
      }}
    />
  );
}
