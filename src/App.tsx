import { useState, KeyboardEvent, ChangeEvent } from 'react';
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
  body: string; //choice
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

const App = () => {
  const [inputText,setInputText] = useState<string>("");

  const textChanged = (event: ChangeEvent<HTMLInputElement>) => {

    setInputText(event.target.value);
  }

  const keyPressed = (event: KeyboardEvent<HTMLInputElement>) => {

  }

  return (
    <div className="launcher">
      <div className="titleBar">
        <div className="titleText">Synergy</div>
      </div>
      <div className="searchContainer">
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
      </div>
    </div>
  );
}

export default App;
