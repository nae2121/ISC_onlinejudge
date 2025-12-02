from flask import Flask, render_template, request, jsonify, Response
import json
import base64

# Prefer requests if available, otherwise fallback to urllib
try:
    import requests as _requests
except Exception:
    _requests = None
    import urllib.request as _urllib_request
    import urllib.error as _urllib_error

app = Flask(__name__, static_folder='static', template_folder='templates')


@app.route("/")
def index():
    return render_template("index.html")

# Proxy endpoints so the browser can call same-origin and avoid CORS.
# These forward requests to the demo service inside Docker network
# (http://demo:5000).


@app.route("/api/proxy/submit", methods=["POST"])
def proxy_submit():
    try:
        payload = request.get_json(force=True)
    except Exception:
        try:
            payload = json.loads(request.get_data(as_text=True) or "{}")
        except Exception:
            payload = {}

    target = "http://demo:5000/api/submit"
    headers = {"Content-Type": "application/json"}

    # Try requests first
    if _requests:
        try:
            r = _requests.post(
                target,
                json=payload,
                headers=headers,
                timeout=15)
            return Response(
                r.content,
                status=r.status_code,
                content_type=r.headers.get(
                    "Content-Type",
                    "application/json"))
        except Exception as e:
            app.logger.exception("requests proxy_submit failed: %s", e)
            return jsonify({"error": str(e)}), 502

    # Fallback to urllib
    try:
        data = json.dumps(payload).encode("utf-8")
        req = _urllib_request.Request(
            target, data=data, headers=headers, method="POST")
        with _urllib_request.urlopen(req, timeout=15) as resp:
            body = resp.read()
            code = resp.getcode()
            ctype = resp.getheader("Content-Type") or "application/json"
            return Response(body, status=code, content_type=ctype)
    except _urllib_error.HTTPError as he:
        try:
            err_body = he.read()
        except Exception:
            err_body = str(he).encode()
        return Response(
            err_body,
            status=he.code,
            content_type="application/json")
    except Exception as e:
        app.logger.exception("urllib proxy_submit failed: %s", e)
        return jsonify({"error": str(e)}), 502


@app.route("/api/proxy/result/<token>", methods=["GET"])
def proxy_result(token):
    target = f"http://demo:5000/api/result/{token}"
    headers = {}
    if _requests:
        try:
            r = _requests.get(target, headers=headers, timeout=15)
            # If response is JSON and caller requested auto_decode (default true), attempt to decode base64-encoded fields
            try:
                auto_decode = True
                try:
                    auto_decode = (request.args.get('auto_decode', 'true').lower() == 'true')
                except Exception:
                    auto_decode = True
                ctype = r.headers.get('Content-Type','') or ''
                if auto_decode and 'application/json' in ctype.lower():
                    j = r.json()
                    modified = False
                    for key in ('stdout','stderr','compile_output'):
                        v = j.get(key)
                        if isinstance(v, str) and v.strip():
                            try:
                                # try to decode as base64
                                b = base64.b64decode(v, validate=True)
                                decoded = b.decode('utf-8', errors='replace')
                                # attach decoded field and overwrite original for convenience
                                j['decoded_' + key] = decoded
                                j[key] = decoded
                                modified = True
                            except Exception:
                                # not valid base64 or decode failed; skip
                                pass
                    if modified:
                        body = json.dumps(j).encode('utf-8')
                        return Response(body, status=r.status_code, content_type='application/json')
            except Exception:
                # if any parsing/decoding fails, fall back to raw content
                pass

            return Response(
                r.content,
                status=r.status_code,
                content_type=r.headers.get(
                    "Content-Type",
                    "application/json"))
        except Exception as e:
            app.logger.exception("requests proxy_result failed: %s", e)
            return jsonify({"error": str(e)}), 502
    try:
        req = _urllib_request.Request(target, headers=headers, method="GET")
        with _urllib_request.urlopen(req, timeout=15) as resp:
            body = resp.read()
            code = resp.getcode()
            ctype = resp.getheader("Content-Type") or "application/json"
            # If JSON and caller requested auto_decode (default true), attempt to decode base64-encoded stdout/stderr/compile_output
            try:
                auto_decode = True
                try:
                    auto_decode = (request.args.get('auto_decode', 'true').lower() == 'true')
                except Exception:
                    auto_decode = True
                if auto_decode and 'application/json' in (ctype or '').lower():
                    s = body.decode('utf-8')
                    j = json.loads(s)
                    modified = False
                    for key in ('stdout','stderr','compile_output'):
                        v = j.get(key)
                        if isinstance(v, str) and v.strip():
                            try:
                                b = base64.b64decode(v, validate=True)
                                decoded = b.decode('utf-8', errors='replace')
                                j['decoded_' + key] = decoded
                                j[key] = decoded
                                modified = True
                            except Exception:
                                pass
                    if modified:
                        body = json.dumps(j).encode('utf-8')
            except Exception:
                pass
            return Response(body, status=code, content_type=ctype)
    except _urllib_error.HTTPError as he:
        try:
            err_body = he.read()
        except Exception:
            err_body = str(he).encode()
        return Response(
            err_body,
            status=he.code,
            content_type="application/json")
    except Exception as e:
        app.logger.exception("urllib proxy_result failed: %s", e)
        return jsonify({"error": str(e)}), 502


@app.route("/api/proxy/languages", methods=["GET"])
def proxy_languages():
    """
    Forward to Judge0 core /languages so the front-end can populate the language select
    dynamically. Uses requests if available, otherwise urllib fallback (same pattern as other proxies).
    """
    target = "http://server:2358/languages"
    headers = {}
    if _requests:
        try:
            r = _requests.get(target, headers=headers, timeout=15)
            return Response(
                r.content,
                status=r.status_code,
                content_type=r.headers.get(
                    "Content-Type",
                    "application/json"))
        except Exception as e:
            app.logger.exception("requests proxy_languages failed: %s", e)
            return jsonify({"error": str(e)}), 502
    try:
        req = _urllib_request.Request(target, headers=headers, method="GET")
        with _urllib_request.urlopen(req, timeout=15) as resp:
            body = resp.read()
            code = resp.getcode()
            ctype = resp.getheader("Content-Type") or "application/json"
            return Response(body, status=code, content_type=ctype)
    except _urllib_error.HTTPError as he:
        try:
            err_body = he.read()
        except Exception:
            err_body = str(he).encode()
        return Response(
            err_body,
            status=he.code,
            content_type="application/json")
    except Exception as e:
        app.logger.exception("urllib proxy_languages failed: %s", e)
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    # Keep the same port as compose mapping
    app.run(host="0.0.0.0", port=5173)
