import Link from 'next/link';
import styles from './styles.module.css';
import { cn } from '@utils/cn';

export type Tab = {
  id: string;
  label: string;
  path: string;
};

type TabNavigationProps = {
  activeTab: string;
  tabs: Tab[];
  onTabChange?: (tabId: string) => void;
  basePath?: string; // For SSR navigation
};

const TabNavigation = ({ activeTab, tabs, onTabChange, basePath }: TabNavigationProps) => {
  // If basePath is provided, use Next.js Link for SSR navigation
  if (basePath) {
    return (
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`${basePath}?tab=${tab.id}`}
            className={cn(styles.tabButton, { [styles.activeTab]: activeTab === tab.id})}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    );
  }

  // Fallback to client-side navigation for existing components
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(styles.tabButton, { [styles.activeTab]: activeTab === tab.id})}
          onClick={() => onTabChange && onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
