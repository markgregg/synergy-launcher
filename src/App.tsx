import { useState, KeyboardEvent, ChangeEvent, useRef } from 'react';
import { getApps, launchPwa } from 'synergy-client';
import { RegisteredClient } from 'synergy-client';
import { 
  MdOutlineKeyboardDoubleArrowUp,
  MdOutlineKeyboardDoubleArrowDown,
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown
} from "react-icons/md";

import './App.css';

interface Option {
  key?: string; //if missing then value
  display?: string; //if missing then value
  value: any;
}

interface Field {
  name: string;
  type: string; //datatype or choice key
  matchPatten?: string; //regex pattern or javascript used to detmined if text matches
  valueFunction?: string; //javascript run using eval
}

interface Intent {
  triggers: string[]; //if matches a field then value is used in field
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
}

type ServiceCall = (param: string) => any[];

interface Service {
  endPoint: string;
  parameter: string;
}

interface Choice {
  key: string;
  ignoreCase?: boolean; //defaults to true
  options: Option[] | string[];
  service?: Service | ServiceCall;
}

interface Config {
  choices: Choice[];
  interests: Interest[];
  intents: Intent[];
}

const config: Config = {
  choices: [
    {
      key: 'side',
      options: ['BUY', 'SELL']
    }
  ],
  interests: [
    
  ],
  intents: [
    {
      triggers: ['buy', 'sell'],
      action: 'test',
      fields: [
        {
          name: 'side',
          type: 'side'
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
enum SelectionType {
  Interest,
  Intent,
  App
}

enum AdvanceDirection {
  Next,
  Previous
}

interface Selection {
  text?: string;
  apps: RegisteredClient[];
  intents: Intent[];
  interests: Interest[];
  intent?: Intent;
  currentType?: SelectionType;
  selection?: RegisteredClient | Intent | Interest;
  options?: Option[];
}

const getType = (currentType: SelectionType): string => {
  return currentType === SelectionType.App 
    ? "App"
    : currentType === SelectionType.Intent
     ? "Action"
     : "Context";
}

const hasSelections = (selection: Selection) => {
  return selection.currentType === SelectionType.App
    ? selection.apps.length > 1
    : selection.currentType === SelectionType.Intent
      ? selection.intents.length > 1
      : selection.interests.length > 1;
}

const getSelectionText = (selection: RegisteredClient | Intent | Interest, text: string): string => {
  const suggestion = "url" in selection
    ? selection.name ?? selection.url
    : "action" in selection
      ? selection.action
      : selection.topic;
      console.log(`${suggestion} - ${text}`);
  return suggestion.replace(text,"");
}

const getIndex = <T extends object> (items: T[], item: T | undefined, direction: AdvanceDirection): number => {
  if( !item ) {
    return 0;
  }
  let idx = items.indexOf(item);
  if( idx === -1 ) {
    return 0;
  } 
  if( direction === AdvanceDirection.Previous ) {
    return idx === 0 ? items.length -1 : idx-1;
  }
  return idx === items.length -1 ? 0 : idx+1;
}

const advance = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  if( selection.currentType === SelectionType.App ) {
    if( selection.apps.length > 1 && selection.selection) {
      const idx = getIndex(selection.apps, selection.selection as RegisteredClient, direction);
      selection.selection = selection.apps[idx];
      refresh();
    } 
  } else if ( selection.currentType === SelectionType.Intent ) {
    const idx = getIndex(selection.intents, selection.selection as Intent, direction);
    selection.selection = selection.apps[idx];
    refresh();
  } else {
    const idx = getIndex(selection.interests, selection.selection as Interest, direction);
    selection.selection = selection.apps[idx];
    refresh();
  }
}

const processSelection = (selection: RegisteredClient | Intent | Interest) => {
  if( "url" in selection ) {
    console.log(`Launching ${selection.url}`);
    launchPwa(selection.url);
  }
}

const App = () => {
  const [inputText,setInputText] = useState<string>("");
  const selection = useRef<Selection>( 
    {
      apps: [],
      intents: [],
      interests: []
    }
  );
  const [update,setUpdate] = useState<number>();

  const refresh = () => setUpdate(window.performance.now());

  const clearSelection = () => {
    selection.current = {
      apps: [],
      intents: [],
      interests: []
    };
    refresh();
  }
  
  const updateSelection = (searchText: string) => {
    if( selection.current.intent ) {
      //we can show only options;
    } else {
      console.log(`searchText: ${searchText}`);
      getMatchingApps(searchText)
        .then( apps => {
          console.log(apps);
          selection.current.apps = apps;
          if( apps.length === 0 ) {
            if( selection.current.currentType === SelectionType.App ) {
              selection.current.currentType = undefined;
              selection.current.selection = undefined;
            }
          } else {
            if( !selection.current.currentType ) {
              selection.current.currentType = SelectionType.App;
              selection.current.selection = apps[0];
            }
          }
          refresh();
        })
        .catch( error => console.log(error));
    }
  }

  const textChanged = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const end = event.target.selectionStart ?? 0;
      let start = end;
      while( start > 0 && (event.target.value.charAt(start) !== ' ')) start--; 
      const word = event.target.value.substring(start);
      selection.current.text = word;
      if( word.length > 0) {
        updateSelection(word);
      } else {
        clearSelection();
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
          break;
        case "ArrowUp":
          if( selection.current.selection ) {
            advance(selection.current, refresh, AdvanceDirection.Previous);
          }
          break;
        case "Home":
          break;
        case "End":
          break;
        case "NumpadEnter":
        case "Enter":
          if( selection.current.selection ) {
            processSelection(selection.current.selection);
            clearSelection();
            setInputText("");
          }
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
              selection.current.currentType && <span className="suggestionText">{getType(selection.current.currentType)}:</span>
            }
            {
              ((selection.current.intents.length > 0 && selection.current.interests.length > 0) ||
              (selection.current.intents.length > 0 && selection.current.apps.length > 0) ||
              (selection.current.interests.length > 0 && selection.current.apps.length > 0)) &&
              <span className="iconGroup">
                <MdOutlineKeyboardDoubleArrowUp className="iconTop"/>
                <MdOutlineKeyboardDoubleArrowDown className="iconBottom"/>
              </span>
            }
          </div>  
        </div>
      </div>
    </div>
  );
}

export default App;
