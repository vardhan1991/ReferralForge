FROM node:24-alpine

WORKDIR /app
COPY . .
ENV NODE_ENV=production
EXPOSE 4173
CMD ["node", "--experimental-strip-types", "src/server.ts"]
