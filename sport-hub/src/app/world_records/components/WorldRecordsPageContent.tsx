"use client";

import { useState } from 'react';
import { WorldRecord, WorldFirst } from '@lib/data-services';
import { TabGroup } from '@ui/Tab';
import WorldRecordsTable from './WorldRecordsTable';
import WorldFirstsTable from './WorldFirstsTable';

const TABS = [
  { id: 'records', label: 'World Records' },
  { id: 'firsts',  label: 'World Firsts'  },
];

type WorldRecordsPageContentProps = {
  worldRecords: WorldRecord[];
  worldFirsts: WorldFirst[];
};

const WorldRecordsPageContent = ({ worldRecords, worldFirsts }: WorldRecordsPageContentProps) => {
  const [activeTab, setActiveTab] = useState('records');

  return (
    <div>
      <TabGroup
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="secondary"
        className="mb-6"
      />
      {activeTab === 'records' && <WorldRecordsTable data={worldRecords} />}
      {activeTab === 'firsts'  && <WorldFirstsTable  data={worldFirsts}  />}
    </div>
  );
};

export default WorldRecordsPageContent;
