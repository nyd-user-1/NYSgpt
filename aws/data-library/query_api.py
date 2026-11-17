# NYSgpt lake query API (brief 23, api-worker-6). One Lambda function URL, read-only:
#   GET /databases, GET /tables?database=, GET /table?database=&table=, POST /query {"sql": ...} (at most 1,000 rows)
#   POST /mcp: MCP over HTTP (JSON-RPC 2.0) with tools list_databases, list_tables, describe_table, query.
# Key: header X-Api-Key (or ?key= on /mcp for clients that cannot send headers), compared with SSM /query-api/key.
# Allow-list: govblock_* databases (Old account) and nsr (New account, us-east-2, through the read-only role nysgpt-query-api-nsr). Statements: SELECT, WITH, SHOW, DESCRIBE only. Athena workgroup with a 10 GB cutoff.
import json, os, re, time, hmac, hashlib, base64, urllib.request, urllib.parse
import boto3
DDB = boto3.client('dynamodb'); KT = 'nysgpt-data-keys'; SITE = 'https://nysgpt.com/data'
# Public tiers (v2, 2026-11-16): no key = free (per address), buyer keys from Stripe checkout. The original key stays the owner key with every govblock_* database.
DENY_DB = {'govblock_legislative', 'govblock_polls', 'govblock_ads', 'govblock_derived', 'govblock_money', 'govblock_clean', 'govblock_text', 'govblock_insurance'}
DENY_TB = re.compile(r'(?i)govblock_fec"?\s*\.\s*"?(individual_contributions|presidential_map_p|presidential_map_csv)')
PLANS = {'free': dict(q=30, gb=5, wg='query-api-free'), 'day': dict(q=300, gb=100, wg='query-api'), 'month': dict(q=2000, gb=200, wg='query-api'), 'inst': dict(q=20000, gb=1000, wg='query-api')}
PRICES = {'day': ('price_1UcadnFZHX4S0kX26M9nSsQ1', 'payment'), 'month': ('price_1UcadnFZHX4S0kX23MaTK7H7', 'subscription'), 'inst': ('price_1UcadnFZHX4S0kX2o6Ohe6Al', 'subscription')}
FREE_GB_ALL = 150  # all free use together, per day
class Limit(Exception): pass
NEEDKEY = 'A key is required. Keys start at $29: ' + SITE + '#pricing . Add ?key=YOUR_KEY to the MCP address or send the header X-Api-Key.'
CTX = {'plan': 'admin', 'id': 'admin'}
_sk = [None]
def stripe(path, data=None):
    if _sk[0] is None: _sk[0] = SSM.get_parameter(Name='/query-api/stripe-key', WithDecryption=True)['Parameter']['Value']
    req = urllib.request.Request('https://api.stripe.com/v1/' + path, data=urllib.parse.urlencode(data).encode() if data else None)
    req.add_header('Authorization', 'Basic ' + base64.b64encode((_sk[0] + ':').encode()).decode())
    with urllib.request.urlopen(req, timeout=20) as r: return json.loads(r.read())
_ps = [None]
def psec():
    if _ps[0] is None: _ps[0] = SSM.get_parameter(Name='/query-api/proxy-secret', WithDecryption=True)['Parameter']['Value']
    return _ps[0]
def kh(k): return 'k#' + hashlib.sha256(k.encode()).hexdigest()
def lookup(k):
    it = DDB.get_item(TableName=KT, Key={'pk': {'S': kh(k)}}).get('Item')
    if not it: return None
    plan = it['plan']['S']; now = int(time.time())
    if 'exp' in it and int(it['exp']['N']) < now: raise Limit(f'This key has expired. Renew at {SITE}#pricing')
    if 'sub' in it and int(it.get('checked', {'N': '0'})['N']) < now - 21600:
        st = stripe('subscriptions/' + it['sub']['S']).get('status')
        DDB.update_item(TableName=KT, Key={'pk': {'S': kh(k)}}, UpdateExpression='SET checked=:c, substatus=:s', ExpressionAttributeValues={':c': {'N': str(now)}, ':s': {'S': st or 'unknown'}})
        it['substatus'] = {'S': st or 'unknown'}
    if 'sub' in it and it.get('substatus', {'S': 'active'})['S'] not in ('active', 'trialing', 'past_due'): raise Limit(f'This subscription is not active. Renew at {SITE}#pricing')
    return plan
def meter(nbytes=0, nq=0):
    if CTX['plan'] == 'admin': return
    p = PLANS[CTX['plan']]; day = time.strftime('%Y%m%d', time.gmtime()); ttl = {':t': {'N': str(int(time.time()) + 3 * 86400)}}
    def add(pk): return DDB.update_item(TableName=KT, Key={'pk': {'S': pk}}, UpdateExpression='ADD q :q, b :b SET #t = :t', ExpressionAttributeNames={'#t': 'ttl'}, ExpressionAttributeValues={':q': {'N': str(nq)}, ':b': {'N': str(nbytes)}, **ttl}, ReturnValues='ALL_NEW')['Attributes']
    a = add(f"u#{CTX['id']}#{day}")
    if CTX['plan'] == 'free':
        g = add(f'u#free-all#{day}')
        if int(g['b']['N']) > FREE_GB_ALL * 1e9: raise Limit(f'The free tier is used up for today (resets 00:00 UTC). A paid key starts at $29: {SITE}#pricing')
    if int(a['q']['N']) > p['q'] or int(a['b']['N']) > p['gb'] * 1e9:
        raise Limit((f"Free limit reached: {p['q']} queries or {p['gb']} GB scanned per day. Keep going with a paid key from $29: {SITE}#pricing") if CTX['plan'] == 'free' else f"Daily limit of the {CTX['plan']} plan reached ({p['q']} queries, {p['gb']} GB scanned); resets 00:00 UTC. Larger plans: {SITE}#pricing")
def pub_ok(db): return CTX['plan'] == 'admin' or db not in DENY_DB
GL = boto3.client('glue'); ATH = boto3.client('athena'); SSM = boto3.client('ssm')
WG = os.environ.get('WORKGROUP', 'query-api'); KEY = None
NSR = os.environ.get('NSR') == '1'  # off: the New account's organization blocks access from outside it
ALLOW = re.compile(r'^(govblock_[a-z0-9_]+|nsr)$' if NSR else r'^govblock_[a-z0-9_]+$')
NEW_ROLE = 'arn:aws:iam::613473203863:role/nysgpt-query-api-nsr'; _new = [0, None, None]
def new():  # Glue and Athena in the New account (us-east-2) through its read-only role, for the nsr database
    if _new[0] < time.time():
        c = boto3.client('sts').assume_role(RoleArn=NEW_ROLE, RoleSessionName='query-api')['Credentials']
        kw = dict(region_name='us-east-2', aws_access_key_id=c['AccessKeyId'], aws_secret_access_key=c['SecretAccessKey'], aws_session_token=c['SessionToken'])
        _new[:] = [c['Expiration'].timestamp() - 300, boto3.client('glue', **kw), boto3.client('athena', **kw)]
    return _new
def glue_for(db): return new()[1] if db == 'nsr' else GL
def key():
    global KEY
    if KEY is None: KEY = SSM.get_parameter(Name='/query-api/key', WithDecryption=True)['Parameter']['Value']
    return KEY
def dbs():
    out, tok = [], None
    while True:
        r = GL.get_databases(**({'NextToken': tok} if tok else {}))
        out += [{'name': d['Name'], 'description': d.get('Description', '') if CTX['plan'] == 'admin' else d['Name'][9:].replace('_', ' ')} for d in r['DatabaseList'] if ALLOW.match(d['Name']) and pub_ok(d['Name'])]
        tok = r.get('NextToken')
        if not tok:
            if not NSR: return out
            d = new()[1].get_database(Name='nsr')['Database']; return out + [{'name': 'nsr', 'description': (d.get('Description') or 'NSR') + ' (New account, us-east-2)'}]
def tables(db):
    if not ALLOW.match(db or '') or not pub_ok(db): raise ValueError('database not allowed')
    out, tok = [], None
    while True:
        r = glue_for(db).get_tables(DatabaseName=db, **({'NextToken': tok} if tok else {}))
        out += [{'name': t['Name'], 'rows': t.get('Parameters', {}).get('rows_at_load'), 'type': t.get('TableType')} for t in r['TableList']]
        tok = r.get('NextToken')
        if not tok: return out
def table(db, t):
    if not ALLOW.match(db or '') or not pub_ok(db) or (CTX['plan'] != 'admin' and DENY_TB.search(f'{db}.{t}')): raise ValueError('table not allowed')
    x = glue_for(db).get_table(DatabaseName=db, Name=t)['Table']; p = x.get('Parameters', {})
    return {'database': db, 'table': t, 'description': re.sub(r'(?i)\bbrief \d+[^.;:]*[.;:]?\s*|s3://\S+', '', x.get('Description') or p.get('comment') or p.get('source', '')).strip(), 'rows': p.get('rows_at_load'),
            'fields': [{'name': c['Name'], 'type': c['Type'], 'description': c.get('Comment', '')} for c in x['StorageDescriptor']['Columns'] + x.get('PartitionKeys', [])],
            **({'location': x['StorageDescriptor'].get('Location')} if CTX['plan'] == 'admin' else {})}
def check(sql):
    s = re.sub(r'--[^\n]*|/\*.*?\*/', ' ', sql or '', flags=re.S).strip().rstrip(';').strip()
    if not s or ';' in s: raise ValueError('one statement only')
    if not re.match(r'(?is)^(select|with|show|describe)\b', s): raise ValueError('only SELECT, WITH, SHOW and DESCRIBE are allowed')
    if re.search(r'(?is)\b(insert|update|delete|merge|create|drop|alter|unload|grant|revoke|msck|vacuum|optimize|call)\b', s): raise ValueError('read-only statements only')
    # the database of every FROM / JOIN / DESCRIBE target and every SHOW ... IN db must be on the allow-list (IAM enforces it too)
    refs = re.findall(r'(?i)\b(?:from|join|describe)\s+"?([a-z0-9_]+)"?\s*\.', s) + re.findall(r'(?i)^show\b.*?\b(?:in|from)\s+"?([a-z0-9_]+)"?', s)
    for db in set(x.lower() for x in refs):
        if not ALLOW.match(db) or not pub_ok(db): raise ValueError(f'database not allowed: {db}')
    if CTX['plan'] != 'admin' and DENY_TB.search(s): raise ValueError('table not allowed')
    dbset = set(x.lower() for x in refs)
    if 'nsr' in dbset and len(dbset) > 1: raise ValueError('nsr lives in the New account and cannot be joined with govblock_* in one query')
    return s, dbset
def query(sql):
    s, dbset = check(sql); meter(nq=1); A = new()[2] if dbset == {'nsr'} else ATH; q = A.start_query_execution(QueryString=s, WorkGroup=WG if CTX['plan'] == 'admin' else PLANS[CTX['plan']]['wg'])['QueryExecutionId']
    for _ in range(280):
        st = A.get_query_execution(QueryExecutionId=q)['QueryExecution']
        state = st['Status']['State']
        if state in ('SUCCEEDED', 'FAILED', 'CANCELLED'): break
        time.sleep(0.5)
    meter(nbytes=int(st.get('Statistics', {}).get('DataScannedInBytes') or 0))
    if state != 'SUCCEEDED': raise ValueError(f"query {state}: {st['Status'].get('StateChangeReason', '')[:300]}")
    rows, cols, tok = [], None, None
    while len(rows) < 1001:
        r = A.get_query_results(QueryExecutionId=q, MaxResults=1000, **({'NextToken': tok} if tok else {}))
        if cols is None: cols = [c['Name'] for c in r['ResultSet']['ResultSetMetadata']['ColumnInfo']]
        rows += [[d.get('VarCharValue') for d in x['Data']] for x in r['ResultSet']['Rows']]
        tok = r.get('NextToken')
        if not tok: break
    if rows and rows[0] == cols: rows = rows[1:]
    return {'columns': cols, 'rows': rows[:1000], 'truncated': len(rows) > 1000, 'bytes_scanned': st['Statistics'].get('DataScannedInBytes'), 'query_id': q}
TOOLS = [
 {'name': 'list_databases', 'title': 'List databases', 'description': 'List the databases in the NYSgpt Data Library. Each database is one subject of public records (for example govblock_awards = federal spending, govblock_patents, govblock_sec = company filings, govblock_scholarly = OpenAlex, govblock_labor, govblock_census, govblock_energy, govblock_health, govblock_courts). Call this first, then list_tables.', 'inputSchema': {'type': 'object', 'properties': {}, 'additionalProperties': False}, 'annotations': {'readOnlyHint': True, 'openWorldHint': False}},
 {'name': 'list_tables', 'title': 'List tables', 'description': 'List every table in one database with its row count. Use it to find the table that answers a question before calling describe_table.', 'inputSchema': {'type': 'object', 'properties': {'database': {'type': 'string', 'description': 'A database name from list_databases, for example govblock_awards.'}}, 'required': ['database'], 'additionalProperties': False}, 'annotations': {'readOnlyHint': True, 'openWorldHint': False}},
 {'name': 'describe_table', 'title': 'Describe a table', 'description': 'Return the fields (name, type, description), the table description and the row count of one table. Always call this before writing SQL: many source columns are stored as text and need try_cast.', 'inputSchema': {'type': 'object', 'properties': {'database': {'type': 'string', 'description': 'Database name, for example govblock_scholarly.'}, 'table': {'type': 'string', 'description': 'Table name from list_tables, for example openalex_works.'}}, 'required': ['database', 'table'], 'additionalProperties': False}, 'annotations': {'readOnlyHint': True, 'openWorldHint': False}},
 {'name': 'query', 'title': 'Run SQL', 'description': 'Run one read-only SQL statement (SELECT, WITH, SHOW or DESCRIBE) in the Amazon Athena (Trino) dialect and return up to 1,000 rows with column names and bytes scanned. Qualify every table as database.table. Select only the columns you need and filter on year or state columns where they exist, because each query has a scan limit (1 GB without a key, 10 GB with a paid key). Numeric text columns need try_cast(col AS double). When a daily limit is reached the error message gives the address for a paid key.', 'inputSchema': {'type': 'object', 'properties': {'sql': {'type': 'string', 'description': 'One SQL statement, for example: SELECT publication_year, count(*) FROM govblock_scholarly.openalex_works GROUP BY 1 ORDER BY 1'}}, 'required': ['sql'], 'additionalProperties': False}, 'annotations': {'readOnlyHint': True, 'openWorldHint': False}}]
def mcp(msg):
    m, i, p = msg.get('method'), msg.get('id'), msg.get('params') or {}
    if i is None: return None  # notification
    def ok(r): return {'jsonrpc': '2.0', 'id': i, 'result': r}
    if m == 'initialize': return ok({'protocolVersion': p.get('protocolVersion', '2025-03-26'), 'capabilities': {'tools': {}}, 'serverInfo': {'name': 'nysgpt-data-library', 'version': '2.0'}, 'instructions': 'NYSgpt Data Library: 69 billion public records (federal spending, patents, company filings, scholarly works, labor, census, energy, health, courts and more) as Athena SQL tables. Start with list_databases, then list_tables and describe_table, then query. Free without a key up to a daily limit; paid keys at https://nysgpt.com/data'})
    if m == 'ping': return ok({})
    if m == 'tools/list': return ok({'tools': TOOLS})
    if m == 'tools/call':
        n, a = p.get('name'), p.get('arguments') or {}
        if CTX['plan'] == 'anon': return ok({'content': [{'type': 'text', 'text': 'Error: ' + NEEDKEY}], 'isError': True})
        try:
            r = dbs() if n == 'list_databases' else tables(a.get('database')) if n == 'list_tables' else table(a.get('database'), a.get('table')) if n == 'describe_table' else query(a.get('sql')) if n == 'query' else None
            if r is None: raise ValueError(f'unknown tool {n}')
            return ok({'content': [{'type': 'text', 'text': json.dumps(r, default=str)}]})
        except Exception as e: return ok({'content': [{'type': 'text', 'text': f'Error: {e}'}], 'isError': True})  # Limit messages carry the upgrade address
    return {'jsonrpc': '2.0', 'id': i, 'error': {'code': -32601, 'message': f'method not found: {m}'}}
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-api-key', 'access-control-allow-methods': 'GET,POST,OPTIONS'}
def resp(code, body, ctype='application/json', extra=None): return {'statusCode': code, 'headers': {'content-type': ctype, **CORS, **(extra or {})}, 'body': body if isinstance(body, str) else json.dumps(body, default=str)}
def page(title, inner): return resp(200, f"""<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>{title}</title><style>body{{font:16px/1.55 -apple-system,Helvetica,Arial,sans-serif;max-width:680px;margin:56px auto;padding:0 20px;color:#1a1a1a}}h1{{font:600 28px Georgia,serif}}code,pre{{background:#f3f1ea;border-radius:6px;padding:2px 6px;font:13px ui-monospace,Menlo,monospace}}pre{{padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-all}}a{{color:#16357f}}</style><h1>{title}</h1>{inner}""", 'text/html; charset=utf-8')
def checkout(plan, base):
    if plan not in PRICES: raise ValueError('plan must be day, month or inst')
    price, mode = PRICES[plan]
    d = {'mode': mode, 'line_items[0][price]': price, 'line_items[0][quantity]': '1', 'success_url': base + '/claim?session_id={CHECKOUT_SESSION_ID}', 'cancel_url': SITE + '#pricing', 'metadata[plan]': plan, 'allow_promotion_codes': 'true'}
    if mode == 'payment': d['customer_creation'] = 'always'
    return resp(303, '', extra={'location': stripe('checkout/sessions', d)['url']})
def claim(sid, base):
    if not re.match(r'^cs_[A-Za-z0-9_]+$', sid or ''): raise ValueError('missing session_id')
    se = stripe('checkout/sessions/' + sid)
    if se.get('status') != 'complete' or se.get('payment_status') not in ('paid', 'no_payment_required'): return page('Payment not completed', f'<p>This checkout is not paid yet. <a href="{SITE}#pricing">Return to plans</a>.</p>')
    plan = (se.get('metadata') or {}).get('plan', 'day'); k = 'nys_' + hmac.new(key().encode(), sid.encode(), hashlib.sha256).hexdigest()[:40]
    it = {'pk': {'S': kh(k)}, 'plan': {'S': plan}, 'session': {'S': sid}, 'created': {'N': str(int(time.time()))}, 'customer': {'S': str(se.get('customer') or '')}}
    if plan == 'day': it['exp'] = {'N': str(int(se.get('created', time.time())) + 86400 + 3600)}
    if se.get('subscription'): it['sub'] = {'S': se['subscription']}; it['substatus'] = {'S': 'active'}; it['checked'] = {'N': str(int(time.time()))}
    try: DDB.put_item(TableName=KT, Item=it, ConditionExpression='attribute_not_exists(pk)')
    except DDB.exceptions.ConditionalCheckFailedException: pass
    p = PLANS[plan]
    return page('Your NYSgpt Data Library key', f"""<p>Plan: <b>{plan}</b> ({p['q']:,} queries and {p['gb']:,} GB scanned per day{', valid 24 hours' if plan == 'day' else ''}). Save this page; the key is shown here whenever you reopen this address.</p>
<pre>{k}</pre>
<p><b>Claude (claude.ai or desktop):</b> Settings, Connectors, Add custom connector, with this address:</p><pre>{base}/mcp?key={k}</pre>
<p><b>Claude Code:</b></p><pre>claude mcp add --transport http nysgpt-data {base}/mcp --header "X-Api-Key: {k}"</pre>
<p><b>HTTP:</b></p><pre>curl -s {base}/query -H "X-Api-Key: {k}" -H "content-type: application/json" -d '{{"sql":"SELECT count(*) FROM govblock_awards.contracts"}}'</pre>
<p>Tables and fields: <a href="{SITE}">{SITE}</a>. Questions: reply to your Stripe receipt.</p>""")
def handler(event, context):
    path = event.get('rawPath', '/'); http = event.get('requestContext', {}).get('http', {}); method = http.get('method', 'GET'); q = event.get('queryStringParameters') or {}
    h = {k.lower(): v for k, v in (event.get('headers') or {}).items()}; given = h.get('x-api-key') or q.get('key'); base = 'https://' + event.get('requestContext', {}).get('domainName', '')
    prox = bool(h.get('x-proxy-secret')) and hmac.compare_digest(h['x-proxy-secret'], psec()); ip = (h.get('x-client-ip') if prox else None) or http.get('sourceIp', 'unknown')
    if prox and h.get('x-public-host'): base = 'https://' + h['x-public-host']
    if method == 'OPTIONS': return resp(204, '')
    body = event.get('body') or ''
    if event.get('isBase64Encoded') and body: body = base64.b64decode(body).decode()
    try:
        if path == '/checkout':
            if method != 'POST': return page('Continue to payment', f'<p>Plan: <b>{q.get("plan") if q.get("plan") in PRICES else ""}</b>. Payment is by card through Stripe.</p><form method="post" action="/checkout?plan={q.get("plan") if q.get("plan") in PRICES else "day"}"><button style="font:500 14px sans-serif;padding:12px 22px;border-radius:999px;border:0;background:#033882;color:#fff;cursor:pointer">Continue to Stripe</button></form>')
            return checkout(q.get('plan'), base)
        if path == '/claim': return claim(q.get('session_id'), base)
        if path == '/': return resp(302, '', extra={'location': SITE})
        if given and hmac.compare_digest(given, key()): CTX.update(plan='admin', id='admin')
        elif given:
            plan = lookup(given)
            if not plan: return resp(401, {'error': f'unknown key. Free use needs no key; paid keys: {SITE}#pricing'})
            CTX.update(plan=plan, id=kh(given)[:26])
        else: CTX.update(plan='anon', id='ip-' + str(ip))  # 2026-11-17: no use without a key (crawlers were running queries)
        if CTX['plan'] == 'anon' and not path.startswith('/mcp'): return resp(401, {'error': NEEDKEY, 'plans': SITE + '#pricing'})
        if path.startswith('/mcp'):
            if method == 'GET': return resp(405, {'error': 'use POST'})
            msg = json.loads(body or '{}')
            out = [x for x in (mcp(m) for m in msg) if x] if isinstance(msg, list) else mcp(msg)
            return resp(202, '') if out is None or out == [] else resp(200, out)
        if path == '/databases': return resp(200, dbs())
        if path == '/tables': return resp(200, tables(q.get('database')))
        if path == '/table': return resp(200, table(q.get('database'), q.get('table')))
        if path == '/query' and method == 'POST': return resp(200, query(json.loads(body or '{}').get('sql')))
        return resp(404, {'error': 'not found', 'paths': ['/databases', '/tables?database=', '/table?database=&table=', 'POST /query', 'POST /mcp'], 'docs': SITE})
    except Limit as e: return resp(429, {'error': str(e), 'upgrade': SITE + '#pricing'})
    except ValueError as e: return resp(400, {'error': str(e)})
    except (GL.exceptions.EntityNotFoundException,): return resp(404, {'error': 'not found'})
    except Exception as e: return resp(500, {'error': str(e)[:300]})
