import type { Metadata } from "next";
import ContestTable from "./components/ContestTable";
 
export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export default async function Page() {
  return (
    <div>
      <h1> Events </h1>
      <ContestTable />
    </div>
  );
}