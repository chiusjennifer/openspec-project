FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm install
COPY . .
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["npm", "run", "dev"]
