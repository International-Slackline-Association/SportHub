'use client';

import ContestSize from '@ui/Badge/ContestSize';
import { TabGroup } from '@ui/Tab';
import styles from './styles.module.css';
import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from '@utils/consts';
import { ContestRecord } from '@lib/relational-types';
import { TabGroupProps } from '@ui/Tab/TabGroup';
import { AgeCategory, Gender } from '@ui/Badge';

export type ContestJudge = {
  id?: string;
  name: string;
  isPending: boolean;
};

export type ContestResult = {
  rank: number;
  id?: string;
  name: string;
  isaPoints: number;
  isPending: boolean;
};

export type ContestTabData = ContestRecord & {
  results: ContestResult[];
};

export const ContestTabGroup = ({ contests, ...tabGroupProps }: Omit<TabGroupProps, "tabs"> & { contests: ContestTabData[]; }) => {
  return (
    <TabGroup
      {...tabGroupProps}
      className={styles.tabGroup}
      tabs={contests.map(({ ageCategory, contestSize, discipline, gender }: ContestRecord, idx) => {
        const disciplineKey = MAP_DISCIPLINE_ENUM_TO_NAME[Number(discipline)];
        const { name: disciplineName, Icon } = DISCIPLINE_DATA[disciplineKey];

        return {
          id: String(idx),
          label: (
            <div className="flex flex-col gap-1 p-2">
              <div className="flex flex-row items-center gap-2">
                <Icon height={24} width={24} />
                {disciplineName}
              </div>
              <Gender variant={(gender || "") as ContestGender} />
              <AgeCategory variant={(ageCategory || "") as AgeCategory} />
              <ContestSize variant={contestSize as ContestType} />
            </div>
          ),
        };
      })}
      variant="secondary"
    />
  );
};
