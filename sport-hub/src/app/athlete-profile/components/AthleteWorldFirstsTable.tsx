import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';
import { CountryFlag } from '@ui/CountryFlag';
import { textToTitleCase } from '@utils/strings';

const columnHelper = createColumnHelper<WorldFirst>();
const columns = [
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
  }),
  columnHelper.accessor('typeOfFirst', {
    header: 'World First Type',
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

type AthleteWorldFirstsTableProps = {
  worldFirsts: WorldFirst[];
};

const AthleteWorldFirstsTable = ({ worldFirsts }: AthleteWorldFirstsTableProps) => {
  return (
    <Table options={{ columns, data: worldFirsts, initialState: { sorting: [{ id: 'date', desc: true }] } }} />
  );
};

export default AthleteWorldFirstsTable;
