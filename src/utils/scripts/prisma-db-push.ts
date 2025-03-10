import { execSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'
import os from 'os'

// Define o ambiente, padrão para "development" se não for especificado
const ENV = process.env.NODE_ENV || 'development'

// Carrega o arquivo correto
const envFile = path.resolve(process.cwd(), `.env.${ENV}`)
dotenv.config({ path: envFile })

if (!process.env.DATABASE_URL) {
  console.error(`❌ DATABASE_URL não encontrado no arquivo ${envFile}`)
  process.exit(1)
}

console.info(`🚀 Rodando Prisma DB Push para o ambiente: ${ENV}...`)

const command =
  os.platform() === 'win32'
    ? `set DATABASE_URL="${process.env.DATABASE_URL}" && npx prisma db push`
    : `DATABASE_URL="${process.env.DATABASE_URL}" npx prisma db push`

execSync(command, { stdio: 'inherit' })
