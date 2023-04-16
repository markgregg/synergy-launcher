import { useState, KeyboardEvent, ChangeEvent, useRef, useEffect } from 'react';
import { 
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown
} from "react-icons/md";
import { 
  getLaunchConfig, 
  launchPwa, 
  notifyInterest, 
  raiseIntent,
  Pwa, 
  Intent, 
  Option, 
  LaunchConfig
} from 'synergy-client';
import IntentOption from './types/IntentOption';
import InterestOption from './types/InterestOption';
import Selection, { AdvanceDirection } from './types/Selection';
import './App.css';
import { advance, advanceOptions, advanceType, getOptionText, getSearchText, getSelectionText, hasOptions, hasSelections, updateApps, updateIntents, updateInterests, updateOptionChoices, updateSingleValueOptions } from './AppFunctions';

        
const App = () => {
  const textCopyRef = useRef<HTMLSpanElement>(null);
  const [config,setConfig] = useState<LaunchConfig>({
    pwas: [],
    lists: new Map(),
    choices: [],
    interests: [],
    intents: []
  });
  const [inputText,setInputText] = useState<string>("");
  const selection = useRef<Selection>( 
    {
      completeText: "",
      choices: new Map(),
      options: new Map(),
      props: new Map(),
      propPositions: new Map(),
      fields: []
    }
  );
  const [menuPosition,setMenuPosition] = useState<number>(3);
  const [,setUpdate] = useState<number>();
  const refresh = () => setUpdate(window.performance.now());
  const resizeObserver = useRef<ResizeObserver>(new ResizeObserver(() => {
    if( textCopyRef.current) {
      setMenuPosition((textCopyRef.current.clientWidth * .93) + 3);
    }
  }));

  useEffect(() => {
    getLaunchConfig()
      .then( config => {
        setConfig(config);
      })
      .catch(error => console.log(error));
  },[])

  useEffect(() => {
    const observer = resizeObserver.current;
    const textRef = textCopyRef.current;
    if( observer && textRef ) {
      observer.observe(textRef);
      return () => observer.unobserve(textRef);
    }
  },[textCopyRef.current])

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
    selection.current.fields = []
    refresh();
  }

  const addIntent = (intentOption: IntentOption) => {
    const intent = config.intents.find( intent => 
      intent.action === intentOption.action && 
      intent.domain === intentOption.domain &&
      intent.subDomain === intentOption.subDomain
    );
    if( intent ) {
      selection.current.selectionPosition = intentOption.text.length;
      selection.current.intent = intent;
      updateInputText(intentOption.text + " ");
      clearSelection();
    }
  }

  const addInterest = (interestOption: InterestOption) => {
    selection.current.selectionPosition = interestOption.text.length;
    selection.current.interest = interestOption;
    updateInputText(interestOption.text + " ");
    clearSelection();
  }

  const addOption = (option: string, selectedOption: Option) => {
    selection.current.props.set(selectedOption.value, option);
    selection.current.fields.push(option);
    const text = selection.current.completeText.substring(0, selection.current.completeText.lastIndexOf(" ") + 1);
    const newText = text + selectedOption.value;
    selection.current.propPositions.set(newText.length, selectedOption.value)
    selection.current.maxPosition = newText.length;
    updateInputText(newText + " ");
    clearSelection();
  }

  const removeLastProperty = () => {
    if( selection.current.maxPosition ) {
      const prop = selection.current.propPositions.get(selection.current.maxPosition);
      if( prop ) {
        selection.current.propPositions.delete(selection.current.maxPosition);
        const field = selection.current.props.get(prop);
        if( field ) {
          const idx = selection.current.fields.indexOf(field);
          if( idx !== -1 ) {
            selection.current.fields.splice(idx,1);
          }
        }
        selection.current.props.delete(prop);
        
        let max = -1;
        selection.current.propPositions.forEach( (value, key) => {
          if( key > max) {
            max = key;
          }
        });
        selection.current.maxPosition = ( max !== -1) ? max : undefined;
        console.log("property removed")
      }
    }
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

  const launchApp = (app: Pwa ) => {
    launchPwa(app.url);
    updateInputText("");
    clearSelection();
  }

  const sendIntent = (intent: Intent) => {
    const payload: any = {}
    const elements = selection.current.completeText.split(" ");
    let haveIntent = false;
    elements.forEach( element => {
      if( !haveIntent && intent.triggers.find( trigger => trigger.toLowerCase() === element.toLowerCase()) ) {
        haveIntent = true;
        if(intent.triggerField) {
          payload[intent.triggerField] = element;
        }
      } else {
        const prop = selection.current.props.get(element);
        if( prop ) {
          payload[prop] = element;
        }
      }
    });
    raiseIntent(
      intent.action,
      intent.domain,
      intent.subDomain,
      payload
    );
    clearSelectedItem();
    updateInputText("");
  }

  const sendInterest = (interest: InterestOption) => {
    notifyInterest(
      interest.topic,
      interest.domain,
      interest.subDomain,
      interest.body ?? interest.text
    );
    selection.current.interest = undefined;
    clearSelectedItem();
    updateInputText("");
  }
  
  const updateOptions = (text: string) => {
    selection.current.intent?.fields.forEach( field => {
      if( selection.current.fields.indexOf(field.name) === -1 ) {
        const type =  field.type.toLowerCase();
        if( type === "number" ||
          type === "string" ||
          type === "date" ) {
          updateSingleValueOptions(field, text, type, selection.current);
          refresh();
        } else {
          updateOptionChoices(
            config.choices,
            config.lists,
            type,
            text,
            selection.current,
            refresh
          );
        }
      }
    });
  }
  
  const updateSelection = (text: string) => {
    updateApps(
      config.pwas,
      text,
      selection.current,
      refresh
    );

    updateIntents(
      config.intents,
      text,
      selection.current,
      refresh
    );

    updateInterests(
      config.interests,
      config.lists,
      text,
      selection.current,
      refresh
    );
  }

  const clearSelectedItem = () => {
    console.log("clear selection")
    selection.current.intent = undefined;
    selection.current.props = new Map();
    selection.current.propPositions = new Map();
    selection.current.interest = undefined;
    selection.current.selectionPosition = undefined;
    selection.current.maxPosition = undefined;
  }

  const textChanged = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const searchText = getSearchText(event);
      selection.current.text = searchText;
      
      if( searchText.length > 0 ) {
        //if text has been deleted past the last selected item (intent or interest) then clear it
        if( selection.current.selectionPosition && selection.current.selectionPosition >= event.target.value.length ) {
          clearSelectedItem();
        //if text has been deleted past the last option, then clear it
        } else if( selection.current.maxPosition && selection.current.maxPosition >= event.target.value.length ) {
          removeLastProperty();
        //we have an itent, so check for options
        } else if( selection.current.intent || selection.current.interest ) {
          updateOptions(searchText);
        } else {
        //check for intents, interests or apps
          updateSelection(searchText);
        }
      } else {
        clearSelection(); //clear selection
      }
      updateInputText(event.target.value);
    } catch(error) {
      console.log(error);
    }
  }

  const arrowDown = (shiftKey: boolean) => {
    if(!shiftKey) {
      if( selection.current.selection ) {
        advance(selection.current, refresh, AdvanceDirection.Next);
      } else if( selection.current.optionSelection ) {
        advanceOptions(selection.current, refresh, AdvanceDirection.Next);
      }
    } else {
      advanceType(selection.current, refresh, AdvanceDirection.Next);
    }
  }

  const arrowUp = (shiftKey: boolean) => {
    if(!shiftKey) {
      if( selection.current.selection ) {
        advance(selection.current, refresh, AdvanceDirection.Previous);
      } else if( selection.current.optionSelection ) {
        advanceOptions(selection.current, refresh, AdvanceDirection.Next);
      }
    } else {
      advanceType(selection.current, refresh, AdvanceDirection.Previous);
    }
  }

  const enterKey = () => {
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
  }

  const keyPressed = (event: KeyboardEvent<HTMLInputElement>) => {
    try {
      switch (event.code) {
        case "ArrowDown":
          arrowDown(event.shiftKey);
          event.preventDefault();
          break;

        case "ArrowUp":
          arrowUp(event.shiftKey);
          event.preventDefault();
          break;

        case "NumpadEnter":
        case "Enter":
          enterKey();
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
        <div className="titleText">Synergy Launch Bar</div>
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
          <div className="textShadow">
            <span 
              className="textCopy"
              ref={textCopyRef}
            >{inputText}</span>
          </div>
          <div 
            className="textMenu"
            style={{
              left: menuPosition
            }}
          >
            {
              selection.current.optionSelection && <span className="suggestionText">{getOptionText(selection.current.optionSelection, selection.current.text ?? "")}</span>
            } 
            {
              hasOptions(selection.current) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp 
                  className="iconTop"
                  onClick={() => arrowUp(false)}
                  />
                <MdOutlineKeyboardArrowDown 
                  className="iconBottom"
                  onClick={() => arrowDown(false)}
                />
              </span>
            }
            {
              selection.current.option && <span className="suggestionText">-{selection.current.option}</span>
            }
            {
              (selection.current.options.size > 1) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp 
                  className="iconTop"
                  onClick={() => arrowUp(true)}
                  />
                <MdOutlineKeyboardArrowDown 
                  className="iconBottom"
                  onClick={() => arrowDown(true)}
                />
              </span>
            }
            {
              selection.current.selection && <span className="suggestionText">{getSelectionText(selection.current.selection, selection.current.text ?? "")}</span>
            } 
            {
              hasSelections(selection.current) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp 
                  className="iconTop"
                  onClick={() => arrowUp(false)}
                  />
                <MdOutlineKeyboardArrowDown 
                  className="iconBottom"
                  onClick={() => arrowDown(false)}
                />
              </span>
            }
            {
              selection.current.choice && <span className="suggestionText">-{selection.current.choice}</span>
            }
            {
              (selection.current.choices.size > 1) &&
              <span className="iconGroup">
                <MdOutlineKeyboardArrowUp 
                  className="iconTop"
                  onClick={() => arrowUp(true)}
                  />
                <MdOutlineKeyboardArrowDown 
                  className="iconBottom"
                  onClick={() => arrowDown(true)}
                />
              </span>
            }
          </div>  
        </div>
      </div>
    </div>
  );
}

export default App;
