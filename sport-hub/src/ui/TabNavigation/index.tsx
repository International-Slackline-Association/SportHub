import styles from './styles.module.css';
import { cn } from '@utils/cn';

export type Tab = {
  id: string;
  label: string;
  path: string;
};

type TabNavigationProps = {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
};

const TabNavigation = ({ activeTab, tabs, onTabChange }: TabNavigationProps) => {
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(styles.tabButton, { [styles.activeTab]: activeTab === tab.id})}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
