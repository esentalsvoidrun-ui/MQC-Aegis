#!/usr/bin/env bash

echo "Sending login spike..."
for i in {1..6}; do
  curl -s -X POST http://localhost:3000/event \
    -H "Content-Type: application/json" \
    -d '{"type":"login","user":"combo-user","attempts":5,"ip":"unknown","risk":20,"velocitySpike":true}' > /dev/null
done

echo "Sending high-risk payment..."
curl -s -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","user":"combo-user","amount":12000,"ip":"unknown","risk":35,"geoMismatch":true}' > /dev/null

echo "Done."
