import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
 
export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export default async function Page() {
  return (
    <div>
      <h1> Events </h1>
      <ContestsTable />
    </div>
  );
}