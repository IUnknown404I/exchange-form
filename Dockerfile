FROM node:20-alpine as dependencies
WORKDIR /opt/project

COPY *.json ./
EXPOSE 3000
COPY ./ ./

RUN npm install --force
RUN npm run build

CMD ["npm", "start"]