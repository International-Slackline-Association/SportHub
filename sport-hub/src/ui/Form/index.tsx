import React, { PropsWithChildren } from 'react';
import { Field, ErrorMessage, useFormikContext, FieldInputProps, FieldMetaProps, FormikBag, FormikProps } from 'formik';
import styles from './styles.module.css';
import Button from '@ui/Button';
import Spinner from '@ui/Spinner';
import { cn } from '@utils/cn';
export * from './commonOptions';

const pascalCaseToTitleCase = (text: string) =>
  text[0].toUpperCase() + text.slice(1).replace(/([A-Z])/g, ' $1');

export const FormikSubmitButton = ({ children }: PropsWithChildren<Record<string, never>>) => {
  const { isSubmitting, isValid, dirty } = useFormikContext();

  return (
    <Button type="submit" variant="primary" disabled={isSubmitting || !isValid || !dirty}>
      {isSubmitting && <Spinner color="white" size="small" />}
      {!isSubmitting && (children || "Submit Form")}
    </Button>
  );
};

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

interface FormikFieldProps <Value,>{ field: FieldInputProps<Value>; meta: FieldMetaProps<Value>; form: any }
const FormikFormField = (props: PropsWithChildren<TextFieldProps | SelectFieldProps>) => {
  const { id, label, className, children } = props;
  const displayLabel = label || pascalCaseToTitleCase(id || "");
  return (
    <div className={`${styles.fieldContainer} ${className || ''}`}>
      <label htmlFor={id} className={styles.label}>
        {displayLabel}
      </label>
      {children}
      <ErrorMessage name={id || props.name || ""} component="div" className={styles.errorMessage} />
    </div>
  );
};

interface TextFieldProps extends BaseFormFieldProps, React.InputHTMLAttributes<HTMLInputElement>{};
export const FormikTextField = ({
  className,
  id,
  label,
  ...inputProps
}: TextFieldProps) => {
  return (
    <FormikFormField id={id} label={label} className={className}>
      <Field name={id}>
        {({ field, meta }: FormikFieldProps<string>) => (
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

interface SelectFieldProps extends BaseFormFieldProps, React.SelectHTMLAttributes<HTMLSelectElement>{
  options: Option[];
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
        {({ field, meta }: FormikFieldProps<string>) => (
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

export const FormikCheckboxField = ({
  className,
  id,
  label,
}: PropsWithChildren<BaseFormFieldProps>) => (
  <FormikFormField id={id} label={label} className={cn(styles.checkboxField, className)}>
    <Field name={id}>
      {({ field, form }: FormikFieldProps<boolean>) => (
        <input
          className={styles.checkbox}
          checked={field.value}
          onChange={() => form.setFieldValue(id, !field.value)}
          type="checkbox"
        />
      )}
    </Field>
  </FormikFormField>
);

interface FormikCheckboxGroupProps extends BaseFormFieldProps{
  direction?: 'row' | 'column';
  options: Option[];
}
export const FormikCheckboxGroup = ({
  className,
  direction = 'column',
  id,
  label,
  options,
}: FormikCheckboxGroupProps) => (
  <FormikFormField id={id} label={label} className={cn(className)}>
    <Field name={id}>
      {({ field, form }: FormikFieldProps<string[]>) => (
        <div className={cn(direction === "column" ? styles.verticalGroup : styles.horizontalGroup)}>
          {options.map((option) => {
            const isSelected = field.value?.includes(option.value);
            return (
              <div className={styles.checkboxField} key={option.value}>
                <label htmlFor={id} className={styles.label}>
                  {option.label}
                </label>
                <input
                  className={styles.checkbox}
                  checked={isSelected}
                  onChange={() => {
                    const selections = [...field.value];

                    if (isSelected) {
                      const index = selections.indexOf(option.value);
                      selections.splice(index, 1);
                    } else {
                      selections.push(option.value);
                    }

                    form.setFieldValue(id, selections);
                  }}
                  type="checkbox"
                />
              </div>
            );
          })}
        </div>
      )}
    </Field>
  </FormikFormField>
);

interface RadioGroupProps extends BaseFormFieldProps{
  direction?: 'row' | 'column';
  options: Option[];
}
export const FormikRadioGroup = ({
  className,
  direction = 'column',
  id,
  label,
  options,
}: RadioGroupProps) => (
  <FormikFormField id={id} label={label} className={cn(className, direction === 'column' ? "flex-col" : "")}>
    <Field name={id}>
      {({ field, form }: FormikFieldProps<string[]>) => (
        <div className={cn(direction === "column" ? styles.verticalGroup : styles.horizontalGroup)}>
          {options.map((option) => {
            const isSelected = field.value?.includes(option.value);
            return (
              <div className={styles.checkboxField} key={option.value}>
                <label htmlFor={id} className={styles.label}>
                  {option.label}
                </label>
                <input
                  className={styles.checkbox}
                  checked={isSelected}
                  onChange={() => form.setFieldValue(id, option.value)}
                  value={option.value}
                  type="radio"
                />
              </div>
            );
          })}
        </div>
      )}
    </Field>
  </FormikFormField>
);
