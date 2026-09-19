import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import { textToTitleCase } from '@utils/strings';
import { linkCellFormatter } from 'src/app/world_records/components/cellFormatters';
import { Alert } from '@ui/Alert';

const columnHelper = createColumnHelper<WorldRecord>();
const columns = [
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
    size: 40,
  }),
  columnHelper.accessor('recordType', {
    header: 'Record Type',
  }),
  columnHelper.accessor('specs', {
    header: 'Specs',
    size: 80,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    cell: info => textToTitleCase(info.getValue()),
    size: 40,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: linkCellFormatter,
    size: 40,
  }),
];

type AthleteWorldRecordsTableProps = {
  worldRecords: WorldRecord[];
};

const AthleteWorldRecordsTable = ({ worldRecords }: AthleteWorldRecordsTableProps) => {
  if (worldRecords.length === 0) {
    return <Alert variant="info">No world records found for this athlete.</Alert>;
  }
  return (
    <Table options={{ columns, data: worldRecords, initialState: { sorting: [{ id: 'date', desc: true }] } }} />
  );
};

export default AthleteWorldRecordsTable;
