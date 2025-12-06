import express from "express"
import cors from "cors"
import { spawn } from "child_process"

const app = express()
app.use(cors())   //  ← ВАЖНО!

const PORT = 3001

app.get("/generate", (req, res) => {
  console.log("🔄 Генерация текстур через Python...")

const python = spawn("python", [
  "C:/Users/hitle/OneDrive/Рабочий стол/NOA-EXAMPLES-MASTER/vae/generate_runtime.py"
])

  let output = ""

  python.stdout.on("data", data => {
    output += data.toString()
  })

  python.stderr.on("data", data => {
    console.error("PYTHON ERROR:", data.toString())
  })

  python.on("close", () => {
    try {
      res.json(JSON.parse(output))
    } catch (err) {
      res.status(500).send("Ошибка JSON: " + err)
    }
  })
})

app.listen(PORT, () => console.log(`🚀 TEXTURE SERVER RUNNING ON PORT ${PORT}`))
