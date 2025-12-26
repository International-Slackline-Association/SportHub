import { useFormikContext } from "formik";
import { EventSubmissionFormValues } from "../types";
import { EventDetailsCard } from "@ui/EventCard";

export const ReviewEventForm = () => {
  const { values } = useFormikContext<EventSubmissionFormValues>();

  const totalPrize = (values.contests || []).reduce((sum, c: any) => sum + (Number(c?.totalPrizeValue) || 0), 0);
  const participants = (values.contests || []).reduce((sum, c: any) => sum + ((c?.results?.length) || 0), 0);
  const discipline = Array.isArray(values.event?.disciplines)
    ? values.event.disciplines
    : values.event?.disciplines ?? [];

  return (
    <>
      ...Review Event Form WIP...
      <EventDetailsCard
        title="Event Details"
        event={{
          date: values.event?.date as any,
          city: values.event?.city,
          country: values.event?.country,
          disciplines: discipline as any,
          prize: totalPrize || undefined,
          // synthesize a list for count-only case
          athletes: Array.from({ length: participants || 0 }) as any[],
          verified: false,
        }}
      />
    </>
  );
};