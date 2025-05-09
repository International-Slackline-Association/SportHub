import { cn } from '@utils/cn';
import styles from './styles.module.css';

type DisciplineTagsProps = {
  disciplines: Disciplines[];
};

const kebabCaseToTitleCase = (str: string) =>
  str.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const DisciplineTags = ({ disciplines }: DisciplineTagsProps) => {
  return (
    <div className={styles.disciplineTags}>
      {disciplines.map((discipline) => (
        <div 
          key={discipline} 
          className={cn(
            styles.disciplineTag,{
            [styles.disciplineSpeed]: discipline === 'speed-short',
            [styles.disciplineSpeedHighline]: discipline === 'speed-highline',
            [styles.disciplineFreestyleHighline]: discipline === 'freestyle-highline',
          })}
        >
          {kebabCaseToTitleCase(discipline)}
        </div>
      ))}
    </div>
  );
};

export default DisciplineTags;
