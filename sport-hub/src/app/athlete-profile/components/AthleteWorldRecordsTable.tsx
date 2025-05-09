import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord, mockWorldRecords } from '@mocks/athlete_profile';
import Table from '@ui/Table';

const columnHelper = createColumnHelper<WorldRecord>();
const columns = [
  columnHelper.accessor("record", {
    header: "Record",
  }),
  columnHelper.accessor("location", {
    header: "Location",
  }),
  columnHelper.accessor("date", {
    header: "Date",
  }),
  columnHelper.accessor("value", {
    header: "Value",
  }),
];

type AthleteWorldRecordsTableProps = {
  records?: WorldRecord[];
};

const AthleteWorldRecordsTable = ({ records = mockWorldRecords }: AthleteWorldRecordsTableProps) => {
  return (
    <div className="mb-8">
      <h3>World Records</h3>
      <Table options={{ columns, data: records }} />
    </div>
  );
};

export default AthleteWorldRecordsTable;
