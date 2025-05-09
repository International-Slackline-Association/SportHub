import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst, mockWorldFirsts } from '@mocks/athlete_profile';
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
  firsts?: WorldFirst[];
};

const AthleteWorldFirstsTable = ({ firsts = mockWorldFirsts }: AthleteWorldFirstsTableProps) => {
  return (
    <div className="mb-8">
      <h3>World Firsts</h3>
      <Table options={{ columns, data: firsts }} />
    </div>
  );
};

export default AthleteWorldFirstsTable;
