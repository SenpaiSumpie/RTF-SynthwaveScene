import { useState } from 'react'

import './App.css'

import SynthwaveCanvas from './Synthwave'
import gif from '/src/assets/max_mosier_hero_title.gif';

function App() {

  return (
    <div style={{width: '100vw', height: '100vh'}}>
      <img src={gif} alt="loading..." style={{position: 'absolute', zIndex: '100', width: '100%', height: '100%'}}/>
      <SynthwaveCanvas/>
    </div>
  )
}

export default App
