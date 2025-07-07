import ElementPlus from 'element-plus'
import { VividTyping } from 'vivid-typing'
import { createApp } from 'vue'
// import { gitFork } from '@simon_he/git-fork'
import App from './App.vue'
import '@unocss/reset/tailwind.css'
import './styles/main.css'
import 'uno.css'
import 'element-plus/dist/index.css'

const app = createApp(App)

app.use(ElementPlus)
// app.component('gitFork', gitFork)
app.component('VividTyping', VividTyping)
app.mount('#app')
