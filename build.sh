#!/bin/sh
# Joins the source files into site/app.js
set -e
cd "$(dirname "$0")"
cat src/1-core.js src/2-icons.js src/3-today.js src/4-trends.js src/5-meds.js src/6-tests.js src/7-history.js src/8-doctor.js src/9-toilet.js src/10-sync.js src/11-main.js > site/app.js
node --check site/app.js
echo "built site/app.js"
