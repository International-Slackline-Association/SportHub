import styles from './styles.module.css';

interface LabelValuePairProps {
  label: string;
  value: string | number | React.ReactNode;
};

export const LabelValuePair = ({ label, value }: LabelValuePairProps) => {
  return (
    <div className="flex flex-col gap-1">
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value || "N/A"}</div>
    </div>
  );
};