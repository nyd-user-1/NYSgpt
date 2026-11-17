#!/bin/bash
# One Hugging Face sample dataset per line of list.tsv: 20,000 rows unloaded by Athena as Parquet, plus a card.
cd "$(dirname "$0")"; export AWS_REGION=us-east-1; BK=govblock-lake-638175140432; export HF_TOKEN=$(cat ~/.cache/huggingface/token)
while IFS=$'\t' read -r repo tbl page recs name pub desc; do
  [ -f "done-$repo" ] && continue
  pre="lake/v1/_samples/hf/$repo/"; aws s3 rm "s3://$BK/$pre" --recursive --only-show-errors
  q=$(aws athena start-query-execution --work-group query-api --query-string "UNLOAD (SELECT * FROM $tbl LIMIT 20000) TO 's3://$BK/$pre' WITH (format='PARQUET', compression='ZSTD')" --query QueryExecutionId --output text)
  for i in $(seq 1 90); do st=$(aws athena get-query-execution --query-execution-id "$q" --query 'QueryExecution.Status.State' --output text); case $st in SUCCEEDED|FAILED|CANCELLED) break;; esac; sleep 3; done
  if [ "$st" != SUCCEEDED ]; then echo "$repo FAILED $(aws athena get-query-execution --query-execution-id "$q" --query 'QueryExecution.Status.StateChangeReason' --output text | cut -c1-200)"; continue; fi
  rm -rf "w/$repo"; mkdir -p "w/$repo/data"; aws s3 cp "s3://$BK/$pre" "w/$repo/data/" --recursive --only-show-errors
  n=0; for f in w/$repo/data/*; do n=$((n+1)); mv "$f" "w/$repo/data/sample-$(printf %03d $n).parquet"; done
  lic="other"; [[ "$repo" == openalex* ]] && lic="cc0-1.0"; [[ "$repo" == ferc* ]] && lic="cc-by-4.0"
  recsf=$(printf "%'d" "$recs")
  cat > "w/$repo/README.md" <<CARD
---
license: $lic
language: [en]
pretty_name: "$name (sample)"
tags: [public-records, sql, mcp, government-data, tabular]
size_categories: [10K<n<100K]
configs:
- config_name: default
  data_files: "data/*.parquet"
---

# $name: 20,000-row sample

$desc

This is a 20,000-row sample of the table \`$tbl\`, exactly as it is stored in the NYSgpt Data Library. The dataset it comes from holds **$recsf records**. Publisher: $pub.

## Query the full table

The full table is online and can be queried with SQL, free, with no key and no sign-up (30 queries a day):

\`\`\`bash
curl -s https://data.nysgpt.com/query -H 'content-type: application/json' \\
  -d '{"sql":"SELECT * FROM $tbl LIMIT 10"}'
\`\`\`

From Claude or any MCP client, add the remote server \`https://data.nysgpt.com/mcp\` and ask your question in plain language.

- Every table and field in this dataset: $page
- All 133 datasets (52.8B records: federal spending, patents, company filings, scholarly works, labor, census, energy, health, courts): https://nysgpt.com/data
- Higher limits from \$29: https://nysgpt.com/data#pricing
- Example queries: https://github.com/nyd-user-1/nysgpt-data-library

## Notes

- Rows are the first 20,000 returned by the store, not a random draw. Do not use the sample for statistics about the whole.
- Columns are as published; many numeric columns are text. Use \`try_cast\` in SQL.
- The records are public records as issued by the publisher named above. Check the publisher's terms for your use.
CARD
  hf repo create "NYSgpt/$repo" --repo-type dataset >/dev/null 2>&1
  if hf upload "NYSgpt/$repo" "w/$repo" . --repo-type dataset --commit-message "20,000-row sample and card" >/dev/null 2>&1; then touch "done-$repo"; echo "$repo OK $(du -sh w/$repo/data | cut -f1)"; else echo "$repo UPLOAD-FAILED"; fi
done < list.tsv
echo ALL-DONE
