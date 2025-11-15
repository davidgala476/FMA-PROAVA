FROM golang:1.24-alpine
WORKDIR /app
RUN apk add --no-cache git gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd/main.go
EXPOSE 8080
CMD ["./main"]