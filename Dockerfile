FROM node:20-alpine

RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ARG APP_PORT
EXPOSE ${APP_PORT}

ENV PORT=${APP_PORT}
ENV HOSTNAME="0.0.0.0"
CMD ["./start.sh"]
