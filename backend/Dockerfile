FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]