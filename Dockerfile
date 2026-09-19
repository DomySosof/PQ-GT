FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src/ ./src/
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "src/server.js"]
