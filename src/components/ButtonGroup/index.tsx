import { FC } from 'react';
import { 
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown
} from "react-icons/md";
import './ButtonGroup.css';

interface ButtonGroupProps {
  onClickedUp: () => void;
  onClickedDown: () => void;
}

const ButtonGroup: FC<ButtonGroupProps> = ({onClickedUp, onClickedDown}) => {
  return (
    <span className="iconGroup">
      <MdOutlineKeyboardArrowUp 
        className="iconTop"
        onClick={() => onClickedUp}
        />
      <MdOutlineKeyboardArrowDown 
        className="iconBottom"
        onClick={() => onClickedDown}
      />
    </span>
  );
}

export default ButtonGroup;