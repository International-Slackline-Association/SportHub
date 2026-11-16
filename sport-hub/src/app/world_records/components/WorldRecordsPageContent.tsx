"use client";

import { useState } from 'react';
import { WorldRecord, WorldFirst } from '@lib/data-services';
import { Tabs } from '@slacklineinternational/onsight/react';
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
      <Tabs
        aria-label="Records and firsts"
        className="mb-6"
        onChange={setActiveTab}
        tabs={TABS}
        value={activeTab}
        variant="pill"
      />
      {activeTab === 'records' && <WorldRecordsTable data={worldRecords} />}
      {activeTab === 'firsts'  && <WorldFirstsTable  data={worldFirsts}  />}
    </div>
  );
};

export default WorldRecordsPageContent;
