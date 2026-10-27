#!/bin/sh
# Package the API: index.mjs, mcp.mjs and every catalog. Usage: deploy.sh <presigned PUT url for function.zip>
# (then UpdateFunctionCode from s3://44b-deploy-638175140432/nysgpt-api/function.zip).
set -e
cd "$(dirname "$0")"
Z=$(mktemp -d)/function.zip
zip -q -r "$Z" index.mjs mcp.mjs catalog -i 'index.mjs' 'mcp.mjs' 'catalog/*.json'
curl -sf -X PUT --upload-file "$Z" "$1" && echo "uploaded $(wc -c < "$Z") bytes"
