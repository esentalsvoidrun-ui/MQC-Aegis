let wssRef = null;

export function setWss(wss) {
  wssRef = wss;
}

export function getWss() {
  return wssRef;
}

export function broadcast(type, payload) {
  if (!wssRef) return;
  const msg = JSON.stringify({ type, payload });
  for (const client of wssRef.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}
