import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';

const columnHelper = createColumnHelper<WorldRecord>();
const columns = [
  columnHelper.accessor("recordType", {
    header: "Record Type",
  }),
  columnHelper.accessor("specs", {
    header: "Specs",
  }),
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("country", {
    header: "Country",
  }),
  columnHelper.accessor("gender", {
    header: "Gender",
  }),
  columnHelper.accessor("date", {
    header: "Date",
  }),
];

type AthleteWorldRecordsTableProps = {
  worldRecords: WorldRecord[];
};

const AthleteWorldRecordsTable = ({ worldRecords }: AthleteWorldRecordsTableProps) => {
  return (
    <div className="mb-8">
      <h3>World Records</h3>
      <Table options={{ columns, data: worldRecords }} />
    </div>
  );
};

export default AthleteWorldRecordsTable;
