import { cn } from '@utils/cn';
import styles from './styles.module.css';

type RoleTagsProps = {
  roles: Roles[];
};

const RoleTags = ({ roles }: RoleTagsProps) => {
  return (
    roles.map((role) => (
      <div 
        key={role} 
        className={cn(
          styles.roleTag,{
          [styles.roleAthlete]: role === 'Athlete',
          [styles.roleJudge]: role === 'Judge',
          [styles.roleOrganiser]: role === 'Organiser',
        })}
      >
        {role}
      </div>
    ))
  );
};

export default RoleTags;
