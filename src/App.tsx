import { useState, KeyboardEvent, ChangeEvent } from 'react';
import './App.css';

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
