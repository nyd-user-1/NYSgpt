// AWS Marketplace agreement and license events for the NYSgpt data API
// listings (EventBridge rule nysgpt-marketplace-events, source
// aws.agreement-marketplace). A buyer's key is the API Gateway key tagged with
// their license (lib/marketplace.ts claim): a changed license moves it to the
// usage plan of the tier now entitled; an ended license or agreement switches
// it off and takes it off its plan. Dependency-free: the SDK ships in the
// Lambda runtime.

import {
  APIGatewayClient,
  CreateUsagePlanKeyCommand,
  DeleteUsagePlanKeyCommand,
  GetApiKeysCommand,
  GetUsagePlanKeyCommand,
  TagResourceCommand,
  UpdateApiKeyCommand,
} from "@aws-sdk/client-api-gateway"
import { GetEntitlementsCommand, MarketplaceEntitlementServiceClient } from "@aws-sdk/client-marketplace-entitlement-service"

const gateway = new APIGatewayClient({})
const entitlements = new MarketplaceEntitlementServiceClient({ region: "us-east-1" })

// The usage plan of each calls tier; must match CALLS in lib/api-pricing.ts.
const PLANS = { "10k": "urgiho", "100k": "ty621f", "1m": "ko2idd", unlimited: "pmsbfu" }
const tierPlan = (dimension) => PLANS[/^[a-z]+_(10k|100k|1m|unlimited)_(internal|commercial)$/.exec(dimension ?? "")?.[1]]

async function marketplaceKeys() {
  const out = []
  let position
  do {
    const r = await gateway.send(new GetApiKeysCommand({ nameQuery: "mp-", limit: 500, position }))
    out.push(...(r.items ?? []))
    position = r.position
  } while (position)
  return out
}

const setEnabled = (key, on) =>
  gateway.send(new UpdateApiKeyCommand({ apiKey: key.id, patchOperations: [{ op: "replace", path: "/enabled", value: String(on) }] }))

const planOf = async (keyId) => {
  const all = Object.values(PLANS).concat("bsayrn")
  return (await Promise.all(all.map((p) => gateway.send(new GetUsagePlanKeyCommand({ usagePlanId: p, keyId })).then(() => p, () => null)))).find(Boolean)
}

async function placeOn(keyId, plan) {
  const now = await planOf(keyId)
  if (now === plan) return
  if (now) await gateway.send(new DeleteUsagePlanKeyCommand({ usagePlanId: now, keyId }))
  await gateway.send(new CreateUsagePlanKeyCommand({ usagePlanId: plan, keyId, keyType: "API_KEY" }))
}

// An ended subscription's key is switched off and taken off its usage plan, so
// nothing that copies the plan from the old key (a rotation) can revive it. A
// new claim on a live license puts it back (lib/marketplace.ts claim).
async function retire(key) {
  await setEnabled(key, false)
  const plan = await planOf(key.id)
  if (plan) await gateway.send(new DeleteUsagePlanKeyCommand({ usagePlanId: plan, keyId: key.id }))
}

export const handler = async (event) => {
  const type = event["detail-type"] ?? ""
  const d = event.detail ?? {}
  const license = d.license?.arn
  const agreement = d.agreement?.id
  const keys = await marketplaceKeys()
  const mine = keys.filter((k) => (license && k.tags?.mpLicense === license) || (agreement && k.tags?.mpAgreement === agreement))
  console.log(JSON.stringify({ type, license, agreement, keys: mine.map((k) => k.id) }))
  if (!mine.length) return

  if (type.startsWith("License Deprovisioned") || type.startsWith("Purchase Agreement Ended")) {
    await Promise.all(mine.map(retire))
    return
  }

  if (type.startsWith("License Updated") && license && d.product?.code) {
    const r = await entitlements.send(new GetEntitlementsCommand({ ProductCode: d.product.code, Filter: { LICENSE_ARN: [license] } }))
    const dimension = (r.Entitlements ?? []).map((e) => e.Dimension).find((x) => tierPlan(x))
    for (const k of mine) {
      if (!dimension) {
        await retire(k)
        continue
      }
      await placeOn(k.id, tierPlan(dimension))
      await setEnabled(k, true)
      await gateway.send(new TagResourceCommand({ resourceArn: `arn:aws:apigateway:us-east-1::/apikeys/${k.id}`, tags: { mpDimension: dimension } }))
    }
  }
}
