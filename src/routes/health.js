export function registerHealthRoute(app, config) {
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "SignalDesk",
      engineMode: config.engineMode
    });
  });
}
