import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nexusAIService } from './ai/aiServicePlugin.mjs'
import { classroomRelay } from './classroom/relayPlugin.mjs'

export default defineConfig({
  // One server for all of NEXUS: StudentOS, ClassroomOS, the classroom relay
  // and the NEXUS AI service.
  plugins: [react(), nexusAIService(), classroomRelay()],
  server: { port: 5173, strictPort: true },
})
