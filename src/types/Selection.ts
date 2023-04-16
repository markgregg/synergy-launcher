import { Pwa, Intent, Option } from "synergy-client";
import IntentOption from './IntentOption';
import InterestOption from './InterestOption';
import SingleValue from './SingleValue';

export enum AdvanceDirection {
  Next,
  Previous
}

export default interface Selection {
  completeText: string;
  text?: string;
  choices: Map<string,IntentOption[] | Pwa[] | InterestOption[]>;
  choice?: string;
  selection?: Pwa | IntentOption | InterestOption;
  intent?: Intent;
  interest?: InterestOption;
  selectionPosition?: number;
  options: Map<string,Option[]>;
  option?: string;
  optionSelection?: Option | SingleValue;
  props: Map<string,string>;
  fields: string[]; 
  propPositions: Map<number,string>;
  maxPosition?: number;
}

