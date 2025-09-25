import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';

const columnHelper = createColumnHelper<WorldFirst>();
const columns = [
  columnHelper.accessor("achievement", {
    header: "Achievement",
  }),
  columnHelper.accessor("location", {
    header: "Location",
  }),
  columnHelper.accessor("date", {
    header: "Date",
  }),
];

type AthleteWorldFirstsTableProps = {
  worldFirsts: WorldFirst[];
};

const AthleteWorldFirstsTable = ({ worldFirsts }: AthleteWorldFirstsTableProps) => {
  return (
    <div className="mb-8">
      <h3>World Firsts</h3>
      <Table options={{ columns, data: worldFirsts }} />
    </div>
  );
};

export default AthleteWorldFirstsTable;
