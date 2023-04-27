import { ChangeEvent } from 'react';
import { 
  Choice, 
  Field, 
  Interest, 
  Pwa, 
  Intent, 
  Option, 
} from 'synergy-client';
import IntentOption from './types/IntentOption';
import InterestOption from './types/InterestOption';
import SingleValue from './types/SingleValue';
import moment from 'moment';

export const APPS = "APPS";

export interface AppState {
  choices: Map<string,IntentOption[] | Pwa[] | InterestOption[]>;
  intent?: Intent;
  interest?: InterestOption;
  choice?: string;
  selection?: Pwa | IntentOption | InterestOption;
  selectionPosition?: number;
  options: Map<string,Option[]>;
  option?: string;
  optionSelection?: Option | SingleValue;
  fields: string[];
  props: Map<string,string>;
  propPositions: Map<number,string>;
  maxPosition?: number;
}

export enum AdvanceDirection {
  Next,
  Previous
}

const updateChoices = (
  key: string,
  arr: IntentOption[] | Pwa[] | InterestOption[],
  state: AppState
) => {
  if( arr.length === 0 ) {
    state.choices.delete(key);
    if( state.choice === key ) {
      advance(
        state,
        AdvanceDirection.Next
      );
    }
  } else {
    state.choices.set(key,arr);
    if( !state.choice ||
      state.choice === key ) {
      state.choice = key;
      state.selection = arr[0];
    }
  }
}

const updateOptions = (
  key: string,
  options: Option[],
  state: AppState,
) => {
  if( options.length > 0 ) {
    state.options.set(key,options);
    if( !state.optionSelection ) {
      state.option = key;
      state.optionSelection = options[0];
    }
  } else {
    state.options.delete(key);
    if( state.option === key) {
      state.option = undefined;
      state.optionSelection = undefined;
    }
  }
}

export const hasSelections = (
  choice: string | undefined,
  choices: Map<string,IntentOption[] | Pwa[] | InterestOption[]>
) => {
  return choice && 
    choices.has(choice) && 
    (choices.get(choice!)?.length ?? 0) > 1;
}

export const hasOptions = (
  option: string | undefined,
  options: Map<string,Option[]>
) => {
  return option && 
    options.has(option) && 
    (options.get(option!)?.length ?? 0) > 1;
} 

export const getIntentText = (intent: IntentOption, text: string): string => {
  const idx = intent.text.toLowerCase().indexOf(text.toLowerCase());
  const removeText = intent.text.slice(idx,text.length);
  return intent.text.replace(removeText,"");
}

export const getInterestText = (interest: InterestOption, text: string): string => {
  const idx = interest.text.toLowerCase().indexOf(text.toLowerCase());
  const removeText = interest.text.slice(idx,text.length);
  return interest.text.replace(removeText,"");
}

export const getAppText = (selection: Pwa, text: string): string => {
  const idx = (selection.title ?? selection.url).toLowerCase().indexOf(text.toLowerCase());
  const removeText = (selection.title ?? selection.url).slice(idx,text.length);
  return (selection.title ?? selection.url).replace(removeText,"");
}

export const getSelectionText = (selection: Pwa | IntentOption | InterestOption, text: string): string => {
  return "url" in selection
    ? getAppText(selection, text)
    : "action" in selection
      ? getIntentText(selection, text)
      : getInterestText(selection, text)
}

export const getOptionText  = (option: Option | SingleValue, text: string): string => {
  if( "type" in option) {
    return `${option.value}`;
  } else {
    const idx = (option.display ?? option.value).toLowerCase().indexOf(text.toLowerCase());
    const removeText = (option.display ?? option.value).slice(idx,text.length);
    return (option.display ?? option.value).replace(removeText,"");
  }
}

const getIdx = <T extends Pwa | IntentOption | InterestOption> (
  items: T[], 
  item: T 
): number => {
  for (let index = 0; index < items.length; index++) {
    const element = items[index];
    if( "url" in item && "url" in element) {
      if( item.url === element.url) {
        return index;
      }
    }
    if( "action" in item && "action" in element) {
      if( item.action === element.action &&
        item.domain === element.domain &&
        item.subDomain === element.subDomain &&
        item.text === element.text) {
        return index;
      }
    }
    if( "topic" in item && "topic" in element) {
      if( item.topic === element.topic &&
        item.domain === element.domain &&
        item.subDomain === element.subDomain &&
        item.text === element.text) {
        return index;
      }
    }
  }
  return -1;
}

const getIndex = <T extends Pwa | IntentOption | InterestOption> (items: T[], item: T | undefined, direction: AdvanceDirection): number => {
  if( !item ) {
    return 0;
  }
  let idx = getIdx(items, item);
  if( idx === -1 ) {
    return 0;
  } 
  if( direction === AdvanceDirection.Previous ) {
    return idx === 0 ? -1 : idx - 1;
  }
  return idx === items.length - 1 ? -1 : idx + 1;
}

export const advance = (
  state: AppState,
  direction: AdvanceDirection,
) => {
  const keys = Array.from(state.choices.keys());
  if( state.choice ) {
    const items = state.choices.get(state.choice);
    if( items ) {
      const idx = getIndex( items, state.selection, direction);
      if( idx === -1 ) {
        let grpIdx = keys.indexOf(state.choice);
        if( direction === AdvanceDirection.Next ) {
          grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
        } else {
          grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
        }
        const itemsList = state.choices.get(keys[grpIdx])
        if( itemsList && itemsList.length > 0) {
          state.choice = keys[grpIdx];
          state.selection = direction === AdvanceDirection.Next  
            ? itemsList[0]
            : itemsList[itemsList.length-1]
        }
      } else {
        state.selection = items[idx]
      }
    }
    return;
  }
  for (const [key,items] of state.choices.entries()) {
    if( items.length > 0 ) {
      state.choice = key;
      state.selection = items[0];
    }
  }
}

export const advanceType = (
  state: AppState,
  direction: AdvanceDirection
) => {
  const keys = Array.from(state.choices.keys());
  if( state.choice ) {
    let grpIdx = keys.indexOf(state.choice);
    if( direction === AdvanceDirection.Next ) {
      grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
    } else {
      grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
    }
    const itemsList = state.choices.get(keys[grpIdx])
    if( itemsList && itemsList.length > 0) {
      state.selection = direction === AdvanceDirection.Next  
        ? itemsList[0]
        : itemsList[itemsList.length-1];
      state.choice = keys[grpIdx];
    }
  }
}

const getOptionIndex = (items: Option[], item: Option | undefined, direction: AdvanceDirection): number => {
  if( !item ) {
    return 0;
  }
  let idx = items.findIndex(option => option.value === item.value);
  if( idx === -1 ) {
    return 0;
  } 
  if( direction === AdvanceDirection.Previous ) {
    return idx === 0 ? -1 : idx - 1;
  }
  return idx === items.length - 1 ? -1 : idx + 1;
}

export const advanceOptions = (
  state: AppState,
  direction: AdvanceDirection,
) => {
  const keys = Array.from(state.options.keys());
  if( state.option ) {
    const items = state.options.get(state.option);
    if( items ) {
      const idx = getOptionIndex( items, state.optionSelection, direction);
      if( idx === -1 ) {
        let grpIdx = keys.indexOf(state.option);
        if( direction === AdvanceDirection.Next ) {
          grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
        } else {
          grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
        }
        const itemsList = state.options.get(keys[grpIdx])
        if( itemsList && itemsList.length > 0) {
          
          state.optionSelection = direction === AdvanceDirection.Next 
            ? itemsList[0]
            : itemsList[itemsList.length-1];
          state.option = keys[grpIdx];
        }
      } else {
        state.optionSelection = items[idx];
      }
      return;
    }
  }
  for (const [key,items] of state.options.entries()) {
    if( items.length > 0 ) {
      state.optionSelection = items[0];
      state.option = key;
      return;
    }
  }
}

const matches = (type: string, text: string, formats?: string[]): boolean => {
  return type === "number"
    ? !isNaN(+text)
    : type === "date"
      ? (formats 
        ? formats.find(format => moment(text, format, true).isValid()) !== undefined 
        : moment(text).isValid())
      : text.length > 0;
}

const convertValue = (type: string, text: string, expression?: string, formats?: string[]): any => {
  return expression 
    ? eval(`const val="${text}"; ${expression}`)
    :  type === "number"
      ?  +text
      : type === "date"
        ? (formats 
          ? moment(text, formats.find(format => moment(text, format, true).isValid()), true).toDate()
          : moment(text).toDate())
        : text;
}

export const updateSingleValueOptions = (
    field: Field, 
    text: string, 
    type: string, 
    state: AppState
  ) => {
  const options: SingleValue[] = (field.matchPatten && text.match(field.matchPatten)) ||
    (field.matchExpresion && eval(`const val="${text}"; ${field.matchExpresion}`) === true) ||
    matches(type, text, field.dateFormats)
    ? [{
      value: convertValue(type, text, field.valueExpresion, field.dateFormats),
      type
    }]
    : []
  updateOptions(
    field.name,
    options,
    state
  );
}

export const updateOptionChoices = (
  choices: Choice[], 
  lists: Map<string,Option[]>, 
  type: string,
  text: string,
  state: AppState
) => {
  const choice = choices.find( choice => choice.key.toLowerCase() === type);
  if( choice ) {
    if( choice.list && lists.has(choice.list) ) {
      const availableOptions = lists.get(choice.list)?.filter( (opt: Option | string) => {
        return (choice.ignoreCase ?? true)
          ? ((opt as Option).display ?? (opt as Option).value).toLowerCase().startsWith(text.toLowerCase())
          : ((opt as Option).display ?? (opt as Option).value).startsWith(text);
        }) ?? [];
      updateOptions(
        choice.key,
        availableOptions,
        state
      );
    } 
  }
}

export const updateApps = (
  pwas: Pwa[],
  text: string,
  state: AppState
) => {
  const apps = pwas.filter( pwa => pwa.title.toLowerCase().startsWith(text.toLowerCase()));
  updateChoices(APPS, apps, state);
}

export const updateIntents = (
  intents: Intent[],
  text: string,
  state: AppState
) => {
  intents.forEach( intent => {
    const match = intent.triggers.find( trigger => {
      return (intent.ignoreCase ?? true)
        ? trigger.toLowerCase().startsWith(text.toLowerCase()) 
        : trigger.startsWith(text) 
    });

    const arr: IntentOption[] | undefined = match
      ? [{
          action: intent.action,
          domain: intent.domain,
          subDomain: intent.subDomain,
          text: match
        }]
      : [];
    updateChoices(intent.action, arr, state);
  });
}

export const updateInterests = (
  interests: Interest[],
  lists: Map<string,Option[]>,
  text: string,
  state: AppState
) => {
  interests.forEach( interest => {
    if (interest.list && lists.has(interest.list) ) {
      const options = lists.get(interest.list)?.filter( (opt: Option | string) => {
        return ((opt as Option).display ?? (opt as Option).value).toLowerCase().startsWith(text.toLowerCase());
        });
      const arr: InterestOption[] = options && options.length > 0
        ? options.map( value => {
            return {
                topic: interest.topic,
                domain: interest.domain,
                subDomain: interest.subDomain,
                text: value.value,
                body: value.body
              }
          })
        : [];
      updateChoices(interest.topic, arr, state);
    }
  });
}

export const getSearchText = (event: ChangeEvent<HTMLInputElement>): string => {
  const end = event.target.selectionStart ?? 0;
  let start = end;
  while( start > 0 && (event.target.value.charAt(start) !== ' ')) start--; 
  return event.target.value.substring(start).trim();
}
