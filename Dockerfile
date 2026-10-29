FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# install psql client for migrate
RUN apk add --no-cache postgresql-client
EXPOSE 3000 8080 8081
CMD ["sh", "-c", "npm run migrate && npm run dev"]
