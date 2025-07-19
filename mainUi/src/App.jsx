import { useState } from 'react'

import './App.css'

function App() {
  // const [count, setCount] = useState(0)

  return (

    <div>

    <h2 style={{ 
      margin: 0, 
      color: '#212529',
      fontSize: 20,
      fontWeight: 600
    }}>
      Autofill Forms
    </h2>
    <p style={{ 
      margin: '8px 0 0 0', 
      color: '#6c757d', 
      fontSize: 14 
    }}>
      Works with Google Forms & all websites
    </p> 

    <form> 
        name - <input type="text" name="name"> </input>
        city - <input type="text" name="name"> </input>
    </form>

    </div>
  )
}

export default App
