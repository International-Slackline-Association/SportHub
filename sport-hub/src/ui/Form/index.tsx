import React, { PropsWithChildren } from 'react';
import { Field, ErrorMessage, useFormikContext } from 'formik';
import styles from './styles.module.css';
import Button from '@ui/Button';
import Spinner from '@ui/Spinner';
export * from './commonOptions';

const pascalCaseToTitleCase = (text: string) =>
  text[0].toUpperCase() + text.slice(1).replace(/([A-Z])/g, ' $1');

export interface Option {
  value: string;
  label: string;
}

interface BaseFormFieldProps {
  className?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  placeholder?: string;
}

interface TextFieldProps extends BaseFormFieldProps, React.InputHTMLAttributes<HTMLInputElement>{};

interface SelectFieldProps extends BaseFormFieldProps, React.SelectHTMLAttributes<HTMLSelectElement>{
  options: Option[];
};

const FormikFormField = (props: PropsWithChildren<TextFieldProps | SelectFieldProps>) => {
  const { id, label, className, children } = props;
  const displayLabel = label || pascalCaseToTitleCase(id || "");
  return (
    <div className={`${styles.fieldContainer} ${className || ''}`}>
      <div className={styles.labelContainer}>
        <label htmlFor={id} className={styles.label}>
          {displayLabel}
        </label>
      </div>
      {children}
      <ErrorMessage name={id || props.name || ""} component="div" className={styles.errorMessage} />
    </div>
  );
};

export const FormikTextField = ({
  className,
  id,
  label,
  ...inputProps
}: TextFieldProps) => {
  return (
    <FormikFormField id={id} label={label} className={className}>
      <Field name={id}>
        {({ field, meta }: any) => (
          <div className={styles.inputContainer}>
            <input
              {...field}
              {...inputProps}
              className={`${styles.input} ${meta.touched && meta.error ? styles.error : ''}`}
              id={id}
              name={id}
              type="text"
            />
          </div>
        )}
      </Field>
    </FormikFormField>
  );
};

export const FormikSelectField = ({
  className,
  id,
  label,
  options,
  placeholder = "Select an option",
  ...selectProps
}: SelectFieldProps) => {
  return (
    <FormikFormField id={id} label={label} className={className}>
      <Field name={id}>
        {({ field, meta }: any) => (
          <div className={styles.inputContainer}>
            <select
              {...field}
              {...selectProps}
              id={id}
              className={`${styles.select} ${meta.touched && meta.error ? styles.error : ''}`}
            >
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </Field>
    </FormikFormField>
  );
};

export const FormikSubmitButton = ({ children }: PropsWithChildren<{}>) => {
  const { isSubmitting, isValid, dirty } = useFormikContext();

  return (
    <Button type="submit" variant="primary" disabled={isSubmitting || !isValid || !dirty}>
      {isSubmitting && <Spinner color="white" size="small" />}
      {!isSubmitting && (children || "Submit Form")}
    </Button>
  );
};
