#!/usr/bin/env python3
"""
Enhanced Flask app with Redis persistence, templates, and callback support.

Features:
- Redis persistence for task state (fall back to in-memory if Redis not available)
- Templates in templates/index.html and templates/status.html
- /api/submit supports callback registration if ENABLE_CALLBACKS env enabled
- /api/callback receives Judge0 callbacks and stores results
- Background poller remains as fallback when callbacks are not used

Usage:
  JUDGE0_URL=http://localhost:2358 APP_PUBLIC_URL=http://localhost:5000 python3 judge0_flask/app.py

Notes:
- Production: run behind a WSGI server and use a real Redis instance.
"""
import logging
from flask import Flask, request, jsonify, render_template, redirect, url_for
import requests
import base64
import os
import time
import json
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

try:
    import redis
except Exception:
    redis = None

app = Flask(__name__, template_folder="templates")

# Detailed HTTP debug helper and request logger to aid Docker log
# troubleshooting
logging.getLogger('werkzeug').setLevel(logging.INFO)
app.logger.setLevel(logging.INFO)


@app.before_request
def log_incoming_request():
    try:
        body = request.get_data(as_text=True)
        # Truncate long bodies to avoid huge logs
        max_len = 2000
        truncated = body if len(body) <= max_len else (
            body[:max_len] + '... [truncated]')
        headers = {k: v for k, v in request.headers.items()}
        app.logger.info("INCOMING %s %s from=%s headers=%s body=%s",
                        request.method, request.path, request.remote_addr,
                        headers, truncated)
    except Exception as e:
        app.logger.exception("Failed to log incoming request: %s", e)


def http_request(method, url, **kwargs):
    """Wrapper around requests to log outbound HTTP requests and responses."""
    try:
        hdrs = kwargs.get('headers')
        params = kwargs.get('params')
        body = kwargs.get('json') if 'json' in kwargs else kwargs.get('data')
        max_body = 2000
        body_preview = (
            str(body)[
                :max_body] +
            '...') if body and len(
            str(body)) > max_body else str(body)
        app.logger.info(
            "OUTBOUND %s %s headers=%s params=%s body=%s",
            method.upper(),
            url,
            hdrs,
            params,
            body_preview)
        resp = requests.request(method, url, **kwargs)
        # log status and first part of body
        resp_text = resp.text or ''
        resp_preview = resp_text if len(resp_text) <= 2000 else (
            resp_text[:2000] + '... [truncated]')
        app.logger.info(
            "RESPONSE %s %s -> %s body=%s",
            method.upper(),
            url,
            resp.status_code,
            resp_preview)
        return resp
    except Exception:
        app.logger.exception("HTTP request failed: %s %s", method, url)
        raise

# Custom exception to propagate Judge0 HTTP errors (status + parsed body)
class Judge0HTTPError(Exception):
    def __init__(self, status: int, body):
        self.status = int(status) if status is not None else 500
        self.body = body or {"error": "unknown"}
        super().__init__(str(self.body))


# Configuration / magic defaults:
# - JUDGE0_URL: endpoint for Judge0 core. Override via environment for non-default deployments.
# - APP_PUBLIC_URL: used to construct callback URLs when app is accessed via localhost.
# - MAX_WORKERS: threadpool size for background pollers (default 8). Tune for concurrency limits.
# - ENABLE_CALLBACKS: whether to request Judge0 to callback to /api/callback (true by default).
# - REDIS_URL: Redis connection string used for persistence; when absent, in-memory storage is used.
JUDGE0_URL = os.environ.get("JUDGE0_URL", "http://localhost:2358")
APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "http://localhost:5000")
MAX_WORKERS = int(os.environ.get("JUDGE0_WORKERS", "8"))
ENABLE_CALLBACKS = os.environ.get(
    "ENABLE_CALLBACKS", "true").lower() in (
        "1", "true", "yes")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

# Storage abstraction
redis_client = None
storage_lock = Lock()
in_memory_tasks = {}

if redis and REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        # smoke test
        redis_client.ping()
    except Exception:
        redis_client = None


def _now():
    return time.time()


def _base64_encode(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


def _maybe_base64_decode(s: str) -> str:
    """Attempt to base64-decode a string; return original on failure.

    Strips surrounding whitespace/newlines before attempting decode to handle
    Judge0 responses that include trailing newlines.
    """
    if s is None:
        return ""
    # Ensure we have a string
    s = s if isinstance(s, str) else str(s)
    s_stripped = s.strip()
    try:
        # validate=True raises if not valid base64
        b = base64.b64decode(s_stripped, validate=True)
        return b.decode()
    except Exception:
        # fallback to original string (preserve original whitespace)
        return s


def _store_task(token: str, meta: dict):
    meta_json = json.dumps(meta)
    if redis_client:
        redis_client.set(f"task:{token}", meta_json)
    else:
        with storage_lock:
            in_memory_tasks[token] = meta


def _get_task(token: str):
    if redis_client:
        v = redis_client.get(f"task:{token}")
        return json.loads(v) if v else None
    else:
        with storage_lock:
            return in_memory_tasks.get(token)


def _update_task(token: str, **fields):
    cur = _get_task(token) or {}
    cur.update(fields)
    cur["updated"] = _now()
    _store_task(token, cur)


def submit_to_judge0(
        payload: dict,
        query_params: dict = None,
        base64_request: bool = False,
        callback_url: str = None) -> str:
    """
    Submit to Judge0.

    - payload: dict of fields to send in JSON body (use snake_case keys).
    - query_params: dict of query parameters to append to the /submissions request.
      (e.g. {'base64_encoded': 'true', 'fields': 'stdout,stderr', 'X-Auth-Token': '...'})
    - base64_request: if True, caller has already base64-encoded relevant fields.
    - callback_url: optional explicit callback_url to include in payload (when callbacks enabled).

    We send JSON payload and params via requests (requests will handle encoding).
    Stored task meta will include `query_params` so subsequent polling/GETs use the same params.
    """
    # attach callback_url when callbacks are enabled and a callback was
    # found/passed
    if ENABLE_CALLBACKS:
        cb = callback_url or f"{APP_PUBLIC_URL}/api/callback"
        if cb:
            payload["callback_url"] = cb

    url = f"{JUDGE0_URL}/submissions"
    r = http_request(
        'post',
        url,
        json=payload,
        params=query_params or {},
        timeout=15)
    r.raise_for_status()
    data = r.json()
    token = data.get("token")
    if not token:
        raise RuntimeError("Judge0 did not return a token")
    # persist meta including query params so pollers / status lookups can
    # reuse them
    meta = {
        "done": False,
        "result": None,
        "error": None,
        "updated": _now(),
        "query_params": query_params or {}}
    _store_task(token, meta)
    return token


def poll_result(
        token: str,
        poll_interval: float = 1.0,
        max_retries: int = 0,
        query_params: dict = None):
    """
    Poll Judge0 for submission status. Use query_params when present so that
    polls/request follow the same parameters (e.g. base64_encoded=true).
    """
    url = f"{JUDGE0_URL}/submissions/{token}"
    tries = 0
    while True:
        try:
            r = http_request('get', url, params=query_params or {}, timeout=15)
            r.raise_for_status()
            j = r.json()
            status_id = j.get("status", {}).get("id", 0)
            finished = status_id not in (1, 2)
            _update_task(token, done=finished, result=j, error=None)
            if finished:
                return
        except Exception as e:
            _update_task(token, error=str(e))
        tries += 1
        if max_retries and tries >= max_retries:
            return
        time.sleep(poll_interval)


@app.route("/")
def index():
    # list recent 10
    keys = []
    if redis_client:
        pattern = "task:*"
        keys = redis_client.keys(pattern)[:10]
        items = []
        for k in keys:
            token = k.split(":", 1)[1]
            items.append((token, _get_task(token)))
    else:
        with storage_lock:
            items = sorted(
                in_memory_tasks.items(),
                key=lambda kv: kv[1].get(
                    "updated",
                    0),
                reverse=True)[
                :10]
    recent = []
    now = _now()
    for t, m in items:
        age = now - m.get("updated", now)
        m_copy = m.copy()
        m_copy["updated"] = age
        recent.append((t, m_copy))
    return render_template("index.html", recent=recent)


@app.route("/submit", methods=["POST"])
def submit_form():
    try:
        # helper to accept both snake_case and camelCase form names
        def fget(*names, default=None):
            for n in names:
                v = request.form.get(n)
                if v is not None:
                    return v
            return default

        # Basic fields
        language_id_raw = fget("language_id", "languageId", default="71")
        language_id = int(language_id_raw) if language_id_raw not in (
            None, "", "null") else None
        source_code = fget("source_code", "sourceCode", default="")
        stdin = fget("stdin", default="")

        # Optional payload fields (follow Dummy Client naming -> convert to
        # snake_case keys)
        def maybe_none_from_checkbox(name):
            return request.form.get(name) is not None

        def parse_boolean_field(name, alt_names=()):
            v = fget(name, *alt_names, default=None)
            if v in ("true", "True", "1"):
                return True
            if v in ("false", "False", "0"):
                return False
            if v == "null" or v is None:
                return None
            return None

        payload = {
            "language_id": language_id,
            "source_code": source_code,
            "stdin": stdin,
        }

        # list of additional fields to copy if provided
        extras = [
            ("number_of_runs", ("number_of_runs", "numberOfRuns")),
            ("expected_output", ("expected_output", "expectedOutput")),
            ("cpu_time_limit", ("cpu_time_limit", "cpuTimeLimit")),
            ("cpu_extra_time", ("cpu_extra_time", "cpuExtraTime")),
            ("wall_time_limit", ("wall_time_limit", "wallTimeLimit")),
            ("memory_limit", ("memory_limit", "memoryLimit")),
            ("stack_limit", ("stack_limit", "stackLimit")),
            ("max_processes_and_or_threads", ("max_processes_and_or_threads", "maxProcessesAndOrThreads")),
            ("max_file_size", ("max_file_size", "maxFileSize")),
        ]
        for key, names in extras:
            v = fget(*names, default=None)
            if v == "" or v == "null":
                v = None
            if v is not None:
                # try convert numeric fields to int when appropriate
                try:
                    if v is not None and v != "":
                        payload[key] = int(v)
                    else:
                        payload[key] = v
                except Exception:
                    payload[key] = v

        # Boolean/radio fields
        bp_time = fget(
            "enablePerProcessAndThreadTimeLimit",
            "enable_per_process_and_thread_time_limit",
            default=None)
        if bp_time is not None:
            payload["enable_per_process_and_thread_time_limit"] = True if bp_time == "true" else (
                False if bp_time == "false" else None)
        bp_mem = fget(
            "enablePerProcessAndThreadMemoryLimit",
            "enable_per_process_and_thread_memory_limit",
            default=None)
        if bp_mem is not None:
            payload["enable_per_process_and_thread_memory_limit"] = True if bp_mem == "true" else (
                False if bp_mem == "false" else None)
        en_net = fget("enableNetwork", "enable_network", default=None)
        if en_net is not None:
            payload["enable_network"] = True if en_net == "true" else (
                False if en_net == "false" else None)

        # base64 request flag and other query params
        query_params = {}
        if request.form.get("base64EncodedRequest") is not None:
            # encode source/stdout/stdin if requested
            if payload.get("source_code") is not None:
                payload["source_code"] = _base64_encode(payload["source_code"])
            if payload.get("stdin") is not None:
                payload["stdin"] = _base64_encode(payload["stdin"])
            if payload.get("expected_output") is not None:
                payload["expected_output"] = _base64_encode(
                    payload["expected_output"])
            query_params["base64_encoded"] = "true"

        # allow client to request specific fields from Judge0
        fields_val = fget("fields", default=None)
        if fields_val:
            query_params["fields"] = fields_val

        # auth headers/tokens as query params (Dummy Client encodes them as
        # query parameters)
        authn_header = fget("authnHeader", default=None)
        authn_token = fget("authnToken", default=None)
        if authn_header and authn_token:
            query_params[authn_header] = authn_token
        authz_header = fget("authzHeader", default=None)
        authz_token = fget("authzToken", default=None)
        if authz_header and authz_token:
            query_params[authz_header] = authz_token

        # wait flag causes Dummy Client to wait for completion on the same
        # request.
        wait = request.form.get("waitResponse") is not None
        if wait:
            query_params["wait"] = "true"

        # Build callback url preference (prefer APP_PUBLIC_URL when request
        # host is localhost/127.0.0.1)
        requested_host = request.host_url.rstrip('/')
        if (("127.0.0.1" in requested_host or "localhost" in requested_host)
                and APP_PUBLIC_URL and not APP_PUBLIC_URL.startswith(("http://127.0.0.1", "http://localhost"))):
            callback = f"{APP_PUBLIC_URL.rstrip('/')}/api/callback"
        else:
            callback = f"{requested_host}/api/callback"

        token = submit_to_judge0(
            payload,
            query_params=query_params,
            base64_request=False,
            callback_url=callback)
        # if not using callbacks, start a poller that will reuse the same query
        # params
        if not ENABLE_CALLBACKS:
            executor.submit(poll_result, token, 1.0, 0, query_params)
        return redirect(url_for("status_page", token=token))
    except Judge0HTTPError as e:
        # Forward Judge0 error JSON and HTTP status to the client so UI can react
        return jsonify(e.body), e.status
    except Exception as e:
        return f"Submit error: {e}", 500


@app.route("/status/<token>")
def status_page(token):
    meta = _get_task(token)
    if not meta:
        # try to fetch once (plain-text by default)
        try:
            r = http_request(
                'get',
                f"{JUDGE0_URL}/submissions/{token}",
                timeout=10)
            r.raise_for_status()
            j = r.json()
            finished = j.get("status", {}).get("id", 0) not in (1, 2)
            meta = {
                "done": finished,
                "result": j,
                "error": None,
                "updated": _now()}
        except Exception as e:
            app.logger.exception(
                "Failed to fetch submission for token %s: %s", token, e)
            return f"Unknown token and failed to fetch: {e}", 404
    # Prepare decoded stdout/stderr for display (if present)
    if meta.get("result"):
        res = meta["result"]
        meta["decoded_stdout"] = _maybe_base64_decode(res.get("stdout"))
        meta["decoded_stderr"] = _maybe_base64_decode(res.get("stderr"))
    else:
        meta["decoded_stdout"] = ""
        meta["decoded_stderr"] = ""
    return render_template("status.html", token=token, meta=meta)


@app.route("/api/submit", methods=["POST"])
def api_submit():
    payload = request.get_json(force=True)
    try:
        # allow a wide set of fields similar to the form handler
        def jget(*names, default=None):
            for n in names:
                v = payload.get(n)
                if v is not None:
                    return v
            return default

        language_id_raw = jget("language_id", "languageId", default=71)
        language_id = int(language_id_raw) if language_id_raw not in (
            None, "", "null") else None
        source_code = jget("source_code", "sourceCode", default="")
        stdin = jget("stdin", default="")

        # Construct payload dict
        p = {
            "language_id": language_id,
            "source_code": source_code,
            "stdin": stdin}
        # copy extras if present
        for key in (
            "number_of_runs",
            "expected_output",
            "cpu_time_limit",
            "cpu_extra_time",
            "wall_time_limit",
            "memory_limit",
            "stack_limit",
            "max_processes_and_or_threads",
            "enable_per_process_and_thread_time_limit",
            "enable_per_process_and_thread_memory_limit",
            "max_file_size",
                "enable_network"):
            if key in payload:
                p[key] = payload.get(key)

        # Build query params from incoming JSON (mimic Dummy Client behavior)
        query_params = {}
        if payload.get("base64EncodedRequest") or payload.get(
                "base64_encoded_request") or payload.get("base64_encoded"):
            # caller claims to have base64-encoded; do not re-encode here
            query_params["base64_encoded"] = "true"
        if payload.get("fields"):
            query_params["fields"] = payload.get("fields")
        # copy auth header keys if provided
        authn_header = payload.get("authnHeader")
        authn_token = payload.get("authnToken")
        if authn_header and authn_token:
            query_params[authn_header] = authn_token
        authz_header = payload.get("authzHeader")
        authz_token = payload.get("authzToken")
        if authz_header and authz_token:
            query_params[authz_header] = authz_token
        if payload.get("wait") or payload.get("waitResponse"):
            query_params["wait"] = "true"

        # prefer external APP_PUBLIC_URL when running with localhost host
        # header
        requested_host = request.host_url.rstrip('/')
        if (("127.0.0.1" in requested_host or "localhost" in requested_host)
                and APP_PUBLIC_URL and not APP_PUBLIC_URL.startswith(("http://127.0.0.1", "http://localhost"))):
            callback = f"{APP_PUBLIC_URL.rstrip('/')}/api/callback"
        else:
            callback = f"{requested_host}/api/callback"

        token = submit_to_judge0(
            p,
            query_params=query_params,
            base64_request=False,
            callback_url=callback)
        if not ENABLE_CALLBACKS:
            executor.submit(poll_result, token, 1.0, 0, query_params)
        return jsonify({"token": token})
    except Judge0HTTPError as e:
        return jsonify(e.body), e.status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/result/<token>", methods=["GET"])
def api_result(token):
    """
    Return stored meta for token, but ensure stdout/stderr from Judge0 are decoded
    into human-readable fields `decoded_stdout` / `decoded_stderr`.
    If token is unknown locally, fetch once from Judge0 and decode before returning.
    """
    meta = _get_task(token)
    if not meta:
        try:
            r = http_request(
                'get',
                f"{JUDGE0_URL}/submissions/{token}",
                timeout=10)
            r.raise_for_status()
            j = r.json()
            finished = j.get("status", {}).get("id", 0) not in (1, 2)
            # attach decoded fields (works whether Judge0 returned base64 or
            # plain text)
            j_copy = dict(j)
            j_copy["decoded_stdout"] = _maybe_base64_decode(j.get("stdout"))
            j_copy["decoded_stderr"] = _maybe_base64_decode(j.get("stderr"))
            # also expose decoded text in stdout/stderr fields for clients
            # expecting plain text
            j_copy["stdout"] = j_copy["decoded_stdout"]
            j_copy["stderr"] = j_copy["decoded_stderr"]
            return jsonify({"done": finished, "result": j_copy})
        except Exception as e:
            app.logger.exception(
                "api_result fetch failed for token %s: %s", token, e)
            return jsonify({"error": str(e)}), 404
    # produce a safe copy with decoded stdout/stderr
    out = dict(meta)
    res = out.get("result")
    if isinstance(res, dict):
        res_copy = dict(res)
        res_copy["decoded_stdout"] = _maybe_base64_decode(res.get("stdout"))
        res_copy["decoded_stderr"] = _maybe_base64_decode(res.get("stderr"))
        # overwrite stdout/stderr with decoded values so API returns
        # human-readable text
        res_copy["stdout"] = res_copy["decoded_stdout"]
        res_copy["stderr"] = res_copy["decoded_stderr"]
        out["result"] = res_copy
    return jsonify(out)


@app.route("/api/callback", methods=["POST", "PUT"])
def api_callback():
    """
    Judge0 will POST the submission JSON to this endpoint if callback_url was set when creating submission.
    We accept the JSON and store it by token. Accept POST and PUT for compatibility and try several
    parsing fallbacks to tolerate different caller behaviors.

    Additionally decode base64-encoded stdout/stderr/compile_output if present so stored
    result fields are human-readable in the demo.
    """
    app.logger.info(
        "Callback received from %s method=%s",
        request.remote_addr,
        request.method)
    j = None
    # Try strict JSON parse first (will raise on invalid JSON)
    try:
        j = request.get_json(force=True)
    except Exception:
        # Try silent parse (returns None on failure)
        j = request.get_json(silent=True)
    if not j:
        # Fallback: try parsing raw request body
        try:
            raw = request.data.decode() if isinstance(
                request.data, (bytes, bytearray)) else request.data
            j = json.loads(raw) if raw else None
        except Exception:
            return "invalid json", 400
    token = j.get("token") or j.get(
        "result", {}).get("token") or j.get(
        "data", {}).get("token")
    if not token:
        return "no token in callback payload", 400
    # Normalize target object that contains stdout/stderr (some callbacks
    # embed under "result")
    target = None
    if isinstance(j.get("result"), dict):
        target = j["result"]
    else:
        target = j
    # Decode commonly base64-encoded fields if necessary
    for key in ("stdout", "stderr", "compile_output"):
        if key in target and target.get(key) is not None:
            try:
                decoded = _maybe_base64_decode(target.get(key))
                target[key] = decoded
                # also attach explicit decoded_* fields for clarity
                target[f"decoded_{key}"] = decoded
            except Exception:
                # leave original if decode fails
                pass
    # store normalized payload: update existing meta instead of overwriting so
    # we keep query_params
    _update_task(token, done=True, result=j, error=None)
    return "", 204


if __name__ == "__main__":
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    msg = "Starting demo server on {}:{}; Judge0 URL = {}; callback={}; redis={}".format(
        host, port, JUDGE0_URL, ENABLE_CALLBACKS, "yes" if redis_client else "no"
    )
    print(msg)
    app.run(host=host, port=port, threaded=True)
