FROM node:18-alpine
WORKDIR /app
# permitir pasar los endpoints en tiempo de build
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY package.json package-lock.json ./
#dependencias
RUN npm ci
COPY . .
#compilar (next build necesita `NEXT_PUBLIC_*` disponible en el entorno de build)
RUN npm run build
#puerto
EXPOSE 3000
#inicio
CMD ["npm", "start"]