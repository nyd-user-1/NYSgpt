#!/bin/sh
# AWS Marketplace wiring for the data API listings (2026-10-24). Safe to re-run.
#   1. the registration cookie's signing secret, in SSM
#   2. the site's server role (Amplify compute) may resolve buyers, read
#      entitlements, find agreements, deliver keys and manage API keys
#   3. the EventBridge handler (index.mjs): its role, the function, the rule
set -e
cd "$(dirname "$0")"
export AWS_PAGER="" AWS_REGION=us-east-1
ACCOUNT=638175140432
FN=nysgpt-marketplace-events
APIGW='"arn:aws:apigateway:us-east-1::/apikeys","arn:aws:apigateway:us-east-1::/apikeys/*","arn:aws:apigateway:us-east-1::/usageplans/*","arn:aws:apigateway:us-east-1::/tags/*"'

aws ssm get-parameter --name /nysgpt/marketplace/cookie-secret >/dev/null 2>&1 ||
  aws ssm put-parameter --name /nysgpt/marketplace/cookie-secret --type SecureString --value "$(openssl rand -hex 32)" >/dev/null

aws iam put-role-policy --role-name nysgpt-amplify-compute --policy-name aws-marketplace --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    { \"Effect\": \"Allow\", \"Action\": [\"aws-marketplace:ResolveCustomer\", \"aws-marketplace:GetEntitlements\", \"aws-marketplace:SearchAgreements\", \"aws-marketplace:PutDeploymentParameter\"], \"Resource\": \"*\" },
    { \"Effect\": \"Allow\", \"Action\": [\"apigateway:GET\", \"apigateway:POST\", \"apigateway:PATCH\", \"apigateway:PUT\", \"apigateway:DELETE\"], \"Resource\": [$APIGW] },
    { \"Effect\": \"Allow\", \"Action\": \"ssm:GetParameter\", \"Resource\": \"arn:aws:ssm:us-east-1:$ACCOUNT:parameter/nysgpt/marketplace/*\" }
  ]
}"

aws iam get-role --role-name $FN >/dev/null 2>&1 || {
  aws iam create-role --role-name $FN --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name $FN --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
}
aws iam put-role-policy --role-name $FN --policy-name keys --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    { \"Effect\": \"Allow\", \"Action\": \"aws-marketplace:GetEntitlements\", \"Resource\": \"*\" },
    { \"Effect\": \"Allow\", \"Action\": [\"apigateway:GET\", \"apigateway:POST\", \"apigateway:PATCH\", \"apigateway:PUT\", \"apigateway:DELETE\"], \"Resource\": [$APIGW] }
  ]
}"

Z=$(mktemp -d)/function.zip
zip -q -j "$Z" index.mjs
if aws lambda get-function --function-name $FN >/dev/null 2>&1; then
  aws lambda update-function-code --function-name $FN --zip-file "fileb://$Z" >/dev/null
else
  # A new role takes a few seconds to be assumable.
  for i in 1 2 3 4 5 6 7 8 9 10; do
    aws lambda create-function --function-name $FN --runtime nodejs22.x --handler index.handler --timeout 60 \
      --role arn:aws:iam::$ACCOUNT:role/$FN --zip-file "fileb://$Z" >/dev/null 2>&1 && break
    sleep 5
  done
fi

aws events put-rule --name $FN --event-pattern '{
  "source": ["aws.agreement-marketplace"],
  "detail-type": ["License Updated - Manufacturer", "License Deprovisioned - Manufacturer", "Purchase Agreement Ended - Manufacturer", "Purchase Agreement Ended - Proposer"]
}' >/dev/null
aws lambda add-permission --function-name $FN --statement-id eventbridge --action lambda:InvokeFunction \
  --principal events.amazonaws.com --source-arn arn:aws:events:us-east-1:$ACCOUNT:rule/$FN >/dev/null 2>&1 || true
aws events put-targets --rule $FN --targets "Id=handler,Arn=arn:aws:lambda:us-east-1:$ACCOUNT:function:$FN" >/dev/null
echo "marketplace wiring in place"
