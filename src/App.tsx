import { useState, KeyboardEvent, ChangeEvent, useRef } from 'react';
import { getApps, launchPwa, raiseIntent } from 'synergy-client';
import { RegisteredClient } from 'synergy-client';
import { 
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown
} from "react-icons/md";

import './App.css';

interface Option {
  display?: string; //if missing then value
  value: string;
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

type FunctionCall = (param: string) => Promise<Option[]>;

interface Service {
  endPoint: string;
  parameter: string;
}

interface Choice {
  key: string;
  ignoreCase?: boolean; //defaults to true
  options?: Option[];
  service?: Service | FunctionCall;
}

interface Config {
  choices: Choice[];
  interests: Interest[];
  intents: Intent[];
}

const currencyPairs = [
  {value: 'USD/GBP'},
  {value: 'GBP/EUR'},
  {value: 'EUR/USD'},
  {value: 'GBP/JPY'},
  {value: 'USD/JPY'},
  {value: 'GBP/AUD'},
  {value: 'GBP/BRL'},
  {value: 'GBP/CAD'},
  {value: 'GBP/CHF'},
  {value: 'GBP/CNY'},
  {value: 'GBP/INR'},
  {value: 'GBP/NOK'},
  {value: 'GBP/QAR'},
  {value: 'GBP/ZAR'},
  {value: 'EUR/CHF'},
  {value: 'EUR/CAD'},
  {value: 'EUR/JPY'},
  {value: 'EUR/SEK'},
  {value: 'EUR/HUF'},
  {value: 'USD/CAD'},
  {value: 'USD/HKD'},
  {value: 'USD/SGD'},
  {value: 'USD/INR'},
  {value: 'USD/MXN'},
  {value: 'USD/CNY'},
  {value: 'USD/CHF'}
  ];

const getCcyPair = (param: string): Promise<Option[]> => {
  console.log(param);
  return new Promise( (resolve,reject) => {
    resolve(currencyPairs.filter( ccyPair => ccyPair.value.toLowerCase().startsWith(param.toLowerCase())));
  });
}

const brokers = [
  {value: "LHAM"}, 
  {value: "CHASE"}, 
  {value: "BARC"}, 
  {value: "POLIC"}, 
  {value: "SANT"}, 
  {value: "REND"}
];

const getBroker = (param: string): Promise<Option[]> => {
  console.log(param);
  return new Promise( (resolve,reject) => {
    resolve(brokers.filter( broker => broker.value.toLowerCase().startsWith(param.toLowerCase())));
  });
}

const config: Config = {
  choices: [
    {
      key: 'side',
      options: [{value: 'BUY'}, {value: 'SELL'}]
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
  props: Map<string,string>;
}


const hasSelections = (selection: Selection) => {
  return selection.choice && 
    selection.choices.has(selection.choice) && 
    (selection.choices.get(selection.choice!)?.length ?? 0) > 1;
}

const hasOptions = (selection: Selection) => {
  return selection.option && 
    selection.options.has(selection.option) && 
    (selection.options.get(selection.option!)?.length ?? 0) > 1;
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

const getOptionText  = (option: Option, text: string): string => {
  const idx = (option.display ?? option.value).toLowerCase().indexOf(text.toLowerCase());
  const removeText = (option.display ?? option.value).slice(idx,text.length);
  return (option.display ?? option.value).replace(removeText,"");
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
      if( idx === -1 ) {
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


const getOptionIndex = (items: Option[], item: Option | undefined, direction: AdvanceDirection): number => {
  if( !item ) {
    return 0;
  }
  console.log(item);
  let idx = items.findIndex(option => option.value === item.value);
  if( idx === -1 ) {
    return 0;
  } 
  if( direction === AdvanceDirection.Previous ) {
    return idx === 0 ? -1 : idx - 1;
  }
  console.log(`advance = ${idx}`)
  return idx === items.length - 1 ? -1 : idx + 1;
}

const advanceOptions = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.options.keys());
  if( selection.option ) {
    const items = selection.options.get(selection.option);
    console.log(items)
    if( items ) {
      const idx = getOptionIndex( items, selection.optionSelection, direction);
      console.log(`idx = ${idx}`)
      if( idx === -1 ) {
        let grpIdx = keys.indexOf(selection.option);
        console.log(`gidx = ${grpIdx},len ${ keys.length}`);
        console.log(keys);
        if( direction === AdvanceDirection.Next ) {
          grpIdx = ( grpIdx === keys.length -1 ) ? 0 : grpIdx + 1;
        } else {
          grpIdx = ( grpIdx === 0 ) ? keys.length -1 : grpIdx -1;
        }
        console.log(`gidx = ${grpIdx}`)
        const itemsList = selection.options.get(keys[grpIdx])
        console.log(itemsList)
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
      options: new Map(),
      props: new Map()
    }
  );
  const [,setUpdate] = useState<number>();

  const refresh = () => setUpdate(window.performance.now());

  const clearSelection = () => {
    selection.current.choices = new Map();
    selection.current.choice = undefined;
    selection.current.selection = undefined;
    selection.current.options = new Map();
    selection.current.optionSelection = undefined;
    selection.current.option = undefined;
    refresh();
  }
  
  const updateOptions = (text: string) => {
    selection.current.intent?.fields.forEach( field => {
      console.log(field);
      if( field.type.toLowerCase() === "custom" ) {
        console.log("custom");
        if( field.valueExpresion && 
          ( (field.matchPatten && text.match(field.matchPatten)) ||
          (field.matchExpresion && eval(`const val="${text}"; ${field.matchExpresion}`) === true) )) {
            const value = eval(`const val="${text}"; ${field.valueExpresion}`);
            selection.current.options.set(field.name, value);
          } else {
            selection.current.options.delete(field.name);
          }
      } else {
        const choice = config.choices.find( choice => choice.key.toLowerCase() === field.type.toLowerCase());
        console.log(choice);
        if( choice ) {
          let options: Option[] = [];
          if( choice.options ) {
            console.log("options");
            options = choice.options?.filter( (opt: Option | string) => {
              return (choice.ignoreCase ?? true)
                ? ((opt as Option).display ?? (opt as Option).value).toLowerCase().startsWith(text.toLowerCase())
                : ((opt as Option).display ?? (opt as Option).value).startsWith(text);
              });
            if( options.length > 0 ) {
              selection.current.options.set(choice.key, options);
              if( !selection.current.optionSelection ) {
                  selection.current.option = choice.key;
                  selection.current.optionSelection = options[0];
                }
            } else {
              selection.current.options.delete(choice.key);
              if( selection.current.option === choice.key) {
                selection.current.option = undefined;
                selection.current.optionSelection = undefined;
              }
            }
            refresh();
          } else if( choice.service ) {
            console.log("service");
            if (typeof choice.service === 'function') {
              choice.service(text)
                .then( options => {
                  console.log(options);
                  if( options.length > 0 ) {
                    selection.current.options.set(choice.key, options);
                    if( !selection.current.optionSelection ) {
                      selection.current.option = choice.key;
                      selection.current.optionSelection = options[0];
                    }
                  } else {
                    selection.current.options.delete(choice.key);
                    if( selection.current.option === choice.key) {
                      selection.current.option = undefined;
                      selection.current.optionSelection = undefined;
                    }
                  }
                  refresh();
                })
                .catch(error => console.log(error));
            }
          }
        }
      }
    });
  }
  
  const updateSelection = (searchText: string) => {
    console.log(`searchText: ${searchText}`);
    getMatchingApps(searchText)
      .then( apps => {
        console.log(apps);
        if( apps.length === 0 ) {
          selection.current.choices.delete("APPS");
          if( selection.current.choice === "APPS" ) {
            selection.current.choice = undefined;
            selection.current.selection = undefined;
            advance(selection.current, refresh, AdvanceDirection.Next);
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
          ? trigger.toLowerCase().startsWith(searchText.toLowerCase()) 
          : trigger.startsWith(searchText) 
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
          advance(selection.current, refresh, AdvanceDirection.Next);
        }
      }
      refresh();
    });

    config.interests.forEach( intent => {

    });
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
          selection.current.props = new Map();
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
          } else if( selection.current.optionSelection ) {
            advanceOptions(selection.current, refresh, AdvanceDirection.Next);
          }
          event.preventDefault();
          break;

        case "ArrowUp":
          if( selection.current.selection ) {
            advance(selection.current, refresh, AdvanceDirection.Previous);
          } else if( selection.current.optionSelection ) {
            advanceOptions(selection.current, refresh, AdvanceDirection.Next);
          }
          event.preventDefault();
          break;

        case "Home":
          break;

        case "End":
          break;

        case "NumpadEnter":
        case "Enter":
          console.log("enter");
          if( selection.current.selection ) {
            const active = selection.current.selection;
            if( "url" in active ) {
              console.log(`Launching ${active.url}`);
              launchPwa(active.url);
              setInputText("");
              clearSelection();
            } 
          } else if( selection.current.intent ) {
            console.log("has intent");
            const payload: any = {}
            const elements = inputText.split(" ");
            let haveIntent = false;
            elements.forEach( element => {
              console.log(element);
              if( !haveIntent && selection.current.intent?.triggers.find( trigger => trigger.toLowerCase() === element.toLowerCase()) ) {
                haveIntent = true;
                if(selection.current.intent.triggerField) {
                  payload[selection.current.intent.triggerField] = element;
                }
              } else {
                const prop = selection.current.props.get(element);
                if( prop ) {
                  payload[prop] = element;
                }
              }
            });
            console.log(payload);
            raiseIntent(
              selection.current.intent.action,
              selection.current.intent.donmain,
              selection.current.intent.subDomain,
              payload
            );
            selection.current.intent = undefined;
            selection.current.props = new Map();
            clearSelection();
            setInputText("");
          }
          break;

        case "Tab":
          if( selection.current.selection ) {
            const active = selection.current.selection;
            if ( "action" in active ) {
              const trigger = getTriggerText(active, selection.current.text ?? "");
              console.log(trigger);
              console.log(active)
              if( trigger ) {
                selection.current.intent = active;
                setInputText(trigger + " ");
                clearSelection();
              }
            }
          } else if( selection.current.option && selection.current.optionSelection ) {
            console.log(`prop: ${selection.current.option}, ${selection.current.optionSelection.value} `);
            selection.current.props.set(selection.current.optionSelection.value, selection.current.option);
            const text = inputText.substring(0,inputText.lastIndexOf(" ") + 1);
            setInputText(text + selection.current.optionSelection.value + " ");
            clearSelection();
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
              selection.current.optionSelection && <span className="suggestionText">{getOptionText(selection.current.optionSelection, selection.current.text ?? "")}</span>
            } 
            {
              hasOptions(selection.current) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp className="iconTop"/>
                <MdOutlineKeyboardArrowDown className="iconBottom"/>
              </span>
            }
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
              selection.current.choice && <span className="suggestionText">-{selection.current.choice}</span>
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
