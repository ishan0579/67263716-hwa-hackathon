#!/usr/bin/env python3
import hashlib
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

VERSION = "1.9.8"
_CTX = None


LOCAL = ("127.0.0.1", "localhost", "::1")


def trusted(url):
    try:
        u = urlsplit(url)
        host = (u.hostname or "").lower()
    except ValueError:
        return False
    if host in LOCAL:
        return u.scheme in ("http", "https")
    return u.scheme == "https" and host == (urlsplit(SERVER).hostname or "").lower()


class _Checked(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not trusted(newurl):
            raise urllib.error.URLError(f"a redirect to {urlsplit(newurl).hostname or 'another address'} was refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def urlopen(req, timeout):
    global _CTX
    url = req.full_url if isinstance(req, urllib.request.Request) else str(req)
    if not trusted(url):
        raise urllib.error.URLError(f"{urlsplit(url).hostname or url} isn't the hackathon site's secure address")

    def go():
        return urllib.request.build_opener(urllib.request.HTTPSHandler(context=_CTX), _Checked).open(req, timeout=timeout)

    try:
        return go()
    except urllib.error.URLError as e:
        if _CTX is None and "CERTIFICATE" in str(e).upper():
            pem = system_pem()
            if pem:
                _CTX = ssl.create_default_context()
                _CTX.load_verify_locations(cafile=pem)
                return go()
        raise


_PEM = None


def system_pem():
    global _PEM
    if _PEM is not None:
        return _PEM or None
    parts = []
    try:
        if os.name == "nt":
            for store in ("ROOT", "CA"):
                for cert, enc, _trust in ssl.enum_certificates(store):
                    if enc == "x509_asn":
                        parts.append(ssl.DER_cert_to_PEM_cert(cert))
        elif sys.platform == "darwin":
            for chain in ([], ["/Library/Keychains/System.keychain"], ["/System/Library/Keychains/SystemRootCertificates.keychain"]):
                r = subprocess.run(["security", "find-certificate", "-a", "-p", *chain], capture_output=True, text=True, timeout=30)
                if r.returncode == 0:
                    parts.append(r.stdout)
        for bundle in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt", "/etc/pki/tls/certs/ca-bundle.crt"):
            if os.path.exists(bundle):
                with open(bundle, encoding="utf-8", errors="replace") as f:
                    parts.append(f.read())
                break
    except Exception:
        pass
    text = "\n".join(x.strip() for x in parts if "BEGIN CERTIFICATE" in x)
    if not text:
        _PEM = ""
        return None
    path = os.path.join(tempfile.gettempdir(), "hwa-system-ca.pem")
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    except OSError:
        _PEM = ""
        return None
    _PEM = path
    return path


HERE = os.path.dirname(os.path.abspath(__file__))
WIN = os.name == "nt"
PY = ("py" if shutil.which("py") else "python") if WIN else "python3"
RUN_AGAIN = f"{PY} submit.py"
ONLINE = ["Check this computer is online: open https://github.com in a browser.", "On a campus or office network, try a phone hotspot."]
CONFIG = {}
SERVER = "https://apply-happywhileaway.vercel.app"
ENV = dict(os.environ)
BUNDLE = None


TTY = False
COLOR = False
EMOJI = False
DEEP = False
UTF = False

_DRAW = {"#": "\u2588", "=": "\u2550", "|": "\u2551", "[": "\u2554", "]": "\u2557", "{": "\u255a", "}": "\u255d"}
LOGO = tuple("".join(_DRAW.get(c, c) for c in row) for row in (
    "##]  ##] #####] ######] ######] ##]   ##]",
    "##|  ##|##[==##]##[==##]##[==##]{##] ##[}",
    "#######|#######|######[}######[} {####[} ",
    "##[==##|##[==##|##[===} ##[===}   {##[}  ",
    "##|  ##|##|  ##|##|     ##|        ##|   ",
    "{=}  {=}{=}  {=}{=}     {=}        {=}   ",
))
LOGO_WORDS = "W H I L E   A W A Y"
FILL, EDGE, ACCENT, INK = "#bcd3ea", "#406a94", "#3cc6d0", "#0b1f33"

MARKS = {
    "ok": ("\u2705", "[ok]", 32),
    "bad": ("\u274c", "[x]", 31),
    "do": ("\U0001f449", "->", 36),
    "warn": ("\u2757", "[!]", 33),
    "wait": ("\u23f3", "..", 36),
    "party": ("\U0001f389", "*", 32),
    "tip": ("\U0001f4a1", "*", 33),
}


def looks(tty, env, encoding, win):
    term = env.get("TERM", "")
    utf = "utf" in (encoding or "").lower()
    ansi = bool(tty) and term != "dumb"
    color = ansi and not env.get("NO_COLOR")
    emoji = color and utf and term != "linux" and (not win or bool(env.get("WT_SESSION")) or env.get("TERM_PROGRAM") == "vscode")
    deep = color and (env.get("COLORTERM", "").lower() in ("truecolor", "24bit") or bool(env.get("WT_SESSION")))
    return ansi, color, emoji, deep, utf


def vt_on():
    if not WIN:
        return True
    try:
        import ctypes

        kernel = ctypes.windll.kernel32
        handle = kernel.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if not kernel.GetConsoleMode(handle, ctypes.byref(mode)):
            return False
        return bool(mode.value & 4) or bool(kernel.SetConsoleMode(handle, mode.value | 4))
    except Exception:
        return False


def look():
    global TTY, COLOR, EMOJI, DEEP, UTF
    try:
        tty = sys.stdout.isatty()
    except (AttributeError, ValueError, OSError):
        tty = False
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(**({"encoding": "utf-8", "errors": "replace"} if tty or WIN else {"errors": "replace"}))
        except Exception:
            pass
    TTY, COLOR, EMOJI, DEEP, UTF = looks(tty and vt_on(), os.environ, getattr(sys.stdout, "encoding", ""), WIN)


def code(*parts):
    return ("\x1b[" + ";".join(str(p) for p in parts) + "m") if COLOR else ""


def paint(text, *parts):
    if not COLOR or not parts or not text:
        return text
    return code(*parts) + text + code(0)


def nearest256(r, g, b):
    steps = (0, 95, 135, 175, 215, 255)
    idx = [min(range(6), key=lambda i: abs(steps[i] - v)) for v in (r, g, b)]
    grey = min(23, max(0, ((r + g + b) // 3 - 3) // 10))
    level = 8 + grey * 10

    def far(c):
        return sum((x - y) ** 2 for x, y in zip(c, (r, g, b)))

    if far((level, level, level)) < far(tuple(steps[i] for i in idx)):
        return 232 + grey
    return 16 + 36 * idx[0] + 6 * idx[1] + idx[2]


def rgb(hexcolor, back=False):
    r, g, b = (int(hexcolor[i:i + 2], 16) for i in (1, 3, 5))
    layer = 48 if back else 38
    return f"{layer};2;{r};{g};{b}" if DEEP else f"{layer};5;{nearest256(r, g, b)}"


_MARKUP = re.compile(r"\*\*(.+?)\*\*|`([^`\n]+)`")


def md(text, *base):
    out_, at = [], 0
    for m in _MARKUP.finditer(text):
        out_.append(paint(text[at:m.start()], *base))
        if m.group(1) is not None:
            out_.append(paint(m.group(1), *(base + (1,))))
        else:
            out_.append(paint(" " + m.group(2) + " ", 1, rgb(INK), rgb(ACCENT, back=True)) if COLOR else m.group(2))
        at = m.end()
    out_.append(paint(text[at:], *base))
    return "".join(out_)


def _out(s):
    try:
        sys.stdout.write(s)
    except UnicodeEncodeError:
        enc = getattr(sys.stdout, "encoding", None) or "ascii"
        sys.stdout.write(s.encode(enc, "replace").decode(enc))
    sys.stdout.flush()


_SGR = re.compile(r"\x1b\[[0-9;]*m")
_LEAD = re.compile(r"( *(?:[\u258c|] +)?(?:(?:\d+\.|\[[a-z!x-]+\]|->|\*|[^\x00-\x7f]{1,2}) +)?)")


def cells(ch):
    import unicodedata

    return 2 if ord(ch) >= 0x1100 and unicodedata.east_asian_width(ch) in ("W", "F") else 1


def fit(text):
    width = shutil.get_terminal_size((80, 24)).columns - 1
    vis = _SGR.sub("", text)
    if not TTY or width < 30 or sum(cells(c) for c in vis) <= width:
        return [text]
    lead = _LEAD.match(vis).group(1)
    hang_w = sum(cells(c) for c in lead)
    if hang_w > width // 2:
        return [text]
    pre = len(vis) - len(vis.lstrip(" "))
    bar = vis[pre:pre + 1] if vis[pre:pre + 1] in ("\u258c", "|") else ""
    hang = " " * pre + (paint(bar, rgb(ACCENT)) if bar == "\u258c" else bar) + " " * (hang_w - pre - len(bar))
    rows, rest, first, style = [], text, True, ""
    while True:
        col, now, cut, over, i = 0 if first else hang_w, style, None, False, 0
        while i < len(rest):
            m = _SGR.match(rest, i)
            if m:
                now = "" if m.group(0) == "\x1b[0m" else m.group(0)
                i = m.end()
                continue
            if rest[i] == " " and ";48;" not in now and col >= (hang_w if first else hang_w + 1):
                cut, at_cut = i, now
            col += cells(rest[i])
            if col > width:
                over = True
                break
            i += 1
        lead_in = "" if first else hang + style
        if not over or cut is None:
            rows.append(lead_in + rest)
            return rows
        rows.append(lead_in + rest[:cut].rstrip(" ") + ("\x1b[0m" if at_cut else ""))
        rest, first, style = rest[cut:].lstrip(" "), False, at_cut


def line(text=""):
    for row in fit(text):
        _out(("\r\x1b[K" if TTY else "") + row + "\n")


def say(text="", *base):
    for row in str(text).split("\n"):
        line(md(row, *base))


def mark(kind):
    emoji, plain, color = MARKS[kind]
    return emoji if EMOJI else paint(plain, 1, color)


def ok(text):
    say(f"   {mark('ok')} {text}")


def note(kind, text):
    say(f"   {mark(kind)} {text}")


STEPS = 5


def step(n, title):
    say("")
    if COLOR:
        dot = "\u00b7" if UTF else ":"
        line(paint(f" Step {n} of {STEPS} {dot} {title} ", 1, rgb("#ffffff"), rgb(EDGE, back=True)))
    else:
        say(f"[Step {n} of {STEPS}] {title}")


def numbered(items, indent=4):
    pad = " " * indent
    for i, item in enumerate(items, 1):
        first, *rest = str(item).split("\n")
        say(f"{pad}{paint(str(i) + '.', 1)} {first}")
        for more in rest:
            say(f"{pad}   {more}")


def block(rows):
    bar = paint("\u258c", rgb(ACCENT)) if COLOR and UTF else "|"
    say("")
    for row in rows:
        line(f"  {bar} {md(row)}" if row else f"  {bar}")
    say("")


def logo(what, version):
    width = max(len(row) for row in LOGO)
    if not (COLOR and UTF) or shutil.get_terminal_size((80, 24)).columns < width + 4:
        say(f"Happy While Away hackathon {what} ({version})")
        return
    say("")
    for row in LOGO:
        drawn = "".join(paint(m.group(0), 1, rgb(FILL)) if m.group(0)[0] == "\u2588" else paint(m.group(0), rgb(EDGE)) for m in re.finditer("\u2588+|[^\u2588]+", row.ljust(width)))
        line("  " + drawn)
    pad = (width - len(LOGO_WORDS)) // 2
    line("  " + " " * pad + paint(LOGO_WORDS, 1, rgb(EDGE)))
    say("")
    line("  " + paint(f"Hackathon {what}", 1) + paint(f"   {version}", 2))


def settle():
    if TTY:
        _out("\x1b[0m\x1b[?25h")


def interactive():
    try:
        return sys.stdin.isatty()
    except (AttributeError, ValueError, OSError):
        return False


def asked(question):
    lead = question[: len(question) - len(question.lstrip(" "))]
    body = question.strip()
    cut = body.rfind(" (")
    main_, hint = (body[:cut], body[cut:]) if cut > 0 else (body, "")
    return f"{lead}{mark('do')} {md(main_, 1)}{paint(hint, 2)} "


ENDED = False


def ask(question, default=""):
    global ENDED
    if question.startswith("\n"):
        say("")
        question = question.lstrip("\n")
    *rows, last = fit(asked(question))
    for row in rows:
        line(row)
    _out(("\r\x1b[K" if TTY else "") + last)
    try:
        answer = input()
        if not interactive():
            _out("\n")
    except EOFError:
        answer = ""
        ENDED = True
        _out("\n")
    return answer.strip() or default


YES = ("y", "yes")
NO = ("n", "no")


def word(answer):
    return re.sub(r"[^a-z]", "", answer.lower())


def yes_no(question, default):
    while True:
        a = word(ask(question))
        if a in YES:
            return True
        if a in NO:
            return False
        if ENDED:
            say(f"   Nothing can be typed here: taken as {'yes' if default else 'no'}.")
            return default
        say("   Please type yes or no.")


def web_address(text):
    t = text.strip().strip("<>\"'").rstrip("/.,")
    t = re.sub(r"^http://", "https://", t, flags=re.I)
    if not re.match(r"^https://", t, re.I):
        t = "https://" + t
    m = re.match(r"^https://([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)(?::\d+)?(?:/\S*)?$", t)
    return t if m and re.search(r"\.[A-Za-z]{2,}$", m.group(1)) else None


def deployment_own(host, name):
    host = host.lower()
    return host.startswith(name + "-") and host.endswith(".vercel.app") and ("-git-" in host or host.endswith("-projects.vercel.app") or bool(re.match(re.escape(name) + r"-(?=[a-z0-9]{0,8}[0-9])[a-z0-9]{9}-", host)))


def project_address(host, name):
    host = host.lower()
    return host == f"{name}.vercel.app" or (host.startswith(name + "-") and host.endswith(".vercel.app") and not deployment_own(host, name))


def project_name():
    try:
        with open(os.path.join(HERE, ".vercel", "project.json"), encoding="utf-8") as f:
            linked = json.load(f).get("projectName")
    except (OSError, ValueError, AttributeError):
        linked = None
    return (linked or CONFIG.get("vercel") or CONFIG.get("project") or os.path.basename(HERE)).lower()


def one_deployment(site, guess=None):
    host = re.sub(r"^https://", "", site, flags=re.I).split("/")[0].lower()
    return deployment_own(host, project_name())


def site_address(guess):
    question = f"   Your live site [{guess}] (yes to use it, or paste the address): "
    while True:
        a = ask(question)
        if word(a) in YES:
            return guess
        if word(a) in NO:
            question = f"   Paste your live site's address, like https://your-site.vercel.app (or type yes to use {guess}): "
            continue
        site = web_address(a) if a else None
        if site and one_deployment(site, guess):
            say(f"   That's one deployment's own address (Vercel adds letters and your team's name to it): it asks visitors to sign in.")
            say(f"   Your site's address is {guess}, so that's the one used.")
            return guess
        if site:
            return site
        if ENDED:
            say(f"   Nothing can be typed here: using {guess}.")
            return guess
        if a:
            say(f"   \"{a[:60]}\" isn't a web address. Type yes to use {guess}, or paste the full address (like https://your-site.vercel.app).")
        else:
            say(f"   Please type yes to use {guess}, or paste the full address (like https://your-site.vercel.app).")


def q(path):
    if " " not in path:
        return path
    return f'& "{path}"' if WIN else f'"{path}"'


def shown(name):
    if shutil.which(name):
        return name
    found = which(name)
    return q(found) if found else name


def by_hand():
    git, vercel = shown("git"), shown("vercel")
    block([
        f"{mark('tip')} **Your bundle is saved, so you can always finish by hand:**",
        f"{BUNDLE}",
        "",
        f"**1.** Push your code: in this folder run `{git} add -A` then `{git} commit -m \"Final\"` then `{git} push`",
        f"**2.** Deploy your site: in this folder run `{vercel} --prod`",
        f"**3.** Open {SERVER}/hackathon, then \"submit.py didn't work? Do it here instead\": save your repo, save your site, choose the bundle file above, and press **Submit my entry**.",
    ])


def stop(problem, steps=(), again=True):
    todo = list(steps) + ([f"Run submit.py again: `{RUN_AGAIN}` (a bundle that didn't finish sending is sent again, the same file; nothing is sent twice)."] if again else [])
    wrong = paint("What's wrong:", 1, 31)
    say("")
    first, *rest = str(problem).split("\n")
    line(f"   {mark('bad')} {wrong} {md(first, 1)}")
    for more in rest:
        line("      " + more)
    if todo:
        say("")
        say("   **How to fix it:**")
        numbered(todo, 5)
    if BUNDLE:
        by_hand()
    say("")
    say("   Stuck? Email hello@happywhileaway.com from the email you joined with, with a photo of this window" + (" and the bundle file." if BUNDLE else "."), 2)
    sys.exit(1)


def run(cmd, capture=True, timeout=900, env=None, cwd=None):
    cmd = list(cmd)
    if not os.path.dirname(cmd[0]):
        cmd[0] = which(cmd[0]) or cmd[0]
    try:
        return subprocess.run(cmd, cwd=cwd or HERE, env=env or ENV, capture_output=capture, text=True, timeout=timeout, encoding="utf-8", errors="replace")
    except OSError as e:
        return subprocess.CompletedProcess(cmd, 127, "", f"{os.path.basename(cmd[0])} couldn't start ({e})")
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(cmd, 124, "", f"{os.path.basename(cmd[0])} didn't finish within {timeout // 60} minutes")
    finally:
        if not capture:
            settle()


def said(r, most=600):
    return ((r.stderr or "") + "\n" + (r.stdout or "")).strip()[-most:] if r else ""


def out(cmd):
    r = run(cmd)
    return (r.stdout or "").strip() if r.returncode == 0 else ""


def which(name):
    for folder in ENV.get("PATH", "").split(os.pathsep):
        for ext in ([".exe", ".cmd", ""] if WIN else [""]):
            p = os.path.join(folder, name + ext)
            if os.path.isfile(p):
                return p
    return None


def api(op, **fields):
    body = json.dumps({"op": op, "token": CONFIG.get("token"), **fields}).encode()
    req = urllib.request.Request(f"{SERVER}/api/hackathon/cli", data=body, headers={"Content-Type": "application/json", "User-Agent": f"hwa-submit/{VERSION}"})
    try:
        with urlopen(req, 180) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return {"error": json.loads(e.read() or b"{}").get("error", f"the site answered {e.code}")}
        except Exception:
            return {"error": f"the site answered {e.code}"}
    except Exception as e:
        if "CERTIFICATE" in str(e).upper():
            via = curl_post(f"{SERVER}/api/hackathon/cli", body, f"hwa-submit/{VERSION}")
            if via is not None:
                return via
        return {"error": f"couldn't reach the hackathon site ({getattr(e, 'reason', None) or e})"}


def curl_post(url, body, agent):
    if not shutil.which("curl") or not trusted(url):
        return None
    try:
        r = subprocess.run(["curl", "-sS", "--proto", "=https", "--max-time", "120", "-X", "POST", "-H", "Content-Type: application/json", "-H", f"User-Agent: {agent}", "--data-binary", "@-", "-w", "\n%{http_code}", url], input=body, capture_output=True, timeout=150)
    except Exception:
        return None
    if r.returncode != 0:
        return None
    raw, _, code = r.stdout.rpartition(b"\n")
    try:
        status = int(code.strip() or b"0")
        data = json.loads(raw or b"{}")
    except Exception:
        return None
    if status >= 400:
        return {"error": data.get("error", f"the site answered {status}") if isinstance(data, dict) else f"the site answered {status}", "status": status}
    return data


def site_said(what, error):
    if "reach" in error:
        stop(f"{what}: {error}.", ONLINE)
    stop(f"{what}: {error}", ["Wait a minute (the site may be busy)."])


COLLECTOR = None


def collector():
    global COLLECTOR
    path = os.path.join(HERE, ".hwa", "hwa-collect.mjs")
    if COLLECTOR:
        return COLLECTOR
    try:
        with urlopen(urllib.request.Request(f"{SERVER}/hackathon/hwa-collect.mjs", headers={"User-Agent": f"hwa-submit/{VERSION}"}), 20) as r:
            data = r.read()
        with urlopen(urllib.request.Request(f"{SERVER}/api/hackathon/tools", headers={"User-Agent": f"hwa-submit/{VERSION}"}), 20) as r:
            want = (json.loads(r.read() or b"{}") or {}).get("collector_sha256")
        if b"hwa-collect" in data and ((want and hashlib.sha256(data).hexdigest() == want) or (not want and not os.path.exists(path))):
            with open(path, "wb") as f:
                f.write(data)
    except Exception:
        pass
    if not os.path.exists(path):
        stop("The collector (.hwa/hwa-collect.mjs) isn't in this folder, and the site couldn't send a new one.", ONLINE + ["Or run init.py again in this folder: it puts the collector back."], again=True)
    COLLECTOR = path
    return path


def with_token():
    env = dict(ENV, HWA_TOKEN=CONFIG.get("token") or "")
    if system_pem() and not env.get("NODE_EXTRA_CA_CERTS"):
        env["NODE_EXTRA_CA_CERTS"] = system_pem()
    return env


def node():
    exe = CONFIG.get("node") if CONFIG.get("node") and os.path.isfile(CONFIG["node"]) else which("node")
    if not exe or run([exe, "--version"]).returncode != 0:
        stop("Node, which makes the bundle, wasn't found on this computer.", ["Run init.py again in this folder: it sets Node up and keeps everything else."])
    return exe


def make_bundle(sessions=None):
    report = os.path.join(tempfile.mkdtemp(), "report.json")
    extra = ["--sessions", ",".join(sessions), "--yes"] if sessions else []
    r = run([node(), collector(), "submit", "-", "--from-submit-py", "--save-only", "--report", report, "--server", SERVER] + extra, capture=False, timeout=1800, env=with_token())
    try:
        with open(report, encoding="utf-8") as f:
            made = json.load(f)
    except (OSError, ValueError):
        made = None
    if r.returncode != 0 or not made or not os.path.exists(made.get("file") or ""):
        return None
    return made


def outbox():
    try:
        with open(os.path.join(HERE, ".hwa", "outbox.json"), encoding="utf-8") as f:
            o = json.load(f)
        if isinstance(o, dict) and o.get("state") in ("sending", "registered") and os.path.isfile(o.get("file") or ""):
            with open(o["file"], "rb") as f:
                if hashlib.sha256(f.read()).hexdigest() == o.get("sha256"):
                    return o
    except (OSError, ValueError, TypeError):
        pass
    return None


PUT_TRIES = 5


def upload_timeout(size):
    put = 180 + size / 102400.0
    posts = 4 * 6 * (60 + 45)
    return int(2 * PUT_TRIES * (put + 45) + posts + 120)


def git(*args, capture=True, timeout=300):
    return run(["git"] + list(args), capture=capture, timeout=timeout)


def gh_cmd():
    return shown("gh")


def push_failed(r, branch):
    text = said(r, 2000)
    sign_in = [f"Check you're signed in to GitHub: run `{gh_cmd()} auth status`", f"If it says you're not, run `{gh_cmd()} auth login --web` then `{gh_cmd()} auth setup-git`"]
    if re.search(r"could not read Username|Authentication failed|Permission to .* denied|\b403\b|terminal prompts disabled", text, re.I):
        stop("GitHub didn't accept the push: this computer isn't signed in to GitHub as the repo's owner.", sign_in)
    if re.search(r"Repository not found|does not appear to be a git repository", text, re.I):
        stop("GitHub says your repo isn't there (deleted, renamed or private?).", ["Run init.py again in this folder: it makes the repo again (or finds it) and keeps everything else."])
    if re.search(r"Could not resolve host|unable to access|timed out|Connection (refused|reset)", text, re.I):
        stop(f"Couldn't reach GitHub to push. {text[-300:]}", ONLINE)
    stop(f"Pushing to GitHub didn't work. {text[-400:]}", sign_in)


def git_up():
    if not which("git"):
        stop("Git wasn't found on this computer.", ["Run init.py again in this folder: it sets Git up and keeps everything else."])
    if not os.path.isdir(os.path.join(HERE, ".git")):
        stop("This folder isn't a git repo.", ["Run init.py again in this folder: it sets git up and keeps everything else."])
    branch = out(["git", "symbolic-ref", "--short", "HEAD"])
    if not branch:
        stop("Your project isn't on a branch right now (git calls it a detached HEAD).", ["In this folder run `git switch main` (or ask OpenCode to put your work back on main)."])
    if not out(["git", "config", "user.email"]) and CONFIG.get("github"):
        git("config", "user.name", CONFIG.get("name") or CONFIG["github"])
        git("config", "user.email", f"{CONFIG.get('github_id') + '+' if CONFIG.get('github_id') else ''}{CONFIG['github']}@users.noreply.github.com")

    changes = out(["git", "status", "--porcelain"])
    if changes:
        say(f"   {len(changes.splitlines())} changed files aren't committed yet.")
        if not yes_no("   Commit them now? (yes or no): ", True):
            note("warn", "Left as they are: they won't be in your repo or on your site.")
        else:
            message = ask("   A short message for the commit (Enter = 'Final changes'): ", "Final changes")
            if word(message) in YES:
                message = "Final changes"
            r = git("add", "-A")
            if r.returncode == 0:
                r = git("commit", "-m", message)
            if r.returncode != 0:
                stop(f"The commit didn't work. {said(r, 400)}", ["Commit in this folder yourself (or ask OpenCode to): `git add -A`, then `git commit -m \"Final\"`."])
            ok("Committed.")
    if not out(["git", "rev-parse", "--verify", "HEAD"]):
        stop("There are no commits yet, so there's nothing to push.", ["Commit your work first (ask OpenCode to commit and push)."])

    if branch != "main" and git("rev-parse", "--verify", "--quiet", "refs/heads/main").returncode == 0:
        say(f"   Your work is on the branch {branch}, not on main.")
        if not yes_no(f"   Merge {branch} into main now? (yes or no): ", True):
            say(f"   Left on {branch}: it's pushed as it is, and main stays as it was.")
        else:
            r = git("checkout", "main")
            if r.returncode != 0:
                stop(f"Couldn't switch to main. {said(r, 300)}", [f"Ask OpenCode to merge {branch} into main, commit and push."])
            r = git("merge", "--no-edit", branch)
            if r.returncode != 0:
                git("merge", "--abort")
                git("checkout", branch)
                stop(f"{branch} and main changed the same lines, so they can't be merged by themselves. Nothing was changed.", [f"Ask OpenCode: merge {branch} into main, fix the conflicts, commit and push."])
            branch = "main"
            ok("Merged into main.")

    remote = out(["git", "config", "--get", "remote.origin.url"])
    if not remote and CONFIG.get("repo"):
        git("remote", "add", "origin", CONFIG["repo"] + ".git")
        remote = out(["git", "config", "--get", "remote.origin.url"])
        ok(f"Your project now points at {CONFIG['repo']} again.")
    m = re.search(r"github\.com[:/]+([^/]+)/([^/\s]+?)(?:\.git)?/?$", remote)
    if not m:
        stop(f"Your project doesn't point at a GitHub repo ({remote or 'none'}).", ["Run init.py again in this folder: it points the project at your repo and keeps everything else."])

    note("wait", "Pushing to GitHub...")
    r = git("push", "-u", "origin", branch, timeout=600)
    if r.returncode != 0 and re.search(r"fetch first|non-fast-forward|rejected", said(r, 2000), re.I) and not re.search(r"denied|403", said(r, 2000)):
        say("   GitHub has commits this folder doesn't (made on github.com, or on another computer).")
        if not yes_no("   Bring them in and push again? (yes or no): ", True):
            stop("Your push was refused: GitHub has commits this folder doesn't.", [f"In this folder run `git pull --no-rebase origin {branch}` (or ask OpenCode to pull and fix any conflicts), then push."])
        p = git("pull", "--no-rebase", "--no-edit", "origin", branch, timeout=600)
        if p.returncode != 0:
            git("merge", "--abort")
            unrelated = "unrelated histories" in said(p, 2000)
            stop("GitHub's copy and this folder have different histories (an older project in the same repo?)." if unrelated else "GitHub's commits and yours changed the same lines, so they can't be joined by themselves. Nothing was changed.",
                 [f"Ask OpenCode: pull from origin {branch}, fix the conflicts, commit and push."] if not unrelated else ["Email us with a photo of this window: we'll sort out the repo with you."])
        r = git("push", "-u", "origin", branch, timeout=600)
    if r.returncode != 0:
        push_failed(r, branch)
    head = out(["git", "rev-parse", "HEAD"])
    there = out(["git", "ls-remote", "origin", f"refs/heads/{branch}"]).split("\t")[0]
    if there and there != head:
        stop("The push finished, but GitHub doesn't have your latest commit.", ["Wait a minute (GitHub may be slow)."])
    return f"https://github.com/{m.group(1)}/{m.group(2)}", head


def production(vercel, head):
    r = run([vercel, "ls", "--environment", "production", "--format", "json", "--limit", "20", "--yes"], timeout=120)
    text = (r.stdout or "") if r.returncode == 0 else ""
    try:
        data = json.loads(text[text.index("{"):])
    except ValueError:
        return "unknown", None
    found = [d for d in data.get("deployments") or [] if isinstance(d, dict) and d.get("target") == "production"]
    found.sort(key=lambda d: d.get("createdAt") or 0, reverse=True)
    for d in found:
        meta = d.get("meta") if isinstance(d.get("meta"), dict) else {}
        sha = meta.get("githubCommitSha") or meta.get("gitlabCommitSha") or meta.get("bitbucketCommitSha") or ""
        dirty = str(meta.get("gitDirty") or "").lower() in ("1", "true")
        state = str(d.get("state") or d.get("readyState") or "").upper()
        if state in ("BUILDING", "QUEUED", "INITIALIZING"):
            if sha == head and not dirty:
                return "building", d
            continue
        if state == "READY":
            if not sha or dirty:
                return "unknown", d
            return ("current" if sha == head else "behind"), d
    return ("none" if isinstance(data.get("deployments"), list) else "unknown"), None


def live_alias(vercel, deployment, name):
    if not deployment or not deployment.get("url"):
        return None
    r = run([vercel, "inspect", deployment["url"], "--json"], timeout=120)
    text = r.stdout or ""
    try:
        aliases = [a for a in json.loads(text[text.index("{"):]).get("aliases") or [] if isinstance(a, str) and a.endswith(".vercel.app") and a != deployment["url"]]
    except ValueError:
        return None
    team = re.fullmatch(re.escape(name) + r"-[a-z0-9]+-(.+)\.vercel\.app", deployment["url"].lower())
    aliases = [a for a in aliases if not team or a.lower() != f"{name}-{team.group(1)}.vercel.app"]
    own = sorted((a for a in aliases if project_address(a, name)), key=lambda a: (a != f"{name}.vercel.app", len(a)))
    return f"https://{own[0]}" if own else None


SIGNED_OUT = re.compile(r"no existing credentials|not logged in|vercel login|token is not valid|credentials", re.I)
OTHER_TEAM = re.compile(r"can.t access the selected team|not authorized|forbidden|you don.t have access|don.t have permission|could not retrieve project settings", re.I)


def vercel_account(vercel):
    r = run([vercel, "whoami"], timeout=120, cwd=os.path.expanduser("~"))
    rows = [x.strip() for x in (r.stdout or "").splitlines() if x.strip()]
    return rows[-1] if r.returncode == 0 and rows and re.fullmatch(r"[A-Za-z0-9._-]+", rows[-1]) else ""


def relink(vercel, name):
    who = vercel_account(vercel)
    note("warn", f"This folder is linked to a Vercel project in an account or team that {('your Vercel account, **' + who + '**,') if who else 'the account signed in now'} can't open.")
    say("   It was set up while another Vercel account was signed in on this computer, so every deploy says \"Not authorized\".")
    if not yes_no(f"   Make the project {name} in {('**' + who + '**') if who else 'your own Vercel account'} and deploy it there? (yes or no): ", True):
        stop("Not deployed: this folder's Vercel project is in an account or team you can't open.", [f"To use that account instead: run `{shown('vercel')} logout`, then `{shown('vercel')} login` with it, then run submit.py again.", "Or run submit.py again and type yes to make the project in your own account."])
    keep = os.path.join(HERE, ".hwa", "vercel-link-" + time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(os.path.dirname(keep), exist_ok=True)
    shutil.move(os.path.join(HERE, ".vercel"), keep)
    say(f"   The old link is kept in .hwa/{os.path.basename(keep)} (never uploaded or committed).")
    r = run([vercel, "project", "add", name], timeout=180)
    if r.returncode != 0 and OTHER_TEAM.search(said(r, 3000)):
        stop("Vercel's tool has a team chosen that your account can't open.", [f"Run `{shown('vercel')} switch` and choose your own account's name, then run submit.py again."])
    r = run([vercel, "link", "--yes", "--project", name], capture=False, timeout=300)
    if r.returncode != 0 or not os.path.exists(os.path.join(HERE, ".vercel", "project.json")):
        stop(f"Vercel couldn't link this folder to the project {name} (the reason is just above).", [f"In this folder run `{shown('vercel')} link --yes --project {name}`, then run submit.py again."])
    ok(f"Linked to your Vercel project **{name}**.")


def vercel_ready(vercel, name):
    r = run([vercel, "whoami"], timeout=120)
    if r.returncode != 0 and SIGNED_OUT.search(said(r, 3000)) and not OTHER_TEAM.search(said(r, 3000)):
        note("warn", "You're not signed in to Vercel: your browser opens Vercel; confirm there, then come back here.")
        run([vercel, "login"], capture=False, timeout=900)
        r = run([vercel, "whoami"], timeout=120)
        if r.returncode != 0 and SIGNED_OUT.search(said(r, 3000)) and not OTHER_TEAM.search(said(r, 3000)):
            stop("You're not signed in to Vercel, so submit.py can't deploy your site.", [f"Sign in: run `{shown('vercel')} login` and confirm in the browser, then run submit.py again."])
    if r.returncode != 0 and OTHER_TEAM.search(said(r, 3000)):
        relink(vercel, name)


def deploy(head):
    vercel = which("vercel")
    linked = {}
    try:
        with open(os.path.join(HERE, ".vercel", "project.json"), encoding="utf-8") as f:
            linked = json.load(f)
    except (OSError, ValueError):
        pass
    name = linked.get("projectName") or CONFIG.get("vercel") or CONFIG.get("project") or os.path.basename(HERE).lower()
    guess = f"https://{name}.vercel.app"
    if not vercel:
        note("warn", "Vercel's tool wasn't found on this computer, so submit.py can't deploy for you.")
        say("   (Run init.py again in this folder to set it up.) If your site is already live, give its address below.")
        return site_address(guess)
    if not linked:
        say(f"   This folder isn't linked to your Vercel project yet: linking it to {name}...")
        r = run([vercel, "link", "--yes", "--project", name], capture=False, timeout=300)
        if r.returncode != 0:
            stop(f"Vercel couldn't link this folder to the project {name} (the reason is just above).", [f"In this folder run `{shown('vercel')} login` if it says you're not signed in, then `{shown('vercel')} link --yes --project {name}`"])
    vercel_ready(vercel, name)

    note("wait", "Checking what your live site is running...")
    state, live = production(vercel, head)
    if state == "building":
        note("wait", f"Vercel is already deploying your latest commit ({head[:7]}): waiting for it to finish...")
        r = run([vercel, "inspect", live["url"], "--wait", "--timeout", "10m"], timeout=900)
        state = "current" if r.returncode == 0 else "behind"
    if state == "current":
        ok(f"Your live site is already up to date: it's running your latest commit ({head[:7]}), so there's nothing to deploy.")
        return site_address(live_alias(vercel, live, name) or guess)
    if state == "behind":
        sha = ((live or {}).get("meta") or {}).get("githubCommitSha") or ""
        say(f"   Your live site is running an older commit{f' ({sha[:7]})' if sha else ''}; your latest is {head[:7]}.")
        go = yes_no("   Deploy the latest to Vercel now? (yes or no): ", True)
    elif state == "none":
        say("   Your site hasn't been deployed yet.")
        go = yes_no("   Deploy it to Vercel now? (yes or no): ", True)
    else:
        go = yes_no("   Your site may already be current. Deploy again? (yes or no): ", False)
    if not go:
        say("   Not deployed now: your site stays as it was last deployed.")
    else:
        note("wait", "Deploying (a minute or two)...")
        r = run([vercel, "--prod", "--yes"], timeout=900)
        if r.returncode != 0 and OTHER_TEAM.search(said(r, 3000)):
            relink(vercel, name)
            note("wait", "Deploying (a minute or two)...")
            r = run([vercel, "--prod", "--yes"], timeout=900)
        elif r.returncode != 0 and SIGNED_OUT.search(said(r, 3000)):
            note("warn", "Vercel needs you to sign in again: your browser opens Vercel; confirm there, then come back here.")
            run([vercel, "login"], capture=False, timeout=900)
            r = run([vercel, "--prod", "--yes"], timeout=900)
            if r.returncode != 0 and OTHER_TEAM.search(said(r, 3000)):
                relink(vercel, name)
                note("wait", "Deploying (a minute or two)...")
                r = run([vercel, "--prod", "--yes"], timeout=900)
        text = said(r, 100000)
        if r.returncode == 0:
            aliased = re.search(r"Aliased:?\s+https://([A-Za-z0-9.-]+\.vercel\.app)\b", text)
            if aliased and project_address(aliased.group(1), name):
                guess = f"https://{aliased.group(1).lower()}"
            else:
                _, now = production(vercel, head)
                guess = live_alias(vercel, now, name) or guess
            ok("Deployed.")
        else:
            note("bad", "The deploy didn't work:")
            for row in text.strip()[-800:].split("\n"):
                line(row)
            say("   Fix it with OpenCode (show it the error above), then run submit.py again. Or, if an earlier deploy is live, give its address below.")
    if not go and live:
        guess = live_alias(vercel, live, name) or guess
    return site_address(guess)


def entry_refused(error):
    if "one deployment" in error.lower() or "project's address" in error.lower():
        stop(f"Your live site wasn't accepted: {error}", ["Run submit.py again and type yes to use the address it shows (your project's address, ending .vercel.app)."])
    if re.search(r"\b40[13]\b|login|protect|password", error, re.I):
        stop(f"Your repo or live site wasn't accepted: {error}", ["Your site needs a sign-in to open. In Vercel, open your project, **Settings**, **Deployment Protection**, and turn **Vercel Authentication** off.", "Open the address in a private browser window to check it opens for anyone."])
    if re.search(r"\b404\b", error):
        stop(f"Your live site wasn't accepted: {error}", ["The address may not be your project's. Open https://vercel.com, your project, then **Settings**, **Domains**: the address that ends .vercel.app is your site's.", "Run submit.py again and paste that address when it asks for your live site."])
    if "repo" in error.lower():
        stop(f"Your repo wasn't accepted: {error}", ["Check it opens for anyone: open it in a private browser window. If it's private: on github.com, Settings, Change visibility, Public."])
    site_said("Your repo or live site wasn't accepted", error)


def open_site(url):
    try:
        import webbrowser

        return bool(webbrowser.open(url))
    except Exception:
        return False


def reopen_opencode():
    launcher = os.path.join(HERE, "hwa-start.cmd" if WIN else "hwa-start.sh")
    if not os.path.exists(launcher):
        return False
    try:
        r = subprocess.run(["cmd", "/c", launcher] if WIN else ["sh", launcher], cwd=HERE, env=dict(os.environ, HWA_PICK_LAST="1"))
        return r.returncode == 0
    except OSError:
        return False


def live_address():
    name = project_name()
    vercel = which("vercel")
    if vercel and os.path.exists(os.path.join(HERE, ".vercel", "project.json")):
        _, live = production(vercel, "")
        got = live_alias(vercel, live, name) if live else None
        if got:
            return got
    site = str(CONFIG.get("site") or "")
    host = re.sub(r"^https://", "", site, flags=re.I).split("/")[0].lower()
    return f"https://{host}" if host and project_address(host, name) else f"https://{name}.vercel.app"


def website_check():
    if not interactive():
        return False
    url = live_address()
    while True:
        say("")
        line("  " + paint("Before you submit, check your live website once: open it and try it as a visitor would.", 1, 31))
        say(f"   Your website: **{url}**")
        if yes_no("   Open it now? (yes or no): ", False) and not open_site(url):
            say(f"   It couldn't be opened from here: open {url} in your browser.")
        while True:
            a = word(ask("\n   Approve and submit, or change something first? (approve or change): "))
            if a in ("approve", "a"):
                return True
            if a in ("change", "changes", "c"):
                break
            if ENDED:
                say("   Nothing can be typed here: taken as approve.")
                return True
            say("   Please type approve or change.")
        say("")
        note("wait", "Opening your last OpenCode session. When you're done, type /exit there; this window then asks again.")
        if not reopen_opencode():
            stop("OpenCode couldn't be opened from here.", [f"Open it yourself: run `{'hwa-start.cmd' if WIN else './hwa-start.sh'}` in this folder.", "Make your changes, type /exit, then run submit.py again."], again=False)


AGAIN_STOPS = {
    "used": "You've already submitted again once, and it can be done only once. Your latest version is the one we review.",
    "ended": "The hackathon has ended, so your entry can't be submitted again. The version you sent is the one we review.",
}


def submit_again_first():
    global BUNDLE
    st = api("status")
    if st.get("error") or not st.get("submitted_at"):
        return
    again = (st.get("again") or {}).get("submit_again")
    say("")
    ok(f"Your entry is already submitted ({india_time(st['submitted_at'])} IST).")
    if again != "yes":
        BUNDLE = None
        stop(AGAIN_STOPS.get(again, "Your entry is already submitted. Nothing more can change."), again=False)
    say("")
    line("   " + paint("You can submit again only once.", 1, 31))
    numbered(["Make your changes in OpenCode first (they're saved with your sessions).", "Type **yes** here: your latest work is sent as a new version.", "It replaces the version you sent. Until it arrives, the one you sent is the one we review."], 5)
    if not yes_no("\n   Do you want to submit again? (yes or no): ", False):
        say("")
        ok("Nothing changed: the version you sent is the one we review. You can still submit again later, once.")
        sys.exit(0)
    r = api("again")
    if r.get("error"):
        site_said("Your entry couldn't be opened to submit again", r["error"])
    ok("Your entry is open again. Sending your new version now.")


def main():
    global BUNDLE
    say("")
    say(f"   Project folder: **{HERE}**")

    step(1, "Your bundle: your OpenCode sessions, saved first")
    made, resumed = None, False
    waiting = outbox()
    if waiting:
        note("warn", f"Your last run didn't finish sending its bundle: {waiting['file']}")
        phase = api("status").get("phase")
        if phase in ("grace", "closed"):
            say("   The hackathon has ended, so that same bundle is sent: only a bundle started before the end can still be taken.")
            made = waiting
        else:
            say("   A new one is made with your latest sessions.")
        resumed = made is not None
    if not made:
        made = make_bundle()
    if not made:
        stop("No bundle was made (the reason is just above).", ["Run submit.py in your project folder: the folder init.py is in, where you started OpenCode.", "If it says no sessions were found, start OpenCode once in this folder, then try again."])
    BUNDLE = made["file"]
    ok(f"{'Kept' if resumed else 'Saved'}: {BUNDLE}")
    submit_again_first()
    refresh_init()
    approved = website_check()

    live_config()
    hours_check()
    status = api("status")
    if status.get("error"):
        if "token" in status["error"].lower():
            stop("**Your token was changed on the hackathon page, so this submit.py's copy no longer works.**", [f"**Download your init.py again:** open {SERVER}/hackathon, sign in, and press **Download my init.py**.", "Save it in this folder, over the old one, as init.py, and run it: `" + f"{PY} init.py" + "`. It keeps everything and updates submit.py.", f"Then run submit.py again: `{RUN_AGAIN}`"], again=False)
        site_said("The hackathon site couldn't be asked about your entry", status["error"])
    if status.get("sent_back"):
        back = status["sent_back"]
        if back.get("erased"):
            note("warn", f"The team started your entry again: {back.get('reason') or 'see the hackathon page'}.")
            say("   This sends your new entry.")
        else:
            note("warn", f"Your entry was sent back for corrections: {back.get('reason') or 'see the hackathon page'}.")
            say("   This sends it again; the new one replaces the old.")
    if status.get("submitted_at"):
        stop("Your entry is already submitted. Nothing more can change.", again=False)
    if not status.get("consented"):
        stop("Your details aren't saved on the hackathon page yet.", [f"Open {SERVER}/hackathon, tick the two boxes in Your details (18 or older, and the agreement), and press **Save**."])

    step(2, "Your code on GitHub")
    repo, commit = git_up()
    ok(f"{repo} at {commit[:7]}")
    step(3, "Your live site")
    site = deploy(commit)
    r = api("entry", repo_url=repo, site_url=site, commit_sha=commit)
    if r.get("error"):
        entry_refused(r["error"])
    ok(f"{site}: it opens for visitors.")

    step(4, "Sending your bundle")
    if not resumed and made.get("head") != commit:
        say("   There's a new commit since the bundle was saved, so it's made again with the same sessions:")
        again = make_bundle(made.get("sessions") or None)
        if again:
            made = again
            BUNDLE = made["file"]
    r = run([node(), collector(), "upload", "-", BUNDLE, "--from-submit-py", "--server", SERVER], capture=False, timeout=upload_timeout(os.path.getsize(BUNDLE)), env=with_token())
    if r.returncode != 0:
        stop("The bundle didn't upload (the reason is just above). It's kept, and the next run sends this same file.", ONLINE)
    for wait in (0, 5, 15):
        time.sleep(wait)
        after = api("status")
        if after.get("upload") == "received":
            break
    if after.get("upload") != "received":
        stop("The bundle was sent, but the site hasn't got it yet.", ["Wait a minute: if the file reached us, the site finishes it by itself."])
    ok("Your bundle has arrived.")

    step(5, "Submit")
    chance = status.get("again") or {}
    later = " (you can still submit again once later)" if chance and not chance.get("resubmitted_at") else ""
    say(f"   **After you submit, your entry is locked**{later}.")
    if not approved and not yes_no("   Submit your entry now? (yes or no): ", False):
        say("")
        note("warn", "Not submitted. Run submit.py again when you're ready, or press **Submit my entry** on the hackathon page.")
        return
    r = api("submit")
    if r.get("error"):
        site_said("Submit didn't go through", r["error"])
    block([f"{mark('party')} **Submitted. Thank you!** Our team reviews it next; you can see it on the hackathon page."])


def load():
    global CONFIG, SERVER, ENV
    try:
        with open(os.path.join(HERE, ".hwa", "config.json"), encoding="utf-8") as f:
            CONFIG = json.load(f)
    except (OSError, ValueError):
        stop("This isn't your hackathon project folder: there's no .hwa/config.json here.", ["Run submit.py in your project folder: the folder init.py is in (init.py put submit.py there).", "Or run init.py again in its folder: it puts submit.py back."], again=False)
    SERVER = CONFIG.get("server") or SERVER
    if not trusted(SERVER + "/"):
        stop("This folder's hackathon site address (in .hwa/config.json) isn't a secure (https) one, so nothing was sent.", ["Run init.py again in this folder: it writes the address again and keeps everything else."], again=False)
    ENV = dict(os.environ, NO_COLOR="1", PWD=HERE, GIT_TERMINAL_PROMPT="0")
    if CONFIG.get("path"):
        ENV["PATH"] = CONFIG["path"] + os.pathsep + os.environ.get("PATH", "")
    if CONFIG.get("opencode_db"):
        ENV["OPENCODE_DB"] = CONFIG["opencode_db"]


def india_time(iso):
    import datetime

    try:
        t = datetime.datetime.fromisoformat(str(iso).replace("Z", "+00:00")) + datetime.timedelta(hours=5, minutes=30)
    except ValueError:
        return str(iso)
    hour = t.strftime("%I").lstrip("0") or "12"
    return f"{t.strftime('%A')} {t.day} {t.strftime('%B')}, {hour}:{t.strftime('%M')} {'am' if t.hour < 12 else 'pm'}"


def hours_check():
    live = api("config")
    if live.get("error") or live.get("tester"):
        return
    if live.get("phase") == "before":
        stop("The hackathon hasn't started yet, so there's nothing to submit.", [f"You can submit once it starts: {india_time(live.get('starts_at'))} (India time)."] if live.get("starts_at") else [], again=False)
    if live.get("phase") == "closed" and live.get("closed"):
        stop("The hackathon is over, so entries can't be sent any more.", [], again=False)


def live_config():
    live = api("config")
    if live.get("status") in (401, 404):
        stop("This folder's token has been replaced.", [f"Open {SERVER}/hackathon, sign in, and press **Download my init.py**.", "Run it in this folder: it keeps everything already set up and writes submit.py again."], again=False)
    if live.get("error"):
        say("  (The hackathon site couldn't be reached for your latest details, so the ones saved here are used.)")
        return
    changed = False
    for key in ("name", "github", "project"):
        value = live.get(key)
        if isinstance(value, str) and value.strip() and CONFIG.get(key) != value.strip():
            CONFIG[key] = value.strip()
            changed = True
    if changed:
        try:
            with open(os.path.join(HERE, ".hwa", "config.json"), "w", encoding="utf-8") as f:
                json.dump(CONFIG, f, indent=2)
        except OSError:
            pass


def unexpected(e):
    import traceback

    where = os.path.join(HERE, ".hwa", "submit-error.txt")
    try:
        with open(where, "w", encoding="utf-8") as f:
            f.write(f"submit.py {VERSION}\n\n{traceback.format_exc()}")
    except OSError:
        where = None
    stop(f"Something unexpected went wrong ({type(e).__name__}: {str(e)[:200]}).", [f"If it happens again, email us the file {where} (it holds no keys)."] if where else [])


INIT_TEMPLATE_LINE = "CONFIG = {}  # " + "HWA-CONFIG: filled in for you by the hackathon page"
INIT_PERSONAL_LINE = re.compile(r"^CONFIG = \{[\s\S]*?\}  # yours: made for [^\n]* by the hackathon page$", re.M)


def refresh_init():
    path = os.path.join(HERE, "init.py")
    try:
        with open(path, "rb") as f:
            mine = f.read().decode("utf-8")
        m = INIT_PERSONAL_LINE.search(mine)
        if not m:
            return
        plain = mine[:m.start()] + INIT_TEMPLATE_LINE + mine[m.end():]

        def get(url):
            with urlopen(urllib.request.Request(url, headers={"User-Agent": f"hwa-submit/{VERSION}"}), 20) as r:
                return r.read()

        want = (json.loads(get(f"{SERVER}/api/hackathon/tools") or b"{}") or {}).get("init_sha256")
        if not want or hashlib.sha256(plain.encode("utf-8")).hexdigest() == want:
            return
        new = get(f"{SERVER}/hackathon/init.py")
        if hashlib.sha256(new).hexdigest() != want:
            return
        text = new.decode("utf-8")
        at = list(re.finditer("^" + re.escape(INIT_TEMPLATE_LINE) + "$", text, re.M))
        if len(at) != 1:
            return
        made = text[:at[0].start()] + m.group(0) + text[at[0].end():]
        if WIN:
            try:
                import ctypes

                ctypes.windll.kernel32.SetFileAttributesW(str(path), 0x80)
            except Exception:
                pass
        try:
            os.chmod(path, 0o644)
        except OSError:
            pass
        part = path + ".new"
        with open(part, "wb") as f:
            f.write(made.encode("utf-8"))
        os.replace(part, path)
    except Exception:
        return
    say("   init.py in this folder is now the newest version too.", 2)


def self_update():
    if os.environ.get("HWA_UPDATED"):
        return
    me = os.path.abspath(__file__)

    def get(url):
        with urlopen(urllib.request.Request(url, headers={"User-Agent": f"hwa-submit/{VERSION}"}), 30) as r:
            return r.read()

    try:
        with open(me, "rb") as f:
            mine = f.read()
        want = (json.loads(get(f"{SERVER}/api/hackathon/tools") or b"{}") or {}).get("submit_sha256")
        if not want or hashlib.sha256(mine).hexdigest() == want:
            return
        new = get(f"{SERVER}/hackathon/submit.py")
        if hashlib.sha256(new).hexdigest() != want:
            return
        part = me + ".new"
        with open(part, "wb") as f:
            f.write(new)
        try:
            os.chmod(me, 0o644)
        except OSError:
            pass
        os.replace(part, me)
        try:
            os.chmod(me, 0o444)
        except OSError:
            pass
    except Exception:
        return
    say("   submit.py updated itself to the hackathon site's newest version. Starting it again...")
    sys.exit(subprocess.call([sys.executable, me, *sys.argv[1:]], env=dict(os.environ, HWA_UPDATED="1")))


if __name__ == "__main__":
    look()
    self_update()
    logo("submit", f"submit.py {VERSION}")
    try:
        load()
        main()
    except KeyboardInterrupt:
        settle()
        say("")
        say("Stopped. Nothing was submitted; run submit.py again any time." + (f" Your bundle is saved: {BUNDLE}" if BUNDLE else ""))
        sys.exit(130)
    except Exception as e:
        unexpected(e)
