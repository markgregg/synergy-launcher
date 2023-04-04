import { useState, KeyboardEvent, ChangeEvent } from 'react';
import { getApps } from 'synergy-client/lib/esm/clientApi/client';
import { RegisteredClient } from 'synergy-client/lib/esm/synergyApi/RegisteredClient';
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

const interface 


/*
  Text (^p/!p)App:(^/!)Test App
              Action:(^/|)Buy
              Context:(^/|)USD/GBP
*/

const App = () => {
  const [inputText,setInputText] = useState<string>("");
  const []

  const textChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const end = event.target.selectionStart ?? 0;
    let start = end;
    while( start > 0 && (event.target.value.charAt(start) !== ' ')) start--; 
    const word = event.target.value.substring(start);
    getMatchingApps(word)
      .then( apps => )
      .catch( error => console.log(error));
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
