import { useState, KeyboardEvent, ChangeEvent, useRef } from 'react';
import { getApps, launchPwa } from 'synergy-client';
import { RegisteredClient } from 'synergy-client';
import { 
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown
} from "react-icons/md";

import './App.css';
import { current } from '@reduxjs/toolkit';

interface Option {
  key?: string; //if missing then value
  display?: string; //if missing then value
  value: any;
}

interface Field {
  name: string;
  type: string; //datatype or choice key
  matchPatten?: string; //regex pattern 
  matchExpresion?: string; //javascript used to detmined if text matches
  valueExpresion?: string; //javascript run using eval
}

enum Case {
  Lower,
  Upper
}

interface Intent {
  triggers: string[]; //if matches a field then value is used in field
  triggerField?: string;
  ignoreCase?: boolean; //defaults to true
  adjustCase?: Case;
  donmain?: string;
  subDomain?: string;
  action: string;
  fields: Field[]; //buy,sell,price,
}

interface Interest {
  donmain?: string;
  subDomain?: string;
  topic: string;
  body?: string; //choice
  service?: Service | FunctionCall;
}

type FunctionCall = (param: string) => Promise<any[]>;

interface Service {
  endPoint: string;
  parameter: string;
}

interface Choice {
  key: string;
  ignoreCase?: boolean; //defaults to true
  options?: Option[] | string[];
  service?: Service | FunctionCall;
}

interface Config {
  choices: Choice[];
  interests: Interest[];
  intents: Intent[];
}

const currencyPairs = [
  'USD/GBP',
  'GBP/EUR',
  'EUR/USD',
  'GBP/JPY',
  'USD/JPY',
  'GBP/AUD',
  'GBP/BRL',
  'GBP/CAD',
  'GBP/CHF',
  'GBP/CNY',
  'GBP/INR',
  'GBP/NOK',
  'GBP/QAR',
  'GBP/ZAR',
  'EUR/CHF',
  'EUR/CAD',
  'EUR/JPY',
  'EUR/SEK',
  'EUR/HUF',
  'USD/CAD',
  'USD/HKD',
  'USD/SGD',
  'USD/INR',
  'USD/MXN',
  'USD/CNY',
  'USD/CHF'
  ];

const getCcyPair = (param: string): Promise<any[]> => {
  return new Promise( (resolve,reject) => {
    resolve(currencyPairs.filter( ccyPair => ccyPair.indexOf(param) !== -1));
  });
}

const brokers = ["LHAM", "CHASE", "BARC", "POLIC", "SANT", "REND"];

const getBroker = (param: string): Promise<any[]> => {
  return new Promise( (resolve,reject) => {
    resolve(brokers.filter( broker => broker.indexOf(param) !== -1));
  });
}

const config: Config = {
  choices: [
    {
      key: 'side',
      options: ['BUY', 'SELL']
    },
    {
      key: 'pair',
      service: getCcyPair
    },
    {
      key: 'broker',
      service: getBroker
    }
  ],
  interests: [
    
  ],
  intents: [
    {
      triggers: ['BUY', 'SELL', 'Exam'],
      adjustCase: Case.Upper,
      triggerField: 'side',
      action: 'test',
      fields: [
        {
          name: 'pair',
          type: 'pair'
        },
        {
          name: 'broker',
          type: 'broker'
        }
      ]
    }
  ]
}

const getMatchingApps = async (filter: string): Promise<RegisteredClient[]> => {
  return new Promise( (resolve,reject) => {
    try {
      getApps(filter)
        .then( apps =>  resolve(apps))
        .catch(error =>  reject(error));
    } catch(error) {
      reject(error);
    }
  });
}

interface IntentSelection {
  intent: Intent
  text: string;
  payload: any;
}

interface InterestSelection {
  interest: Interest
  text: string;
}

enum AdvanceDirection {
  Next,
  Previous
}

interface Selection {
  text?: string;
  choices: Map<string,Intent[] | RegisteredClient[] | Interest[]>;
  choice?: string;
  selection?: RegisteredClient | Intent | Interest;
  intent?: Intent;
  options: Map<string,Option[]>;
  option?: string;
  optionSelection?: Option;
}


const hasSelections = (selection: Selection) => {
  return selection.choice && 
    selection.choices.has(selection.choice) && 
    (selection.choices.get(selection.choice!)?.length ?? 0) > 0;
}

const getIntentText = (intent: Intent, text: string): string => {
  const intentText = (intent.triggers.find( trigger =>{
    return (intent.ignoreCase ?? true) 
      ? trigger.toLowerCase().indexOf(text.toLowerCase()) !== -1
      : trigger.indexOf(text) !== -1
  }) ?? intent.action);

  const idx = intentText.toLowerCase().indexOf(text.toLowerCase());
  const removeText = intentText.slice(idx,text.length);
  return intentText.replace(removeText,"");
}

const getSelectionText = (selection: RegisteredClient | Intent | Interest, text: string): string => {
  return "url" in selection
    ? (selection.name ?? selection.url).replace(text,"")
    : "action" in selection
      ? getIntentText(selection, text)
      : selection.topic.replace(text,"");
}

const getIdx = <T extends RegisteredClient | Intent | Interest> (
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
        item.donmain === element.donmain &&
        item.subDomain === element.subDomain) {
        return index;
      }
    }
    if( "topic" in item && "topic" in element) {
      if( item.topic === element.topic &&
        item.donmain === element.donmain &&
        item.subDomain === element.subDomain) {
        return index;
      }
    }
  }
  return -1;
}

const getIndex = <T extends RegisteredClient | Intent | Interest> (items: T[], item: T | undefined, direction: AdvanceDirection): number => {
  if( !item ) {
    return 0;
  }
  console.log(item);
  let idx = getIdx(items, item);
  if( idx === -1 ) {
    return 0;
  } 
  if( direction === AdvanceDirection.Previous ) {
    return idx === 0 ? -1 : idx - 1;
  }
  console.log(`advance = ${idx}`)
  return idx === items.length - 1 ? -1 : idx + 1;
}

const advance = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.choices.keys());
  if( selection.choice ) {
    const items = selection.choices.get(selection.choice);
    console.log(items)
    if( items ) {
      const idx = getIndex( items, selection.selection, direction);
      console.log(`idx = ${idx}`)
      if( idx == -1 ) {
        let grpIdx = keys.indexOf(selection.choice);
        console.log(`gidx = ${grpIdx},len ${ keys.length}`);
        console.log(keys);
        if( direction === AdvanceDirection.Next ) {
          grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
        } else {
          grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
        }
        console.log(`gidx = ${grpIdx}`)
        const itemsList = selection.choices.get(keys[grpIdx])
        console.log(itemsList)
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

const getTriggerText = (intent: Intent, text: string): string | undefined => {
  console.log(`cnt = ${intent.triggers.length}`);
  console.log(intent.triggers);
  for (let index = 0; index < intent.triggers.length; index++) {
    console.log(intent.triggers[index])
    if( intent.triggers[index].toLowerCase().indexOf(text.toLowerCase()) !== -1 ) {
      return intent.triggers[index];
    }
  }
}

const App = () => {
  const [inputText,setInputText] = useState<string>("");
  const selection = useRef<Selection>( 
    {
      choices: new Map(),
      options: new Map()
    }
  );
  const [update,setUpdate] = useState<number>();

  const refresh = () => setUpdate(window.performance.now());

  const clearSelection = () => {
    selection.current = {
      choices: new Map(),
      choice: undefined,
      selection: undefined,
      options: new Map(),
    };
    refresh();
  }
  
  const updateOptions = (text: string) => {
    selection.current.intent?.fields.forEach( field => {
      if( field.type.toLowerCase() === "custom" ) {
        if( field.valueExpresion && 
          ( field.matchPatten && text.match(field.matchPatten) ||
          field.matchExpresion && eval(`const val=\"${text}\"; ${field.matchExpresion}`) === true )) {
            const value = eval(`const val=\"${text}\"; ${field.valueExpresion}`);
            selection.current.options.set(field.name, value);
          } else {
            selection.current.options.delete(field.name);
          }
      } else {
        
      }
    });
  }
  
  const updateSelection = (searchText: string) => {
    if( selection.current.intent ) {
      //we can show only options;
    } else {
      console.log(`searchText: ${searchText}`);
      getMatchingApps(searchText)
        .then( apps => {
          console.log(apps);
          if( apps.length === 0 ) {
            if( selection.current.choice === "APPS" ) {
              selection.current.choice = undefined;
              selection.current.selection = undefined;
              selection.current.choices.delete("APPS");
            }
          } else {
            selection.current.choices.set("APPS", apps)
            if( !selection.current.choice ) {
              selection.current.choice = "APPS";
              selection.current.selection = apps[0];
              console.log(selection.current);
            }
          }
          refresh();
        })
        .catch( error => console.log(error));
      config.intents.forEach( intent => {
        const match = intent.triggers.find( trigger => {
          return (intent.ignoreCase ?? true)
            ? trigger.toLowerCase().indexOf(searchText.toLowerCase()) !== -1
            : trigger.indexOf(searchText) !== -1
        });
        if( match ) {
          if( !selection.current.choice ) {
            selection.current.choices.set(intent.action, [intent])
            selection.current.choice = intent.action;
            selection.current.selection = intent;
          }
        } else {
          selection.current.choices.delete(intent.action);
          if( selection.current.choice === intent.action ) {
            selection.current.choice = undefined;
            selection.current.selection = undefined;
          }
        }
      });

      config.interests.forEach( intent => {

      });
    }
  }

  const textChanged = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const end = event.target.selectionStart ?? 0;
      let start = end;
      while( start > 0 && (event.target.value.charAt(start) !== ' ')) start--; 
      const word = event.target.value.substring(start).trim();
      selection.current.text = word;
      if( word.length > 0 ) {
        if( selection.current.intent ) {
          updateOptions(word);
        } else {
          updateSelection(word);
        }
      } else {
        clearSelection();
        if( event.target.value.length === 0 ) {
          selection.current.intent = undefined;
        } 
      }
      setInputText(event.target.value);
    } catch(error) {
      console.log(error);
    }
  }

  const keyPressed = (event: KeyboardEvent<HTMLInputElement>) => {
    try {
      switch (event.code) {
        case "ArrowDown":
          if( selection.current.selection ) {
            advance(selection.current, refresh, AdvanceDirection.Next);
          }
          event.preventDefault();
          break;
        case "ArrowUp":
          if( selection.current.selection ) {
            advance(selection.current, refresh, AdvanceDirection.Previous);
          }
          event.preventDefault();
          break;
        case "Home":
          break;
        case "End":
          break;
        case "NumpadEnter":
        case "Enter":
          if( selection.current.selection ) {
            const active = selection.current.selection;
            if( "url" in active ) {
              console.log(`Launching ${active.url}`);
              launchPwa(active.url);
              clearSelection();
              setInputText("");
            } 
          }
          break;

        case "Tab":
          if( selection.current.selection ) {
            const active = selection.current.selection;
            if ( "action" in active ) {
              const trigger = getTriggerText(active, selection.current.text ?? "");
              console.log(trigger);
              if( trigger ) {
                selection.current.intent = active;
                setInputText(trigger + " ");
                clearSelection();
              }
            }
          }
          event.preventDefault();
          break;
      }
    } catch(error) {
      console.log(error);
    }
  }

  return (
    <div className="launcher">
      <div className="titleBar">
        <div className="titleText">Synergy</div>
      </div>
      <div className="searchContainer">
        <div className='innerContainer'>
          <input 
            className="search"
            type="text" 
            placeholder="Type to search"
            value={inputText}
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            onChange={textChanged}
            onKeyDownCapture={keyPressed}
          />
          <div className="textMenu">
            <span className="textCopy">{inputText}</span>
            {
              selection.current.selection && <span className="suggestionText">{getSelectionText(selection.current.selection, selection.current.text ?? "")}</span>
            } 
            {
              hasSelections(selection.current) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp className="iconTop"/>
                <MdOutlineKeyboardArrowDown className="iconBottom"/>
              </span>
            }
            {
              selection.current.choice && <span className="suggestionText">{selection.current.choice}</span>
            }
            {
              (selection.current.choices.size > 1) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp className="iconTop"/>
                <MdOutlineKeyboardArrowDown className="iconBottom"/>
              </span>
            }
          </div>  
        </div>
      </div>
    </div>
  );
}

export default App;
