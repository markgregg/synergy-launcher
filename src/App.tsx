import { useState, KeyboardEvent, ChangeEvent, useRef } from 'react';
import { getApps, launchPwa, notifyInterest, raiseIntent } from 'synergy-client';
import { RegisteredClient } from 'synergy-client';
import { 
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown
} from "react-icons/md";

import './App.css';

interface Option {
  display?: string; //if missing then value
  value: string;
  body?: string;
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
  domain?: string;
  subDomain?: string;
  action: string;
  fields: Field[]; //buy,sell,price,
}

interface IntentOption {
  domain?: string;
  subDomain?: string;
  action: string;
  text: string;  
}

interface Interest {
  domain?: string;
  subDomain?: string;
  topic: string;
  body?: string; //choice
  service?: Service | FunctionCall;
}

interface InterestOption {
  domain?: string;
  subDomain?: string;
  topic: string;
  text: string;
  body: any;
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
    {
      topic: 'ccyPair',
      service: getCcyPair
    }
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
  completeText: string;
  text?: string;
  choices: Map<string,IntentOption[] | RegisteredClient[] | InterestOption[]>;
  choice?: string;
  selection?: RegisteredClient | IntentOption | InterestOption;
  intent?: Intent;
  interest?: InterestOption;
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

const getIntentText = (intent: IntentOption, text: string): string => {
  const idx = intent.text.toLowerCase().indexOf(text.toLowerCase());
  const removeText = intent.text.slice(idx,text.length);
  return intent.text.replace(removeText,"");
}

const getInterestText = (interest: InterestOption, text: string): string => {
  const idx = interest.text.toLowerCase().indexOf(text.toLowerCase());
  const removeText = interest.text.slice(idx,text.length);
  return interest.text.replace(removeText,"");
}

const getSelectionText = (selection: RegisteredClient | IntentOption | InterestOption, text: string): string => {
  return "url" in selection
    ? (selection.name ?? selection.url).replace(text,"")
    : "action" in selection
      ? getIntentText(selection, text)
      : getInterestText(selection, text)
}

const getOptionText  = (option: Option, text: string): string => {
  const idx = (option.display ?? option.value).toLowerCase().indexOf(text.toLowerCase());
  const removeText = (option.display ?? option.value).slice(idx,text.length);
  return (option.display ?? option.value).replace(removeText,"");
}

const getIdx = <T extends RegisteredClient | IntentOption | InterestOption> (
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

const getIndex = <T extends RegisteredClient | IntentOption | InterestOption> (items: T[], item: T | undefined, direction: AdvanceDirection): number => {
  if( !item ) {
    return 0;
  }
  console.log(item);
  let idx = getIdx(items, item);
  console.log(idx);
  if( idx === -1 ) {
    return 0;
  } 
  console.log(`direction = ${direction}, idx = ${idx}`);
  if( direction === AdvanceDirection.Previous ) {
    return idx === 0 ? -1 : idx - 1;
  }
  return idx === items.length - 1 ? -1 : idx + 1;
}

const advance = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.choices.keys());
  if( selection.choice ) {
    const items = selection.choices.get(selection.choice);
    console.log(items)
    if( items ) {
      console.log(selection.selection);
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

const advanceType = (selection: Selection, refresh: () => void, direction: AdvanceDirection) => {
  const keys = Array.from(selection.choices.keys());
  if( selection.choice ) {
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
    refresh();
    return;
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

const App = () => {
  const [inputText,setInputText] = useState<string>("");
  const selection = useRef<Selection>( 
    {
      completeText: "",
      choices: new Map(),
      options: new Map(),
      props: new Map()
    }
  );
  const [,setUpdate] = useState<number>();

  const refresh = () => setUpdate(window.performance.now());
  const updateInputText = (text: string) => {
    selection.current.completeText = text;
    setInputText(text);
  }

  const clearSelection = () => {
    selection.current.choices = new Map();
    selection.current.choice = undefined;
    selection.current.selection = undefined;
    selection.current.options = new Map();
    selection.current.optionSelection = undefined;
    selection.current.option = undefined;
    refresh();
  }

  const addIntent = (intentOption: IntentOption) => {
    console.log(intentOption)
    const intent = config.intents.find( intent => 
      intent.action === intentOption.action && 
      intent.domain === intentOption.domain &&
      intent.subDomain === intentOption.subDomain
    );
    console.log(config.intents);
    console.log(intent);
    if( intent ) {
      selection.current.intent = intent;
      updateInputText(intentOption.text + " ");
      clearSelection();
    }
  }

  const addInterest = (interestOption: InterestOption) => {
    console.log(interestOption)
    selection.current.interest = interestOption;
    updateInputText(interestOption.text + " ");
    clearSelection();
  }

  const addOption = (option: string, selectedOption: Option) => {
    console.log(`prop: ${option}, ${selectedOption.value} `);
    selection.current.props.set(selectedOption.value, option)
    const text = selection.current.completeText.substring(0, selection.current.completeText.lastIndexOf(" ") + 1);
    updateInputText(text + selectedOption.value + " ");
    clearSelection();
  }

  const completeItem = () => {
    if( selection.current.selection ) {
      const active = selection.current.selection;
      if ( "action" in active ) {
        addIntent(active);
      } else if( "topic" in active ) {
        addInterest(active);
      }
    } else if( selection.current.option && selection.current.optionSelection ) {
      addOption(selection.current.option, selection.current.optionSelection);
    }
  }

  const launchApp = (app: RegisteredClient ) => {
    console.log(`Launching ${app.url}`);
    launchPwa(app.url);
    updateInputText("");
    clearSelection();
  }

  const sendIntent = (intent: Intent) => {
    console.log("has intent");
    const payload: any = {}
    const elements = selection.current.completeText.split(" ");
    let haveIntent = false;
    elements.forEach( element => {
      console.log(element);
      if( !haveIntent && intent.triggers.find( trigger => trigger.toLowerCase() === element.toLowerCase()) ) {
        haveIntent = true;
        if(intent.triggerField) {
          payload[intent.triggerField] = element;
        }
      } else {
        const prop = selection.current.props.get(element);
        console.log(`add ${prop}:${element}`);
        if( prop ) {
          payload[prop] = element;
        }
      }
    });
    console.log(payload);
    raiseIntent(
      intent.action,
      intent.domain,
      intent.subDomain,
      payload
    );
    selection.current.intent = undefined;
    selection.current.props = new Map();
    clearSelection();
    updateInputText("");
  }

  const sendInterest = (interest: InterestOption) => {
    console.log("has interest");
    notifyInterest(
      interest.topic,
      interest.domain,
      interest.subDomain,
      interest.body ?? interest.text
    );
    selection.current.interest = undefined;
    clearSelection();
    updateInputText("");
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
          if( !selection.current.choice ||
            selection.current.choice === "APPS" ) {
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
        const intentOption: IntentOption = {
          action: intent.action,
          domain: intent.domain,
          subDomain: intent.subDomain,
          text: match
        }
        selection.current.choices.set(intent.action, [intentOption])
        if( !selection.current.choice || 
          selection.current.choice === intent.action ) {
          selection.current.choice = intent.action;
          selection.current.selection = intentOption;
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

    config.interests.forEach( interest => {
      if (typeof interest.service === 'function') {
        interest.service(searchText)
          .then( interests => {
            const intrestOptions: InterestOption[] = interests.map( value => {
              return {
                topic: interest.topic,
                domain: interest.domain,
                subDomain: interest.subDomain,
                text: value.value,
                body: value.body
              }
            });
            if( interests.length > 0 ) {
              console.log(intrestOptions);
              selection.current.choices.set(interest.topic, intrestOptions)
              if( !selection.current.choice || 
                selection.current.choice === interest.topic ) {
                selection.current.choice = interest.topic;
                selection.current.selection = intrestOptions[0];
              }
            } else {
              selection.current.choices.delete(interest.topic);
              if( selection.current.choice === interest.topic ) {
                selection.current.choice = undefined;
                selection.current.selection = undefined;
                advance(selection.current, refresh, AdvanceDirection.Next);
              }
            }
            refresh();
          })
          .catch(error => console.log(error));
      }
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
          selection.current.interest = undefined;
        } 
      }
      updateInputText(event.target.value);
    } catch(error) {
      console.log(error);
    }
  }

  const keyPressed = (event: KeyboardEvent<HTMLInputElement>) => {
    try {
      switch (event.code) {
        case "ArrowDown":
          if(!event.shiftKey) {
            if( selection.current.selection ) {
              advance(selection.current, refresh, AdvanceDirection.Next);
            } else if( selection.current.optionSelection ) {
              advanceOptions(selection.current, refresh, AdvanceDirection.Next);
            }
          } else {
            advanceType(selection.current, refresh, AdvanceDirection.Next);
          }
          event.preventDefault();
          break;

        case "ArrowUp":
          if(!event.shiftKey) {
            if( selection.current.selection ) {
              advance(selection.current, refresh, AdvanceDirection.Previous);
            } else if( selection.current.optionSelection ) {
              advanceOptions(selection.current, refresh, AdvanceDirection.Next);
            }
          } else {
            advanceType(selection.current, refresh, AdvanceDirection.Previous);
          }
          event.preventDefault();
          break;

        case "NumpadEnter":
        case "Enter":
          console.log("enter");
          completeItem();
          if( selection.current.selection ) {
            const active = selection.current.selection;
            if( "url" in active ) {
              launchApp(active);
            } 
          } else if( selection.current.intent ) {
            sendIntent(selection.current.intent);
          } else if( selection.current.interest ) {
            sendInterest(selection.current.interest);
          }
          break;

        case "Tab":
          completeItem();
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
