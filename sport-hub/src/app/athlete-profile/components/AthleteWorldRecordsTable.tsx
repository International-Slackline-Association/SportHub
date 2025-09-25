import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
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
