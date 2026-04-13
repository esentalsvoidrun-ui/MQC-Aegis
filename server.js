const http = require("http");
const { WebSocketServer } = require("ws");

const server = http.createServer((req, res) => {
  res.end("Mythos alive");
});

const wss = new WebSocketServer({ server });

server.listen(3000, () => {
  console.log("Mythos stable running on 3000");
});

wss.on("connection", (ws) => {
  console.log("CLIENT CONNECTED");

  const sendMetrics = () => {
    const message = {
      type: "metrics",
      timestamp: Date.now(),
      data: {
        users: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 1000),
        sessions: Math.floor(Math.random() * 6)
      }
    };

    ws.send(JSON.stringify(message));
  };

  sendMetrics();
  const interval = setInterval(sendMetrics, 1000);

  ws.on("close", () => clearInterval(interval));
});

wss.on("error", console.error);
