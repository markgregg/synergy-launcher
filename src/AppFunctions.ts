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
import Selection, { AdvanceDirection } from './types/Selection';
import moment from 'moment';

export const hasSelections = (selection: Selection) => {
  return selection.choice && 
    selection.choices.has(selection.choice) && 
    (selection.choices.get(selection.choice!)?.length ?? 0) > 1;
}

export const hasOptions = (selection: Selection) => {
  return selection.option && 
    selection.options.has(selection.option) && 
    (selection.options.get(selection.option!)?.length ?? 0) > 1;
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

export const advance = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.choices.keys());
  if( selection.choice ) {
    const items = selection.choices.get(selection.choice);
    if( items ) {
      const idx = getIndex( items, selection.selection, direction);
      if( idx === -1 ) {
        let grpIdx = keys.indexOf(selection.choice);
        if( direction === AdvanceDirection.Next ) {
          grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
        } else {
          grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
        }
        const itemsList = selection.choices.get(keys[grpIdx])
        if( itemsList && itemsList.length > 0) {
          selection.selection = ( direction === AdvanceDirection.Next ) 
            ? itemsList[0]
            : itemsList[itemsList.length-1];
          selection.choice = keys[grpIdx];
        }
      } else {
        selection.selection = items[idx];
      }
      refresh();
      return;
    }
  }
  for (const [key,items] of selection.choices.entries()) {
    if( items.length > 0 ) {
      selection.selection = items[0];
      selection.choice = key;
      return;
    }
  }
}

export const advanceType = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.choices.keys());
  if( selection.choice ) {
    let grpIdx = keys.indexOf(selection.choice);
    if( direction === AdvanceDirection.Next ) {
      grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
    } else {
      grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
    }
    const itemsList = selection.choices.get(keys[grpIdx])
    if( itemsList && itemsList.length > 0) {
      selection.selection = ( direction === AdvanceDirection.Next ) 
        ? itemsList[0]
        : itemsList[itemsList.length-1];
      selection.choice = keys[grpIdx];
    }
    refresh();
    return;
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

export const advanceOptions = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.options.keys());
  if( selection.option ) {
    const items = selection.options.get(selection.option);
    if( items ) {
      const idx = getOptionIndex( items, selection.optionSelection, direction);
      if( idx === -1 ) {
        let grpIdx = keys.indexOf(selection.option);
        if( direction === AdvanceDirection.Next ) {
          grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
        } else {
          grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
        }
        const itemsList = selection.options.get(keys[grpIdx])
        if( itemsList && itemsList.length > 0) {
          selection.optionSelection = ( direction === AdvanceDirection.Next ) 
            ? itemsList[0]
            : itemsList[itemsList.length-1];
          selection.option = keys[grpIdx];
        }
      } else {
        selection.optionSelection = items[idx];
      }
      refresh();
      return;
    }
  }
  for (const [key,items] of selection.choices.entries()) {
    if( items.length > 0 ) {
      selection.selection = items[0];
      selection.choice = key;
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

export const updateSingleValueOptions = (field: Field, text: string, type: string, selection: Selection) => {
  if( (field.matchPatten && text.match(field.matchPatten)) ||
      (field.matchExpresion && eval(`const val="${text}"; ${field.matchExpresion}`) === true) ||
      matches(type, text, field.dateFormats) ) {
    const option: SingleValue = {
      value: convertValue(type, text, field.valueExpresion, field.dateFormats),
      type
    }
    selection.options.set(field.name, [option]);
    if( !selection.optionSelection ) {
      selection.option = field.name;
      selection.optionSelection = option;
    }
  } else {
    selection.options.delete(field.name);
    if( selection.option === field.name) {
      selection.option = undefined;
      selection.optionSelection = undefined;
    }
  }
}

export const updateOptionChoices = (
  choices: Choice[], 
  lists: Map<string,Option[]>, 
  type: string,
  text: string,
  selection: Selection,
  refresh: () => void
) => {
  const choice = choices.find( choice => choice.key.toLowerCase() === type);
  if( choice ) {
    let options: Option[] = [];
    if( choice.list && lists.has(choice.list) ) {
      
      options = lists.get(choice.list)?.filter( (opt: Option | string) => {
        return (choice.ignoreCase ?? true)
          ? ((opt as Option).display ?? (opt as Option).value).toLowerCase().startsWith(text.toLowerCase())
          : ((opt as Option).display ?? (opt as Option).value).startsWith(text);
        }) ?? [];
      if( options.length > 0 ) {
        selection.options.set(choice.key, options);
        if( !selection.optionSelection ) {
            selection.option = choice.key;
            selection.optionSelection = options[0];
        }
      } else {
        selection.options.delete(choice.key);
        if( selection.option === choice.key) {
          selection.option = undefined;
          selection.optionSelection = undefined;
        }
      }
      refresh();
    } 
  }
}

export const updateApps = (
  pwas: Pwa[],
  text: string,
  selection: Selection,
  refresh: () => void
) => {
  const apps = pwas.filter( pwa => pwa.title.toLowerCase().startsWith(text.toLowerCase()));
  if( apps.length === 0 ) {
    selection.choices.delete("APPS");
    if( selection.choice === "APPS" ) {
      selection.choice = undefined;
      selection.selection = undefined;
      advance(selection, refresh, AdvanceDirection.Next);
    }
  } else {
    selection.choices.set("APPS", apps)
    if( !selection.choice ||
      selection.choice === "APPS" ) {
      selection.choice = "APPS";
      selection.selection = apps[0];
    }
  }
  refresh();
}

export const updateIntents = (
  intents: Intent[],
  text: string,
  selection: Selection,
  refresh: () => void
) => {
  intents.forEach( intent => {
    const match = intent.triggers.find( trigger => {
      return (intent.ignoreCase ?? true)
        ? trigger.toLowerCase().startsWith(text.toLowerCase()) 
        : trigger.startsWith(text) 
    });
    if( match ) {
      const intentOption: IntentOption = {
        action: intent.action,
        domain: intent.domain,
        subDomain: intent.subDomain,
        text: match
      }
      selection.choices.set(intent.action, [intentOption])
      if( !selection.choice || 
        selection.choice === intent.action ) {
        selection.choice = intent.action;
        selection.selection = intentOption;
      }
    } else {
      selection.choices.delete(intent.action);
      if( selection.choice === intent.action ) {
        selection.choice = undefined;
        selection.selection = undefined;
        advance(selection, refresh, AdvanceDirection.Next);
      }
    }
    refresh();
  });
}

export const updateInterests = (
  interests: Interest[],
  lists: Map<string,Option[]>,
  text: string,
  selection: Selection,
  refresh: () => void
) => {
  interests.forEach( interest => {
    if (interest.list && lists.has(interest.list) ) {
      const options = lists.get(interest.list)?.filter( (opt: Option | string) => {
        return ((opt as Option).display ?? (opt as Option).value).toLowerCase().startsWith(text.toLowerCase());
        });
      if( options && options.length > 0 ) {
        const intrestOptions: InterestOption[] = options.map( value => {
          return {
            topic: interest.topic,
            domain: interest.domain,
            subDomain: interest.subDomain,
            text: value.value,
            body: value.body
          }
        });
        selection.choices.set(interest.topic, intrestOptions)
        if( !selection.choice || 
          selection.choice === interest.topic ) {
          selection.choice = interest.topic;
          selection.selection = intrestOptions[0];
        }
      } else {
        selection.choices.delete(interest.topic);
        if( selection.choice === interest.topic ) {
          selection.choice = undefined;
          selection.selection = undefined;
          advance(selection, refresh, AdvanceDirection.Next);
        }
      }
      refresh();
    }
  });
}

export const getSearchText = (event: ChangeEvent<HTMLInputElement>): string => {
  const end = event.target.selectionStart ?? 0;
  let start = end;
  while( start > 0 && (event.target.value.charAt(start) !== ' ')) start--; 
  return event.target.value.substring(start).trim();
}
