import React, { PropsWithChildren, ReactNode } from 'react';
import { useField, useFormikContext, type FieldInputProps, type FieldMetaProps, type FormikHelpers } from 'formik';
import { Button, Checkbox, Fieldset, Radio, SelectField, TextArea, TextField } from '@slacklineinternational/onsight/react';
import { pascalCaseToTitleCase } from '@utils/strings';
export * from './commonOptions';
export { default as DisciplineDropdown } from './DisciplineDropdown';
export { RankingsGenderDropdown, ContestsGenderDropdown, RecordsGenderDropdown } from './GenderDropdown';
export { default as ContestSizeDropdown } from './ContestSizeDropdown';
export { LinkFieldArray } from './LinkFieldArray';

export const FormikSubmitButton = ({ children }: PropsWithChildren) => {
  const { isSubmitting, isValid, dirty } = useFormikContext();

  return (
    <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isSubmitting && (!isValid || !dirty)}>
      {isSubmitting ? 'Saving…' : (children || 'Submit Form')}
    </Button>
  );
};

export interface BaseFormFieldProps<Element> extends React.InputHTMLAttributes<Element> {
  id: string;
  /** Shown between the label and the control (Onsight help text). */
  caption?: string;
  label?: string | ReactNode;
  /**
   * Shown as help text. Onsight fields have no tooltip slot, and a button
   * cannot sit inside the label.
   */
  tooltip?: string;
}

export interface FormikFieldProps<Value,> { field: FieldInputProps<Value>; meta: FieldMetaProps<Value>; form: FormikHelpers<unknown> }

const fieldLabel = (id: string, label?: string | ReactNode) =>
  label ?? pascalCaseToTitleCase(id || '');

/** A field error after the user leaves it, or after a submit that failed. */
const useShownError = (meta: { touched: boolean; error?: unknown }) => {
  const { submitCount } = useFormikContext();
  if (!(meta.touched || submitCount > 0)) return undefined;
  return typeof meta.error === 'string' ? meta.error : undefined;
};

/**
 * Layout for a control Onsight does not provide (file upload).
 * Label, help and error use the field classes; the control is `children`.
 */
export const FormikFormField = ({
  id,
  label,
  caption,
  className,
  children,
  error,
}: PropsWithChildren<{
  id: string;
  label?: string | ReactNode;
  caption?: string;
  className?: string;
  error?: ReactNode;
}>) => (
  <div className={['isa-field', className].filter(Boolean).join(' ')}>
    <label className="isa-label" htmlFor={id}>{fieldLabel(id, label)}</label>
    {caption && <p className="isa-help" id={`${id}-help`}>{caption}</p>}
    {children}
    {error && <p className="isa-error" id={`${id}-error`}>{error}</p>}
  </div>
);

export type TextFieldProps = BaseFormFieldProps<HTMLInputElement>;
export const FormikTextField = ({
  caption,
  className,
  id,
  label,
  name,
  required,
  tooltip,
  ...inputProps
}: TextFieldProps) => {
  const fieldName = name || id;
  const [field, meta] = useField<string>(fieldName);
  const error = useShownError(meta);

  return (
    <TextField
      {...field}
      {...inputProps}
      className={className}
      id={id}
      name={fieldName}
      label={fieldLabel(id, label)}
      help={caption ?? tooltip}
      error={error}
      required={required}
      value={field.value ?? ''}
    />
  );
};

export type TextAreaFieldProps = BaseFormFieldProps<HTMLTextAreaElement> & { rows?: number };
export const FormikTextAreaField = ({
  caption,
  className,
  id,
  label,
  name,
  required,
  tooltip,
  rows = 3,
  ...textAreaProps
}: TextAreaFieldProps) => {
  const fieldName = name || id;
  const [field, meta] = useField<string>(fieldName);
  const error = useShownError(meta);

  return (
    <TextArea
      {...field}
      {...textAreaProps}
      className={className}
      id={id}
      name={fieldName}
      label={fieldLabel(id, label)}
      help={caption ?? tooltip}
      error={error}
      required={required}
      rows={rows}
      value={field.value ?? ''}
    />
  );
};

type TextNumberProps = BaseFormFieldProps<HTMLInputElement>;
export const FormikNumberField = ({
  className,
  caption,
  id,
  label,
  name,
  required,
  tooltip,
  ...inputProps
}: TextNumberProps) => {
  const fieldName = name || id;
  const [field, meta] = useField<number | string>(fieldName);
  const error = useShownError(meta);

  return (
    <TextField
      {...field}
      {...inputProps}
      className={className}
      id={id}
      name={fieldName}
      type="number"
      label={fieldLabel(id, label)}
      help={caption ?? tooltip}
      error={error}
      required={required}
      value={field.value == null ? '' : field.value}
    />
  );
};

interface SelectFieldProps extends BaseFormFieldProps<HTMLSelectElement> {
  options: Option[];
}
export const FormikSelectField = ({
  caption,
  className,
  id,
  label,
  name,
  options,
  placeholder = 'Select an option',
  required,
  tooltip,
  ...selectProps
}: SelectFieldProps) => {
  const fieldName = name || id;
  const [field, meta] = useField<string>(fieldName);
  const error = useShownError(meta);

  return (
    <SelectField
      {...field}
      {...selectProps}
      className={className}
      id={id}
      name={fieldName}
      label={fieldLabel(id, label)}
      help={caption ?? tooltip}
      error={error}
      required={required}
      value={field.value ?? ''}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </SelectField>
  );
};

export const FormikCheckboxField = ({
  caption,
  className,
  id,
  label,
  name,
  required,
  tooltip,
}: PropsWithChildren<BaseFormFieldProps<HTMLInputElement>>) => {
  const fieldName = name || id;
  const [field, meta, helpers] = useField<boolean>(fieldName);
  const error = useShownError(meta);
  const help = caption ?? tooltip;

  return (
    <div className={className}>
      {help && <p className="isa-help" id={`${id}-help`}>{help}</p>}
      <Checkbox
        id={id}
        name={fieldName}
        label={fieldLabel(id, label)}
        checked={Boolean(field.value)}
        required={required}
        aria-describedby={help ? `${id}-help` : undefined}
        aria-invalid={error ? true : undefined}
        onBlur={field.onBlur}
        onChange={() => {
          helpers.setValue(!field.value);
          helpers.setTouched(true, false);
        }}
      />
      {error && <p className="isa-error">{error}</p>}
    </div>
  );
};

interface FormikCheckboxGroupProps extends BaseFormFieldProps<HTMLElement> {
  direction?: 'row' | 'column';
  options: Option[];
}
export const FormikCheckboxGroup = ({
  caption,
  className,
  direction = 'column',
  id,
  label,
  name,
  options,
  tooltip,
}: FormikCheckboxGroupProps) => {
  const fieldName = name || id;
  const [field, meta, helpers] = useField<string[]>(fieldName);
  const currentValue = field.value || [];
  const error = useShownError(meta);

  const toggle = (optionValue: string) => {
    const selections = currentValue.includes(optionValue)
      ? currentValue.filter((value) => value !== optionValue)
      : [...currentValue, optionValue];
    helpers.setValue(selections);
    helpers.setTouched(true, false);
  };

  return (
    <Fieldset
      className={className}
      id={id}
      legend={fieldLabel(id, label)}
      help={caption ?? tooltip}
      error={error}
    >
      <div className={direction === 'row' ? 'flex flex-wrap gap-x-4' : undefined}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            id={`${id}-${option.value}`}
            name={fieldName}
            label={option.label}
            checked={currentValue.includes(option.value)}
            onChange={() => toggle(option.value)}
          />
        ))}
      </div>
    </Fieldset>
  );
};

interface RadioGroupProps extends BaseFormFieldProps<HTMLElement> {
  direction?: 'row' | 'column';
  options: Option[];
}
export const FormikRadioGroup = ({
  caption,
  className,
  direction = 'column',
  id,
  label,
  name,
  options,
  tooltip,
}: RadioGroupProps) => {
  const fieldName = name || id;
  const [field, meta, helpers] = useField<string>(fieldName);
  const error = useShownError(meta);

  return (
    <Fieldset
      className={className}
      id={id}
      legend={fieldLabel(id, label)}
      help={caption ?? tooltip}
      error={error}
    >
      <div className={direction === 'row' ? 'flex flex-wrap gap-x-4' : undefined}>
        {options.map((option) => (
          <Radio
            key={option.value}
            id={`${id}-${option.value}`}
            name={fieldName}
            value={option.value}
            label={option.label}
            checked={field.value === option.value}
            onBlur={field.onBlur}
            onChange={() => {
              helpers.setValue(option.value);
              helpers.setTouched(true, false);
            }}
          />
        ))}
      </div>
    </Fieldset>
  );
};
