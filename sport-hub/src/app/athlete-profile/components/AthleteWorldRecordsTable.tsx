import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import { CountryFlag } from '@ui/CountryFlag';
import { textToTitleCase } from '@utils/strings';

const columnHelper = createColumnHelper<WorldRecord>();
const columns = [
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
  }),
  columnHelper.accessor('recordType', {
    header: 'Record Type',
  }),
  columnHelper.accessor('specs', {
    header: 'Specs',
  }),
  columnHelper.accessor('country', {
    header: 'Country',
    cell: info => <CountryFlag country={info.getValue()} />,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    cell: info => textToTitleCase(info.getValue()),
  }),
];

type AthleteWorldRecordsTableProps = {
  worldRecords: WorldRecord[];
};

const AthleteWorldRecordsTable = ({ worldRecords }: AthleteWorldRecordsTableProps) => {
  return (
    <Table options={{ columns, data: worldRecords, initialState: { sorting: [{ id: 'date', desc: true }] } }} />
  );
};

export default AthleteWorldRecordsTable;
