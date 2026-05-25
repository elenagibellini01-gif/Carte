FROM node:22

EXPOSE 5173

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

CMD ["npm", "run", "dev", "--", "--host"]