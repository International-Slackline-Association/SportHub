import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';
import { textToTitleCase } from '@utils/strings';
import { linkCellFormatter } from 'src/app/world_records/components/cellFormatters';

const columnHelper = createColumnHelper<WorldFirst>();
const columns = [
  columnHelper.accessor('date', {
    header: 'Date',
    enableSorting: true,
    size: 40,
  }),
  columnHelper.accessor('typeOfFirst', {
    header: 'World First Type',
    size: 60,
  }),
  columnHelper.accessor('specs', {
    header: 'Specs',
    size: 80,
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    size: 120,
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

type AthleteWorldFirstsTableProps = {
  worldFirsts: WorldFirst[];
};

const AthleteWorldFirstsTable = ({ worldFirsts }: AthleteWorldFirstsTableProps) => {
  return (
    <Table options={{ columns, data: worldFirsts, initialState: { sorting: [{ id: 'date', desc: true }] } }} />
  );
};

export default AthleteWorldFirstsTable;
