import { useFormikContext } from "formik";
import { ContestFormValues, EventSubmissionFormValues } from "../types";
import { EventDetailsCard } from "@ui/EventDetailsCard";

export const ReviewEventForm = () => {
  const { values } = useFormikContext<EventSubmissionFormValues>();

  const totalPrize = (values.contests || []).reduce((sum, c: ContestFormValues) => sum + (Number(c?.totalPrizeValue) || 0), 0);
  const participants = (values.contests || []).reduce((sum, c: ContestFormValues) => sum + ((c?.results?.length) || 0), 0);
  const discipline = Array.isArray(values.event?.disciplines)
    ? values.event.disciplines
    : values.event?.disciplines ?? [];

  return (
    <>
      <EventDetailsCard
        event={{
          date: values.event?.date,
          city: values.event?.city,
          country: values.event?.country,
          disciplines: discipline,
          prize: totalPrize || undefined,
          // synthesize a list for count-only case
          athletes: Array.from({ length: participants || 0 }),
          verified: false,
        }}
      />
    </>
  );
};