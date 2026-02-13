import React, { useState } from "react";
import Tab, { TabVariant } from "./Tab";
import styles from "./styles.module.css";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabGroupProps {
  tabs: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  variant?: TabVariant;
  className?: string;
}

const TabGroup = ({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  variant = "primary",
  className = ""
}: TabGroupProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || "");

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabClick = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <div
      className={[
        styles.tabGroup,
        styles[variant],
        className
      ].filter(Boolean).join(" ")}
      role="tablist"
    >
      {tabs.map((tab) => (
        <Tab
          disabled={tab.disabled}
          isActive={activeTab === tab.id}
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          variant={variant}
        >
          {tab.label}
        </Tab>
      ))}
    </div>
  );
};

export default TabGroup;