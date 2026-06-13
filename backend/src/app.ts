import express from 'express'
import cors from 'cors'
import path from 'path'
import router from './routes/index'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use('/api', router)

export default app
