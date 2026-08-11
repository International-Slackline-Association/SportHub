import Button from "@ui/Button";
import { FormikTextField, TextFieldProps } from "@ui/Form";
import { cn } from "@utils/cn";
import { FieldArray, useFormikContext } from "formik";
import { SocialIcon } from "react-social-icons";
import { getIn } from "formik";

interface LinkFieldArrayProps {
  formKey: string;
}

const LinkFormikTextField = <FormType,>({ className, id, onRemove, ...props }: TextFieldProps & { onRemove: () => void }) => {
  const { values } = useFormikContext<FormType>();
  const url = getIn(values, id) as unknown as string;
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

export const LinkFieldArray = <FormType,>({ formKey }: LinkFieldArrayProps) => {
  const { values } = useFormikContext<FormType>();
  const links = getIn(values, formKey) as unknown as string[] || [];

  return (
    <FieldArray name={formKey}>
      {({ push, remove }) => (
        <div>
          {links?.map((_: string, idx: number) => (
            <LinkFormikTextField
              id={`${formKey}[${idx}]`}
              key={`${formKey}[${idx}]`}
              onRemove={() => remove(idx) }
              placeholder="Social network, live stream, event details, etc."
            />
          ))}
          <Button
            onClick={() => push("")}
            variant="default"
          >
            Add link
          </Button>
        </div>
      )}
    </FieldArray>
  );
};
