import React, { PropsWithChildren, ReactNode } from 'react';
import { Field, useFormikContext, type FieldInputProps, type FieldMetaProps, type FormikHelpers } from 'formik';
import styles from './styles.module.css';
import Button from '@ui/Button';
import Spinner from '@ui/Spinner';
import { Tooltip } from '@ui/Tooltip';
import { cn } from '@utils/cn';
import { pascalCaseToTitleCase } from '@utils/strings';
export * from './commonOptions';

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

export interface BaseFormFieldProps<Element> extends React.InputHTMLAttributes<Element> {
  id: string;
  caption?: string;
  captionPlacement?: 'top' | 'bottom';
  label?: string | ReactNode;
  tooltip?: string;
}

export interface FormikFieldProps <Value,>{ field: FieldInputProps<Value>; meta: FieldMetaProps<Value>; form: FormikHelpers<unknown> }
export const FormikFormField = (props: PropsWithChildren<TextFieldProps | SelectFieldProps>) => {
  const { caption, captionPlacement="top", id, label, className, children, required, tooltip } = props;

  let displayLabel: string | ReactNode = "";
  if (typeof label !== 'string') {
    displayLabel = label;
  } else {
    displayLabel = `${label || pascalCaseToTitleCase(id || "")}${required ? "*" : ""}`;
  }

  return (
    <div
      className={`${styles.fieldContainer} ${className || ''}`}
    >
      <div className="stack">
        <div className={styles.labelContainer}>
          <label htmlFor={id} className={styles.label}>
          {displayLabel}
        </label>
        {tooltip && <Tooltip content={tooltip} />}
        </div>
        {caption && captionPlacement === "top" && (<small className={styles.caption}>{caption}</small>)}
      </div>
      {children}
      {caption && captionPlacement === "bottom" && (<small className={styles.caption}>{caption}</small>)}
    </div>
  );
};

type TextFieldProps = BaseFormFieldProps<HTMLInputElement>;
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
  return (
    <FormikFormField
      caption={caption}
      className={className}
      id={id}
      label={label}
      required={required}
      tooltip={tooltip}
    >
      <Field name={name}>
        {({ field, meta }: FormikFieldProps<string>) => (
          <div className={styles.inputContainer}>
            <input
              {...field}
              {...inputProps}
              className={cn(styles.input, meta.error && styles.error)}
              id={id}
              name={name}
              type="text"
              value={field.value || ""}
            />
            {meta.error && (
              <div className={styles.errorMessage}>{meta.error}</div>
            )}
          </div>
        )}
      </Field>
    </FormikFormField>
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
  return (
    <FormikFormField
      caption={caption}
      className={className}
      id={id}
      label={label}
      required={required}
      tooltip={tooltip}
    >
      <Field name={name}>
        {({ field, meta }: FormikFieldProps<string>) => (
          <div className={styles.inputContainer}>
            <input
              {...field}
              {...inputProps}
              className={cn(styles.input, meta.error && styles.error)}
              id={id}
              name={name}
              type="number"
              value={field.value == null || field.value == undefined ? "" : field.value}
            />
            {meta.error && (
              <div className={styles.errorMessage}>{meta.error}</div>
            )}
          </div>
        )}
      </Field>
    </FormikFormField>
  );
};

interface SelectFieldProps extends BaseFormFieldProps<HTMLSelectElement> {
  options: Option[];
};
export const FormikSelectField = ({
  caption,
  className,
  id,
  label,
  name,
  options,
  placeholder = "Select an option",
  required,
  tooltip,
  ...selectProps
}: SelectFieldProps) => {
  return (
    <FormikFormField
      caption={caption}
      className={className}
      id={id}
      label={label}
      required={required}
      tooltip={tooltip}
    >
      <Field name={name}>
        {({ field, meta }: FormikFieldProps<string>) => (
          <div className={styles.inputContainer}>
            <select
              {...field}
              {...selectProps}
              id={id}
              name={name}
              className={cn(styles.select, meta.error && styles.error)}
            >
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {meta.error && (
              <div className={styles.errorMessage}>{meta.error}</div>
            )}
          </div>
        )}
      </Field>
    </FormikFormField>
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
}: PropsWithChildren<BaseFormFieldProps<HTMLInputElement>>) => (
  <FormikFormField
    caption={caption}
    className={cn(styles.checkboxField, className)}
    id={id}
    label={label}
    tooltip={tooltip}
    required={required}
  >
    <Field name={name}>
      {({ field, form, meta }: FormikFieldProps<boolean>) => (
        <>
          <input
            className={styles.checkbox}
            checked={field.value}
            onChange={() => form.setFieldValue(name || '', !field.value)}
            type="checkbox"
          />
          {meta.error && (
            <div className={styles.errorMessage}>{meta.error}</div>
          )}
        </>
      )}
    </Field>
  </FormikFormField>
);

interface FormikCheckboxGroupProps extends BaseFormFieldProps<HTMLElement>{
  direction?: 'row' | 'column';
  options: Option[];
  tooltip?: string;
}
export const FormikCheckboxGroup = ({
  caption,
  className,
  direction = 'column',
  id,
  label,
  name,
  options,
  required,
  tooltip,
}: FormikCheckboxGroupProps) => (
  <FormikFormField
    caption={caption}
    className={cn(className)}
    id={id}
    label={label}
    required={required}
    tooltip={tooltip}
  >
    <Field name={name}>
      {({ field, form, meta }: FormikFieldProps<string[]>) => {
        const currentValue = field.value || [];
        return (
          <>
            <div className={cn(direction === "column" ? styles.verticalGroup : styles.horizontalGroup)}>
              {options.map((option) => {
                const isSelected = currentValue.includes(option.value);
                return (
                  <div className={styles.checkboxField} key={option.value}>
                    <label htmlFor={`${id}-${option.value}`} className={styles.label}>
                      {option.label}
                    </label>
                    <input
                      id={`${id}-${option.value}`}
                      className={styles.checkbox}
                      checked={isSelected}
                      onChange={async () => {
                        const selections = [...currentValue];

                        if (isSelected) {
                          const index = selections.indexOf(option.value);
                          selections.splice(index, 1);
                        } else {
                          selections.push(option.value);
                        }

                        await form.setFieldValue(name || '', selections);
                        form.setFieldTouched(name || '', true);
                      }}
                      type="checkbox"
                    />
                  </div>
                );
              })}
            </div>
            {meta.error && (
              <div className={styles.errorMessage}>{meta.error}</div>
            )}
          </>
        );
      }}
    </Field>
  </FormikFormField>
);

interface RadioGroupProps extends BaseFormFieldProps<HTMLElement>{
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
  required,
  tooltip,
}: RadioGroupProps) => (
  <FormikFormField
    caption={caption}
    className={cn(className, direction === 'column' ? "flex-col" : "")}
    id={id}
    label={label}
    required={required}
    tooltip={tooltip}
  >
    <Field name={name}>
      {({ field, form, meta }: FormikFieldProps<string>) => (
        <>
          <div className={cn(direction === "column" ? styles.verticalGroup : styles.horizontalGroup)}>
            {options.map((option) => {
              const isSelected = field.value === option.value;
              return (
                <div className={styles.checkboxField} key={option.value}>
                  <label htmlFor={`${id}-${option.value}`} className={styles.label}>
                    {option.label}
                  </label>
                  <input
                    className={styles.checkbox}
                    checked={isSelected}
                    id={`${id}-${option.value}`}
                    onChange={async () => {
                      await form.setFieldValue(name || '', option.value);
                      form.setFieldTouched(name || '', true);
                    }}
                    name={name}
                    value={option.value}
                    type="radio"
                  />
                </div>
              );
            })}
          </div>
          {meta.error && (
            <div className={styles.errorMessage}>{meta.error}</div>
          )}
        </>
      )}
    </Field>
  </FormikFormField>
);
