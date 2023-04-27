import { useState, KeyboardEvent, ChangeEvent, useRef, useEffect } from 'react';

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
import './App.css';
import { advance, AdvanceDirection, advanceOptions, advanceType, AppState, getOptionText, getSearchText, getSelectionText, hasOptions, hasSelections, updateApps, updateIntents, updateInterests, updateOptionChoices, updateSingleValueOptions } from './AppFunctions';
import ButtonGroup from './components/ButtonGroup';

const App = () => {
  const textCopyRef = useRef<HTMLSpanElement>(null);
  const [config,setConfig] = useState<LaunchConfig>({
    pwas: [],
    lists: new Map(),
    choices: [],
    interests: [],
    intents: []
  });
  const [searchText,setSearchText] = useState<string>('');
  const [inputText,setInputText] = useState<string>('');
  const [menuPosition,setMenuPosition] = useState<number>(3);
  const [state,setState] = useState<AppState>({
    choices: new Map(),
    options: new Map(),
    fields: [],
    props: new Map(),
    propPositions: new Map(),
  })
  const resizeObserver = useRef<ResizeObserver>(new ResizeObserver(() => {
    if( textCopyRef.current) {
      setMenuPosition((textCopyRef.current.clientWidth * .93) + 3);
    }
  }));

  useEffect(() => {
    //fetch configation
    getLaunchConfig()
      .then( config => {
        setConfig(config);
      })
      .catch(error => console.log(error));
  },[])

  //observe shadow text and adjust position of text menu
  useEffect(() => {
    const observer = resizeObserver.current;
    const textRef = textCopyRef.current;
    if( observer && textRef ) {
      observer.observe(textRef);
      return () => observer.unobserve(textRef);
    }
  },[textCopyRef.current])


  const clearSelectedItem = () => {
    setInputText('');
    setState({
      ...state,
      choices: new Map(),
      intent: undefined,
      props: new Map(),
      propPositions: new Map(),
      interest: undefined,
      selectionPosition: undefined,
      maxPosition: undefined,
      choice: undefined,
      selection: undefined,
      options: new Map(),
      optionSelection: undefined,
      option: undefined,
      fields:[]
    });
  }

  //Intend selected, set as active
  const addIntent = (intentOption: IntentOption) => {
    const intentDef = config.intents.find( intent => 
      intent.action === intentOption.action && 
      intent.domain === intentOption.domain &&
      intent.subDomain === intentOption.subDomain
    );
    if( intentDef ) {
      setInputText(intentOption.text + ' ');
      setState({
        ...state,
        selectionPosition: intentOption.text.length,
        intent: intentDef,
        choice: undefined,
        selection: undefined,
        options: new Map(),
        optionSelection: undefined,
        option: undefined,
        fields:[]
      });
    }
  }

  //Interest selected, set as active
  const addInterest = (interestOption: InterestOption) => {
    setInputText(interestOption.text + ' ');
    setState({
      ...state,
      selectionPosition: interestOption.text.length,
      interest: interestOption,
      choice: undefined,
      selection: undefined,
      options: new Map(),
      optionSelection: undefined,
      option: undefined,
      fields:[]
    });
  }


  //add option to intent or interest
  const addOption = (option: string, selectedOption: Option) => {
    const text = inputText.substring(0, inputText.lastIndexOf(" ") + 1);
    const newText = text + selectedOption.value;
    state.props.set(selectedOption.value, option);
    state.fields.push(option);
    state.propPositions.set(newText.length, selectedOption.value);
    setInputText(newText + ' ');
    setState({
      ...state,
      maxPosition: newText.length,
      choice: undefined,
      selection: undefined,
      options: new Map(),
      optionSelection: undefined,
      option: undefined,
      fields:[]
    });
  }

  //remove last intent property
  const removeLastProperty = () => {
    if( state.maxPosition ) {
      const prop = state.propPositions.get(state.maxPosition);
      if( prop ) {
        state.propPositions.delete(state.maxPosition);
        const field = state.props.get(prop);
        if( field ) {
          const idx = state.fields.indexOf(field);
          if( idx !== -1 ) {
            state.fields.splice(idx,1);
          }
        }
        state.props.delete(prop);
        let max = -1;
        state.propPositions.forEach( (value, key) => {
          if( key > max) {
            max = key;
          }
        });
        setState({
          ...state,

          maxPosition: max !== -1 ? max : undefined
        });
      }
    }
  }

  //After tab, complete the initialistion
  const completeItem = () => {
    if( state.selection ) {
      if ( "action" in state.selection ) {
        addIntent(state.selection);
      } else if( "topic" in state.selection ) {
        addInterest(state.selection);
      }
    } else if( state.option && state.optionSelection ) {
      addOption(state.option, state.optionSelection);
    }
  }

  //launch an app
  const launchApp = (app: Pwa ) => {
    launchPwa(app.url);
    setInputText(' ');
    setState({
      ...state,
      choice: undefined,
      selection: undefined,
      options: new Map(),
      optionSelection: undefined,
      option: undefined,
      fields:[]
    });
  }

  //Send an intent
  const sendIntent = (intent: Intent) => {
    const payload: any = {}
    const elements = inputText.split(" ");
    let haveIntent = false;
    elements.forEach( element => {
      if( !haveIntent && intent.triggers.find( trigger => trigger.toLowerCase() === element.toLowerCase()) ) {
        haveIntent = true;
        if(intent.triggerField) {
          payload[intent.triggerField] = element;
        }
      } else {
        const prop = state.props.get(element);
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
  }

  //Send an interest
  const sendInterest = (interest: InterestOption) => {
    notifyInterest(
      interest.topic,
      interest.domain,
      interest.subDomain,
      interest.body ?? interest.text
    );
    clearSelectedItem();
  }
  
  //When text changes, update available options
  const updateOptions = (text: string) => {
    state.intent?.fields.forEach( field => {
      if( state.fields.indexOf(field.name) === -1 ) {
        const type =  field.type.toLowerCase();
        //an expression type
        if( type === "number" ||
          type === "string" ||
          type === "date" ) {
          updateSingleValueOptions(
            field, 
            text, 
            type,
            state
          );
        } else {
          //a list type
          updateOptionChoices(
            config.choices,
            config.lists,
            type,
            text,
            state
          );
        }
      }
    });
    setState({
      ...state
    })
  }
  
  //when text changes and nothing is active, update possible selections
  const updateSelection = (text: string) => {
    updateApps(
      config.pwas,
      text,
      state
    );

    updateIntents(
      config.intents,
      text,
      state
    );

    updateInterests(
      config.interests,
      config.lists,
      text,
      state
    );

    setState({
      ...state
    });
  }

  //inout text changed
  const textChanged = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const text = getSearchText(event);
      setSearchText(text);
     
      if( text.length > 0 ) {
        //if text has been deleted past the last selected item (intent or interest) then clear it
        if( state.selectionPosition && state.selectionPosition >= event.target.value.length ) {
          clearSelectedItem();
        //if text has been deleted past the last option, then clear it
        } else if( state.maxPosition && state.maxPosition >= event.target.value.length ) {
          removeLastProperty();
        //we have an itent, so check for options
        } else if( state.intent || state.interest ) {
          updateOptions(text);
        } else {
        //check for intents, interests or apps
          updateSelection(text);
        }
      } else {
        setState({
          ...state,
          choice: undefined,
          selection: undefined,
          options: new Map(),
          optionSelection: undefined,
          option: undefined,
          fields:[]
        });
      }
      setInputText(event.target.value);
    } catch(error) {
      console.log(error);
    }
  }

  const advanceKey = (shiftKey: boolean, direction: AdvanceDirection) => {
    if(!shiftKey) {
      if( state.selection ) {
        advance(
          state,
          direction,
        );
      } else if( state.optionSelection ) {
        advanceOptions(
          state,
          direction
        );
      }
    } else {
      advanceType(
        state,
        direction
      );
    }
    setState({
      ...state
    });
  }

  const enterKey = () => {
    completeItem();
    if( state.selection ) {
      if( "url" in state.selection ) {
        launchApp(state.selection);
      } 
    } else if( state.intent ) {
      sendIntent(state.intent);
    } else if( state.interest ) {
      sendInterest(state.interest);
    }
  }

  //input key pressed
  const keyPressed = (event: KeyboardEvent<HTMLInputElement>) => {
    try {
      switch (event.code) {
        case "ArrowDown":
          advanceKey(event.shiftKey, AdvanceDirection.Next);
          event.preventDefault();
          break;

        case "ArrowUp":
          advanceKey(event.shiftKey, AdvanceDirection.Previous);
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
              state.optionSelection && <span className="suggestionText">{getOptionText(state.optionSelection, searchText ?? "")}</span>
            } 
            {
              hasOptions(state.option, state.options) && 
                <ButtonGroup 
                  onClickedUp={() => advanceKey(false, AdvanceDirection.Previous)}
                  onClickedDown={() => advanceKey(false, AdvanceDirection.Next)}
                />

            }
            {
              state.option && <span className="suggestionText">-{state.option}</span>
            }
            {
              (state.options.size > 1) &&
               <ButtonGroup 
                  onClickedUp={() => advanceKey(true, AdvanceDirection.Previous)}
                  onClickedDown={() => advanceKey(true, AdvanceDirection.Next)}
               />
            }
            {
              state.selection && <span className="suggestionText">{getSelectionText(state.selection, searchText ?? "")}</span>
            } 
            {
              hasSelections(state.choice, state.choices) &&
                <ButtonGroup 
                  onClickedUp={() => advanceKey(false, AdvanceDirection.Previous)}
                  onClickedDown={() => advanceKey(false, AdvanceDirection.Next)}
                />
            }
            {
              state.choice && <span className="suggestionText">-{state.choice}</span>
            }
            {
              (state.choices.size > 1) &&
              <ButtonGroup 
                onClickedUp={() => advanceKey(true, AdvanceDirection.Previous)}
                onClickedDown={() => advanceKey(true, AdvanceDirection.Next)}
              />
            }
          </div>  
        </div>
      </div>
    </div>
  );
}

export default App;
