import type { Metadata } from "next";
import Image from 'next/image'
import ContestsTable from "./components/ContestsTable";
import { mockFeaturedAthletes } from "@mocks/rankings_data";
import FeaturedGrid, { FeaturedCard } from "@ui/FeatureGrid";
 
export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export default async function Page() {
  return (
    <div>
      <h1>Events</h1>
      <ContestsTable />
    </div>
  );
}