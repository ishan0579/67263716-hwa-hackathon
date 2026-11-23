#!/usr/bin/env python3
import hashlib
import json
import os
import platform
import re
import shutil
import ssl
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
import datetime
from urllib.parse import urlsplit

CONFIG = {
    "server": "https://apply-happywhileaway.vercel.app",
    "token": "HWA-HMBW-2A9J-4C9M-HXPA",
    "name": "Ishan Sharma",
    "first": "Ishan",
    "roll": "67263716",
    "project": "67263716-hwa-hackathon",
    "mark": "76b7ec4ee006",
    "github": "ishan0579",
    "opencode": "1.19.5"
}  # yours: made for Ishan by the hackathon page

VERSION = "1.9.16"
_CTX = None


TRUSTED = ("nodejs.org", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com")
LOCAL = ("127.0.0.1", "localhost", "::1")


def trusted(url):
    try:
        u = urlsplit(url)
        host = (u.hostname or "").lower()
    except ValueError:
        return False
    if host in LOCAL:
        return u.scheme in ("http", "https")
    return u.scheme == "https" and (host in TRUSTED or host == (urlsplit(SERVER).hostname or "").lower())


class _Checked(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not trusted(newurl):
            raise urllib.error.URLError(f"a redirect to {urlsplit(newurl).hostname or 'another address'} was refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def urlopen(req, timeout):
    global _CTX
    url = req.full_url if isinstance(req, urllib.request.Request) else str(req)
    if not trusted(url):
        raise urllib.error.URLError(f"{urlsplit(url).hostname or url} isn't an address init.py downloads from")

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

SERVER = CONFIG.get("server", "https://apply-happywhileaway.vercel.app")
WIN = os.name == "nt"
MAC = sys.platform == "darwin"
HOME = os.path.expanduser("~")
ENV = dict(os.environ, NO_COLOR="1", npm_config_update_notifier="false", npm_config_fund="false", npm_config_audit="false", NO_UPDATE_NOTIFIER="1", VERCEL_TELEMETRY_DISABLED="1")
OPENCODE_OVERRIDES = ("OPENCODE_CONFIG_CONTENT", "OPENCODE_CONFIG", "OPENCODE_CONFIG_DIR")
for _k in OPENCODE_OVERRIDES:
    ENV.pop(_k, None)
NO_UPDATE = "OPENCODE_DISABLE_AUTOUPDATE"
ENV[NO_UPDATE] = "1"
OPENCODE_ONLY = ("OPENCODE_DISABLE_EXTERNAL_SKILLS", "OPENCODE_DISABLE_CLAUDE_CODE")
for _k in OPENCODE_ONLY:
    ENV[_k] = "1"


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
    "web": ("\U0001f310", "->", 36),
    "go": ("\U0001f680", "->", 36),
    "skip": ("\u2796", "[-]", 33),
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
    out, at = [], 0
    for m in _MARKUP.finditer(text):
        out.append(paint(text[at:m.start()], *base))
        if m.group(1) is not None:
            out.append(paint(m.group(1), *(base + (1,))))
        else:
            out.append(paint(" " + m.group(2) + " ", 1, rgb(INK), rgb(ACCENT, back=True)) if COLOR else m.group(2))
        at = m.end()
    out.append(paint(text[at:], *base))
    return "".join(out)


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
    say(f"  {mark('ok')} {text}")


def note(kind, text):
    say(f"  {mark(kind)} {text}")


STEPS = 7


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


def clear_for_full_screen():
    if TTY:
        _out("\n" * max(shutil.get_terminal_size((80, 24)).lines, 1) + "\x1b[H")


BEFORE_SH = "if [ -t 1 ]; then L=$(tput lines 2>/dev/null || echo 50); i=0; while [ $i -lt ${L:-50} ]; do echo; i=$((i+1)); done; printf '\\033[H'; fi"
AFTER_SH = "if [ -t 1 ]; then printf '\\033[0m\\033[?25h\\033[?1000l\\033[?1002l\\033[?1003l\\033[?1006l\\033[?2004l\\r\\n\\033[J'; fi"


AFTER_JS = "if(process.stdout.isTTY)process.stdout.write('\\x1b[0m\\x1b[?25h\\x1b[?1000l\\x1b[?1002l\\x1b[?1003l\\x1b[?1006l\\x1b[?2004l')"


def back_from_full_screen():
    if TTY:
        _out("\x1b[0m\x1b[?25h\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l\r\n\x1b[J")


PY = ("py" if shutil.which("py") else "python") if WIN else "python3"
RUN_AGAIN = f"{PY} init.py"
LIVE = {}
ONLINE = ["Check this computer is online: open https://github.com in a browser.", "On a campus or office network, try a phone hotspot: some networks block these downloads."]


def interactive():
    try:
        return sys.stdin.isatty()
    except (AttributeError, ValueError, OSError):
        return False


def asked(question):
    lead = question[: len(question) - len(question.lstrip(" "))]
    body = question.strip()
    cut = body.rfind(" (")
    main, hint = (body[:cut], body[cut:]) if cut > 0 else (body, "")
    return f"{lead}{mark('do')} {md(main, 1)}{paint(hint, 2)} "


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


def yes_no(question, default):
    while True:
        a = re.sub(r"[^a-z]", "", ask(question).lower())
        if a in YES:
            return True
        if a in NO:
            return False
        if ENDED:
            say(f"  Nothing can be typed here: taken as {'yes' if default else 'no'}.")
            return default
        say("  Please type yes or no.")


def stop(problem, steps=(), again=True, then=()):
    todo = list(steps) + ([f"Run init.py again: `{RUN_AGAIN}` (everything already done is kept)."] if again else [])
    wrong = paint("What's wrong:", 1, 31)
    say("")
    first, *rest = str(problem).split("\n")
    line(f"  {mark('bad')} {wrong} {md(first, 1)}")
    for more in rest:
        line("     " + more)
    if todo:
        say("")
        say("  **How to fix it:**")
        numbered(todo)
    for row in then:
        say(row)
    say("")
    say("  Stuck? Email hello@happywhileaway.com with a photo of this window.", 2)
    sys.exit(1)


def run(cmd, cwd=None, env=None, capture=True, timeout=600):
    env = env or ENV
    cmd = list(cmd)
    if not os.path.dirname(cmd[0]):
        found = shutil.which(cmd[0], path=env.get("PATH"))
        if found:
            cmd[0] = found
    try:
        return subprocess.run(cmd, cwd=cwd, env=env, capture_output=capture, text=True, timeout=timeout, encoding="utf-8", errors="replace", shell=False)
    except OSError as e:
        return subprocess.CompletedProcess(cmd, 127, "", f"{os.path.basename(cmd[0])} couldn't start ({e})")
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(cmd, 124, "", f"{os.path.basename(cmd[0])} didn't finish within {timeout // 60} minutes")
    finally:
        if not capture:
            settle()


def said(r, most=600):
    return ((r.stderr or "") + "\n" + (r.stdout or "")).strip()[-most:] if r else ""


def out(cmd, cwd=None):
    r = run(cmd, cwd=cwd)
    return (r.stdout or "").strip() if r and r.returncode == 0 else None


def version_of(cmd):
    text = out(cmd) or ""
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", text)
    return tuple(int(x) for x in m.groups()) if m else None


def dotted(v):
    return ".".join(map(str, v))


def machine():
    m = platform.machine().lower()
    arm = m in ("arm64", "aarch64", "armv8l")
    if MAC and not arm and (out(["sysctl", "-n", "hw.optional.arm64"]) or "").strip() == "1":
        arm = True
    osname = "win" if WIN else "darwin" if MAC else "linux"
    return f"{osname}-{'arm64' if arm else 'x64'}"


KEY = machine()
TOOLS = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.join(HOME, "AppData", "Local"), "hwa-hackathon", "tools") if WIN else os.path.join(HOME, ".hwa-hackathon", "tools")


ADDED = []


def add_path(folder):
    if folder and os.path.isdir(folder) and folder not in ENV["PATH"].split(os.pathsep):
        ENV["PATH"] = folder + os.pathsep + ENV["PATH"]
        ADDED.insert(0, folder)


def q(path):
    if " " not in path:
        return path
    return f'& "{path}"' if WIN else f'"{path}"'


def fetch(url, dest=None, tries=4, what=None, quiet=False):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": f"hwa-init/{VERSION}"})
            with urlopen(req, 120) as r:
                data = r.read()
            if dest:
                writable(dest)
                with open(dest, "wb") as f:
                    f.write(data)
                return dest
            return data
        except urllib.error.HTTPError as e:
            last = f"the site answered {e.code}"
            if 400 <= e.code < 500 and e.code != 429:
                break
        except (urllib.error.URLError, ssl.SSLError, OSError) as e:
            last = getattr(e, "reason", None) or e
            if "CERTIFICATE" in str(e).upper() and shutil.which("curl") and trusted(url):
                target = dest or os.path.join(tempfile.mkdtemp(), "download")
                r = run(["curl", "-fsSL", "--proto", "=https", "--proto-redir", "=https", "--retry", "3", "-o", target, url], timeout=900)
                if r.returncode == 0:
                    if dest:
                        return dest
                    with open(target, "rb") as f:
                        return f.read()
        time.sleep(2 * (i + 1))
    if quiet:
        return None
    stop(f"Couldn't download {what or url} ({last}).", ONLINE)


def api(op, **fields):
    body = json.dumps({"op": op, "token": CONFIG.get("token"), **fields}).encode()
    req = urllib.request.Request(f"{SERVER}/api/hackathon/cli", data=body, headers={"Content-Type": "application/json", "User-Agent": f"hwa-init/{VERSION}"})
    try:
        with urlopen(req, 120) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return {"error": json.loads(e.read() or b"{}").get("error", f"the site answered {e.code}"), "status": e.code}
        except Exception:
            return {"error": f"the site answered {e.code}", "status": e.code}
    except Exception as e:
        if "CERTIFICATE" in str(e).upper():
            via = curl_post(f"{SERVER}/api/hackathon/cli", body, f"hwa-init/{VERSION}")
            if via is not None:
                return via
        return {"error": f"couldn't reach the hackathon site ({getattr(e, 'reason', None) or e})", "status": 0}


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


def site_problem(what, error):
    if "token" in error.lower():
        stop("**This init.py's token no longer works.** Your token was changed on the hackathon page (a new token, or your entry was started again), so the site doesn't accept this copy.",
             [f"**Download your init.py again:** open {SERVER}/hackathon, sign in, and press **Download my init.py**.", "Save it in this folder, over this one, as init.py (if your browser names it init (1).py, rename it init.py).", f"Run the new one: `{RUN_AGAIN}`"], again=False)
    if "reach" in error.lower():
        stop(f"{what}: {error}.", ONLINE)
    stop(f"{what}: {error}", ["Wait a minute (the site may be busy)."])


def checked(archive, sha, what, by_hand):
    if not sha:
        stop(f"There's no published checksum for the {what} download just now, so init.py won't run it unchecked.", ["Wait a few minutes (the hackathon site may still be looking it up)."] + ONLINE + [by_hand])
    with open(archive, "rb") as f:
        if hashlib.sha256(f.read()).hexdigest() != str(sha).lower():
            stop(f"The {what} download didn't match its published checksum, so it wasn't used.", ONLINE + [by_hand])


def inside(base, path):
    p = os.path.realpath(os.path.join(base, path))
    return p == base or p.startswith(base + os.sep)


def unpack(archive, into):
    os.makedirs(into, exist_ok=True)
    if archive.endswith(".zip"):
        with zipfile.ZipFile(archive) as z:
            z.extractall(into)
    else:
        with tarfile.open(archive) as t:
            if hasattr(tarfile, "data_filter"):
                t.extractall(into, filter="data")
            else:
                base = os.path.realpath(into)
                for m in t.getmembers():
                    target = os.path.join(os.path.dirname(m.name), m.linkname) if m.issym() else m.linkname
                    if os.path.isabs(m.name) or not inside(base, m.name) or m.isdev() or ((m.issym() or m.islnk()) and (os.path.isabs(m.linkname) or not inside(base, target))):
                        raise tarfile.TarError(f"{m.name} would land outside the folder")
                t.extractall(into)
    if not WIN:
        for root, _dirs, files in os.walk(into):
            if os.path.basename(root) == "bin":
                for name in files:
                    p = os.path.join(root, name)
                    try:
                        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
                    except OSError:
                        pass


def tool_links():
    data = fetch(f"{SERVER}/api/hackathon/tools", tries=2, quiet=True)
    try:
        return json.loads(data) if data else {}
    except ValueError:
        return {}


def no_download(tool, by_hand):
    stop(f"{tool} is missing, and init.py couldn't find a download of it for this computer ({KEY}).", ONLINE + [by_hand])


def need_config():
    if not CONFIG.get("token"):
        stop("This init.py isn't yours: it has no token in it.", [f"Open {SERVER}/hackathon and sign in with your email.", "Press **Download my init.py**, and save it in your folder (replace this one)."])
    if sys.version_info < (3, 8):
        stop(f"init.py needs Python 3.8 or later; this one is {platform.python_version()}.", ["Install the latest Python from python.org" + (" (tick 'Add python.exe to PATH')." if WIN else ".")])
    if not trusted(SERVER + "/"):
        stop("This init.py's hackathon site address isn't a secure (https) one, so nothing was downloaded.", ["Open the hackathon page, sign in, and press **Download my init.py** again.", "Save it over this one (same folder), then run it."], again=False)


IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def parse_time(iso):
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?(Z|[+-]\d\d:?\d\d)?$", str(iso or "").strip())
    if not m:
        return None
    y, mo, d, h, mi, sec, frac, tz = m.groups()
    minutes = 0
    if tz and tz != "Z":
        digits = tz[1:].replace(":", "")
        minutes = (-1 if tz[0] == "-" else 1) * (int(digits[:2]) * 60 + int(digits[2:] or 0))
    zone = datetime.timezone(datetime.timedelta(minutes=minutes))
    return datetime.datetime(int(y), int(mo), int(d), int(h), int(mi), int(sec or 0), int((frac or "0")[:6].ljust(6, "0")), tzinfo=zone)


def ist(iso):
    t = parse_time(iso)
    if not t:
        return ""
    t = t.astimezone(IST)
    return f"{t.strftime('%a')} {t.day} {t.strftime('%b')}, {t.hour % 12 or 12}:{t.minute:02d} {'am' if t.hour < 12 else 'pm'} IST"


def over_for_them():
    if not LIVE.get("closed"):
        return
    ran = f" It ran from {ist(LIVE['starts_at'])} to {ist(LIVE['ends_at'])}." if LIVE.get("starts_at") and LIVE.get("ends_at") else ""
    stop(f"**The hackathon has ended**, so setting up and checking in are closed.{ran}", again=False,
         then=["", "  There's nothing more to do on this computer.", f"  Your hackathon page shows where your entry stands: {SERVER}/hackathon"])


def same_folder(directory, folder):
    if not isinstance(directory, str) or not directory:
        return False
    norm = lambda p: re.sub(r"^/mnt/([a-z])/", lambda m: m.group(1) + ":/", p.replace("\\", "/")).rstrip("/").lower()
    return norm(directory) == norm(folder) or norm(os.path.realpath(directory)) == norm(os.path.realpath(folder))


def old_sessions(folder, opencode):
    since = LIVE.get("restarted_at")
    cut = parse_time(since)
    if not cut:
        return
    cut_ms = cut.timestamp() * 1000
    r = run([opencode, "session", "list", "--format", "json"], cwd=folder, timeout=120)
    try:
        listed = json.loads(r.stdout[r.stdout.index("["):]) if r.returncode == 0 and "[" in (r.stdout or "") else []
    except ValueError:
        listed = []
    made = lambda x: x.get("created") or (x.get("time") or {}).get("created") or 0
    old = [x for x in listed if isinstance(x, dict) and same_folder(x.get("directory"), folder) and isinstance(made(x), (int, float)) and made(x) < cut_ms]
    if not old:
        return
    n = len(old)
    them, they = ("them", "they") if n != 1 else ("it", "it")
    say("")
    say(f"  Your entry was started again on {ist(since)}. This folder still has {n} OpenCode session{'s' if n != 1 else ''} from before then.")
    say(f"  Only sessions from the restart on are sent with your entry, so {they} won't be.", 2)
    if not yes_no(f"  Delete {them} and start with a new session? (yes or no): ", False):
        ok(f"Kept {them}. OpenCode starts a new session, and only that one and later ones are sent.")
        return
    gone = 0
    for x in old:
        sid = str(x.get("id") or "")
        if re.match(r"^ses_[A-Za-z0-9]+$", sid) and run([opencode, "session", "delete", sid], cwd=folder, timeout=120).returncode == 0:
            gone += 1
    if gone == n:
        ok(f"Deleted the old session{'s' if n != 1 else ''}. OpenCode starts a new one.")
    else:
        note("warn", f"Deleted {gone} of the {n} old sessions. The rest stay here, and still aren't sent with your entry.")


def checkin_reason(folder):
    res = read_json(os.path.join(folder, ".hwa", "check-result.json"))
    return res.get("reason")


def checkin_failed(folder):
    try:
        with open(os.path.join(folder, ".hwa", "check-result.json"), encoding="utf-8") as f:
            res = json.load(f)
    except (OSError, ValueError):
        res = {}
    why = res.get("reason") if isinstance(res, dict) else None
    error = str(res.get("error") or "") if isinstance(res, dict) else ""
    if why == "ended":
        LIVE["closed"] = True
        LIVE["starts_at"] = LIVE.get("starts_at") or res.get("starts_at")
        LIVE["ends_at"] = LIVE.get("ends_at") or res.get("ends_at")
        over_for_them()
    if why == "token":
        site_problem("Checking in", error or "token")
    if why == "busy":
        stop("The hackathon site has had too many check-ins from you this hour.", ["Wait an hour, then run init.py again in this folder."], again=False)
    if why == "opencode":
        stop("OpenCode wasn't found on this computer, so the check-in couldn't finish.", ["Close this terminal, open a new one in this same folder, and run init.py again: it installs OpenCode if it's missing."], again=False)
    if why == "offline":
        stop(f"The hackathon site couldn't be reached to check you in ({error}).", ONLINE)
    if why == "site":
        stop(f"The hackathon site didn't take the check-in: {error}", ["Wait a minute (the site may be busy)."])
    stop("The check-in didn't finish (the reason is just above).", ONLINE)


def live_config():
    global NAME, MARK, REPO_TAG
    live = api("config")
    if live.get("status") in (401, 404):
        stop("This init.py's token has been replaced.", [f"Open {SERVER}/hackathon, sign in, and press **Download my init.py**.", "Save it over this one (same folder) and run it: everything already set up is kept."], again=False)
    if live.get("error"):
        say("  (The hackathon site couldn't be reached for your latest details, so the ones in this file are used.)")
        return
    for key in ("name", "first", "roll", "project", "mark", "opencode", "github"):
        if isinstance(live.get(key), str) and live[key].strip():
            CONFIG[key] = live[key].strip()
    for key in ("phase", "starts_at", "ends_at", "closed", "restarted_at", "started_over_at", "since", "again", "repo"):
        LIVE[key] = live.get(key)
    NAME = (CONFIG.get("project") or NAME).lower()
    MARK = CONFIG.get("mark") or MARK
    REPO_TAG = f"hwa:{MARK}"


def ensure_node(links):
    have = version_of(["node", "--version"])
    if have and have >= (22, 13, 0):
        ok(f"Node {dotted(have)} is ready.")
        return shutil.which("node", path=ENV["PATH"])
    folder = os.path.join(TOOLS, "node")
    exe = os.path.join(folder, "node.exe") if WIN else os.path.join(folder, "bin", "node")
    if os.path.exists(exe):
        add_path(folder if WIN else os.path.join(folder, "bin"))
        ok(f"Node {out([exe, '--version'])} is ready (set up for the hackathon earlier).")
        return exe
    item = ((links.get("node") or {}).get("files") or {}).get(KEY)
    if not item:
        no_download("Node 22.13 or later", "Or install Node 22 (LTS) yourself from https://nodejs.org, then close and reopen this terminal.")
    note("wait", f"{'Node ' + dotted(have) + ' is too old' if have else 'Node is missing'}: setting up Node {links['node'].get('version', '22')} just for the hackathon (no admin needed)...")
    tmp = tempfile.mkdtemp()
    archive = fetch(item["url"], os.path.join(tmp, os.path.basename(item["url"])), what="Node")
    checked(archive, item.get("sha256"), "Node", "Or install Node 22 (LTS) yourself from https://nodejs.org, then close and reopen this terminal.")
    try:
        unpack(archive, tmp)
    except (OSError, zipfile.BadZipFile, tarfile.TarError) as e:
        stop(f"The Node download couldn't be unpacked ({e}).", ["Check there's at least 500 MB free on this computer."])
    inner = next((os.path.join(tmp, d) for d in os.listdir(tmp) if d.startswith("node-v") and os.path.isdir(os.path.join(tmp, d))), None)
    if not inner:
        stop("The Node download didn't hold Node.", ["Or install Node 22 (LTS) yourself from https://nodejs.org, then close and reopen this terminal."])
    shutil.rmtree(folder, ignore_errors=True)
    os.makedirs(os.path.dirname(folder), exist_ok=True)
    shutil.move(inner, folder)
    add_path(folder if WIN else os.path.join(folder, "bin"))
    if not version_of([exe, "--version"]):
        stop("Node was set up but doesn't start.", ["Install Node 22 (LTS) yourself from https://nodejs.org, then close and reopen this terminal."])
    ok(f"Node {out([exe, '--version'])} is ready.")
    return exe


def npm_cmd():
    return shutil.which("npm.cmd" if WIN else "npm", path=ENV["PATH"]) or shutil.which("npm", path=ENV["PATH"])


def ensure_git(links):
    have = version_of(["git", "--version"])
    if have:
        ok(f"Git {dotted(have)} is ready.")
        return
    if WIN:
        url = (links.get("mingit") or {}).get(KEY)
        if not url:
            no_download("Git", "Or install Git yourself from https://git-scm.com/download/win (the defaults are fine), then close this terminal and open a new one in the same folder.")
        note("wait", "Git is missing: setting up a portable Git just for the hackathon (no admin needed)...")
        tmp = tempfile.mkdtemp()
        archive = fetch(url, os.path.join(tmp, "mingit.zip"), what="Git")
        checked(archive, ((links.get("mingit") or {}).get("sha256") or {}).get(KEY), "Git", "Or install Git yourself from https://git-scm.com/download/win (the defaults are fine), then close this terminal and open a new one in the same folder.")
        folder = os.path.join(TOOLS, "git")
        shutil.rmtree(folder, ignore_errors=True)
        try:
            unpack(archive, folder)
        except (OSError, zipfile.BadZipFile, tarfile.TarError) as e:
            stop(f"The Git download couldn't be unpacked ({e}).", ["Check there's at least 500 MB free on this computer."])
        add_path(os.path.join(folder, "cmd"))
        have = version_of(["git", "--version"])
        if not have:
            stop("Git was set up but doesn't start.", ["Install Git yourself from https://git-scm.com/download/win (the defaults are fine).", "Close this terminal, and open a new one in the same folder."])
        ok(f"Git {dotted(have)} is ready.")
    elif MAC:
        run(["xcode-select", "--install"])
        stop("Git is missing. On a Mac it comes with Apple's command line tools.", ["A window has opened (if not, run `xcode-select --install`). Press **Install** and wait until it's done (a few minutes).", "Close this terminal, and open a new one in the same folder."])
    else:
        hint = "sudo apt install git" if shutil.which("apt") else "sudo dnf install git" if shutil.which("dnf") else "sudo pacman -S git" if shutil.which("pacman") else "sudo zypper install git" if shutil.which("zypper") else None
        stop("Git is missing.", [f"Install it: run `{hint}` (it asks for your password)." if hint else "Install Git with your system's package manager (see https://git-scm.com/download/linux)."])


def npm_tool(package, version, binary):
    prefix = os.path.join(TOOLS, "npm")
    bin_dir = prefix if WIN else os.path.join(prefix, "bin")
    exe = os.path.join(bin_dir, binary + (".cmd" if WIN else ""))
    want = version and tuple(int(x) for x in version.split(".")[:3])
    if os.path.exists(exe) and (not want or version_of([exe, "--version"]) == want):
        add_path(bin_dir)
        return exe
    npm = npm_cmd()
    if not npm:
        stop("npm, which comes with Node, wasn't found.", ["Install Node 22 (LTS) from https://nodejs.org: npm comes with it.", "Close this terminal, and open a new one in the same folder."])
    note("wait", f"Installing {package}{'@' + version if version else ''} just for the hackathon (a minute or two)...")
    r = run([npm, "install", "-g", "--prefix", prefix, f"{package}@{version or 'latest'}"], capture=False, timeout=1200)
    if r.returncode != 0 or not os.path.exists(exe):
        stop(f"Installing {package} didn't work (npm's reason is just above).", ONLINE + ["Check there's at least 1 GB free on this computer."])
    add_path(bin_dir)
    return exe


def ensure_opencode():
    want = CONFIG.get("opencode") or ""
    have = shutil.which("opencode", path=ENV["PATH"])
    if have and want and version_of([have, "--version"]) == tuple(int(x) for x in want.split(".")[:3]):
        ok(f"OpenCode {want} is ready.")
        return have
    exe = npm_tool("opencode-ai", want, "opencode")
    ok(f"OpenCode {out([exe, '--version']) or want} is ready.")
    return exe


def ensure_gh(links):
    have = shutil.which("gh", path=ENV["PATH"])
    if have and (version_of([have, "--version"]) or (0,)) >= (2, 40, 0):
        return have
    folder = os.path.join(TOOLS, "gh")
    for root, _d, files in os.walk(folder) if os.path.isdir(folder) else []:
        if ("gh.exe" if WIN else "gh") in files and os.path.basename(root) == "bin":
            add_path(root)
            return os.path.join(root, "gh.exe" if WIN else "gh")
    url = (links.get("gh") or {}).get(KEY)
    if not url:
        no_download("GitHub's command-line tool (gh)", "Or install it yourself from https://cli.github.com, then close this terminal and open a new one in the same folder.")
    note("wait", "Setting up GitHub's command-line tool (gh), just for the hackathon...")
    tmp = tempfile.mkdtemp()
    archive = fetch(url, os.path.join(tmp, os.path.basename(url)), what="GitHub's command-line tool")
    checked(archive, ((links.get("gh") or {}).get("sha256") or {}).get(KEY), "GitHub's command-line tool", "Or install it yourself from https://cli.github.com, then close this terminal and open a new one in the same folder.")
    shutil.rmtree(folder, ignore_errors=True)
    try:
        unpack(archive, folder)
    except (OSError, zipfile.BadZipFile, tarfile.TarError) as e:
        stop(f"GitHub's tool couldn't be unpacked ({e}).", ["Check there's at least 200 MB free on this computer."])
    for root, _d, files in os.walk(folder):
        if ("gh.exe" if WIN else "gh") in files and os.path.basename(root) == "bin":
            add_path(root)
            return os.path.join(root, "gh.exe" if WIN else "gh")
    stop("GitHub's tool didn't unpack.", ["Or install it yourself from https://cli.github.com, then close this terminal and open a new one in the same folder."])


def github_accounts(gh):
    r = run([gh, "auth", "status", "--hostname", "github.com"])
    text = ((r.stdout or "") + (r.stderr or "")) if r else ""
    return re.findall(r"account\s+([A-Za-z0-9-]+)", text) or re.findall(r"Logged in to github\.com as\s+([A-Za-z0-9-]+)", text)


def github_sign_in(gh):
    r = run([gh, "auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web", "--skip-ssh-key"], capture=False, timeout=900)
    if r.returncode != 0:
        run([gh, "auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web"], capture=False, timeout=900)


def github_active(gh):
    r = run([gh, "api", "user"], timeout=120)
    try:
        return str((json.loads(r.stdout) if r and r.returncode == 0 else {}).get("login") or "")
    except ValueError:
        return ""


def github_login(gh):
    want = (CONFIG.get("github") or "").strip().lstrip("@")
    have = [a.lower() for a in github_accounts(gh)]
    if want and want.lower() not in have:
        note("web", f"**Sign in to GitHub as {want}, the account on your application, in your browser:**")
        numbered(["Copy the one-time code it shows below, then press **Enter**: your browser opens GitHub.", f"Sign in as **{want}** (if GitHub opens another account, sign out of it there first), paste the code, and press **Authorize**."])
        say("")
        github_sign_in(gh)
        have = [a.lower() for a in github_accounts(gh)]
        if want.lower() not in have:
            stop(f"You're not signed in to GitHub as {want}, the account on your application.", [f"Sign in as {want}: run `{q(gh)} auth login --web` and follow it (GitHub.com, HTTPS, Login with a web browser).", "Then run init.py again.", "Is the GitHub account on your application wrong? Email us from the address you applied with, and we'll correct it."])
    elif not have:
        note("web", "**You're not signed in to GitHub on this computer. Sign in now, in your browser:**")
        numbered(["Copy the one-time code it shows below, then press **Enter**: your browser opens GitHub.", "Sign in (no account yet? Create one there, it's free), paste the code, and press **Authorize**."])
        say("")
        github_sign_in(gh)
        if not github_accounts(gh):
            stop("You're not signed in to GitHub, so init.py can't make your repo.", ["No GitHub account yet? Make a free one at https://github.com/signup.", f"Sign in here: run `{q(gh)} auth login --web` and follow it (GitHub.com, HTTPS, Login with a web browser).", "Then run init.py again: it uses the account you signed in with."])
    if want:
        r = run([gh, "auth", "switch", "--hostname", "github.com", "--user", want])
        if r.returncode != 0 and want.lower() != (github_active(gh) or "").lower():
            stop(f"GitHub couldn't switch to {want}. {said(r, 300)}", [f"Switch by hand: run `{q(gh)} auth switch` and choose {want}, then run init.py again."])
    r = run([gh, "auth", "setup-git", "--hostname", "github.com"])
    if r.returncode != 0:
        stop(f"Git couldn't be set to push with your GitHub sign-in. {said(r, 300)}", [f"Run `{q(gh)} auth setup-git`"])
    r = run([gh, "api", "user"], timeout=120)
    try:
        user = json.loads(r.stdout) if r.returncode == 0 else {}
    except ValueError:
        user = {}
    login, uid = str(user.get("login") or ""), str(user.get("id") or "")
    if not re.match(r"^[A-Za-z0-9-]{1,39}$", login) or not uid.isdigit():
        stop(f"GitHub didn't say which account you're signed in with. {said(r, 300)}", ONLINE + [f"Check the sign-in: run `{q(gh)} auth status`"])
    if want and login.lower() != want.lower():
        stop(f"GitHub is signed in as {login} here, not {want}, the account on your application.", [f"Switch to {want}: run `{q(gh)} auth switch` and choose {want}, then run init.py again."])
    say(f"  Using the GitHub account {login}{', the one on your application' if want else ', the one signed in on this computer'}. Your repo is made under it.")
    return login, uid


RETURNING = False


NAME = (CONFIG.get("project") or "entry-hwa-hackathon").lower()
MARK = CONFIG.get("mark") or hashlib.sha256(f"entry:{CONFIG.get('token')}".encode()).hexdigest()[:12]
REPO_NOTE = "Happy While Away hackathon entry"
REPO_TAG = f"hwa:{MARK}"
JUNK = {".DS_Store", "Thumbs.db", "desktop.ini", "init.py"}
SETUP_FILES = {"submit.py", ".hwa", ".git", ".vercel", ".ds_store", "thumbs.db", "desktop.ini"}
INIT_COPY = re.compile(r"^init(?: ?\(\d+\)| copy(?: \d+)?| - copy(?: \(\d+\))?|[-_ ]\d+)?\.py$", re.I)


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def folder_owner(folder):
    cfg = os.path.join(folder, ".hwa", "config.json")
    if os.path.exists(cfg):
        old = read_json(cfg)
        if old.get("mark"):
            return "mine" if old["mark"] == MARK else "other"
        same = old.get("token") == CONFIG.get("token") or (old.get("roll") and old.get("roll") == CONFIG.get("roll") and old.get("name") == CONFIG.get("name"))
        return "mine" if same else "other"
    if not os.path.isdir(folder):
        return "free"
    try:
        return "taken" if [n for n in os.listdir(folder) if n not in JUNK] else "free"
    except OSError:
        return "taken"


def me():
    return os.path.basename(os.path.abspath(__file__))


def others_in(folder):
    try:
        names = os.listdir(folder)
    except OSError:
        return []
    return sorted(n for n in names if n.lower() not in SETUP_FILES and n.lower() != me().lower() and not INIT_COPY.match(n))


def shell_path(path):
    if WIN:
        return f'"{path}"'
    import shlex

    rest = path[len(HOME):] if path.startswith(HOME + "/") else None
    if rest and re.match(r"^/[A-Za-z0-9._/-]+$", rest):
        return "~" + rest
    return path if re.match(r"^[A-Za-z0-9._/-]+$", path) else shlex.quote(path)


def earlier_project(here):
    for folder in [os.path.join(here, NAME)] + [os.path.join(here, f"{NAME}-{n}") for n in range(2, 10)] + [os.path.join(HOME, NAME)]:
        if os.path.realpath(folder) != os.path.realpath(here) and folder_owner(folder) == "mine":
            return folder
    return None


def new_folder():
    for n in range(1, 10):
        folder = os.path.join(HOME, NAME if n == 1 else f"{NAME}-{n}")
        if not os.path.exists(folder) or (os.path.isdir(folder) and not os.path.exists(os.path.join(folder, ".hwa", "config.json")) and not others_in(folder)):
            return folder
    return os.path.join(HOME, f"{NAME}-new")


def move_here(here, there, make):
    src = os.path.join(here, me())
    dest = os.path.join(there, "init.py")
    open_there = "Open a terminal in that folder: in Finder, right-click it, then **New Terminal at Folder**." if MAC else "Open a terminal in that folder: click its address bar in File Explorer, type powershell, press Enter." if WIN else "Open a terminal in that folder."
    steps = ([f"Make a new, empty folder for your project (not inside OneDrive or iCloud), for example {there}"] if make else []) + [f"Move init.py into {'it' if make else there}.", open_there, f"Run it again: `{RUN_AGAIN}`"]
    if WIN:
        typed = ([f"mkdir {shell_path(there)}"] if make and not os.path.isdir(there) else []) + [f"Move-Item -Force {shell_path(src)} {shell_path(dest)}", f"cd {shell_path(there)}", RUN_AGAIN]
    else:
        typed = ([f"mkdir -p {shell_path(there)}"] if make else []) + [f"mv {shell_path(src)} {shell_path(dest)}", f"cd {shell_path(there)}", RUN_AGAIN]
    then = ["", f"  Or type these {len(typed)} lines in this terminal{' (PowerShell)' if WIN else ''}, one at a time, pressing Enter after each:"] + [f"    `{t}`" for t in typed]
    return steps, then


def project_folder():
    global RETURNING
    here = os.path.dirname(os.path.abspath(__file__))
    if started_over(here):
        return here
    if os.path.exists(os.path.join(here, ".hwa", "config.json")):
        if folder_owner(here) != "mine":
            steps, then = move_here(here, new_folder(), True)
            stop(f"This folder is another hackathon entry's project (made with someone else's init.py): {here}", steps, again=False, then=then)
        RETURNING = bool(read_json(os.path.join(here, ".hwa", "config.json")).get("repo"))
    else:
        others = others_in(here)
        if others:
            mine = earlier_project(here)
            if mine:
                steps, then = move_here(here, mine, False)
                stop(f"Your project is already set up in {mine} (an earlier init.py made it there), so init.py now runs in that folder.", steps, again=False, then=then)
            shown = ", ".join(others[:4]) + (f" and {len(others) - 4} more" if len(others) > 4 else "")
            steps, then = move_here(here, new_folder(), True)
            stop(f"init.py makes the folder it's in your project, so it needs a new, empty folder of its own. This one already holds other files ({shown}): {here}", steps, again=False, then=then)
    synced = re.search(r"onedrive|icloud|mobile documents|dropbox|google drive|googledrive", here, re.I)
    if synced and RETURNING:
        say(f"     This folder is synced to {synced.group(0)}, and it's already your project, so it stays here.", 2)
    elif synced:
        note("warn", f"This folder is synced to {synced.group(0)}: {here}")
        say("     A project there syncs thousands of files and can break. Better: move init.py to a new folder that isn't synced, and run it there.")
        if not yes_no("  Set up here anyway? (yes or no): ", False):
            steps, then = move_here(here, new_folder(), True)
            stop("This folder is synced to the cloud, and you chose not to set up here.", steps, again=False, then=then)
    try:
        probe = os.path.join(here, ".hwa-write-test")
        with open(probe, "w") as f:
            f.write("ok")
        os.remove(probe)
        os.makedirs(os.path.join(here, ".hwa"), exist_ok=True)
    except OSError:
        stop(f"This terminal can't write in {here}.", (["On a Mac, allow it: System Settings, Privacy and Security, Files and Folders, then turn on your terminal's access."] if MAC else []) + ["Or make a new, empty folder somewhere else (not inside OneDrive or iCloud), move init.py there, and open the terminal in that folder."])
    return here


SUBMIT_COPY = re.compile(r"^submit(?: ?\(\d+\)| copy(?: \d+)?| - copy(?: \(\d+\))?|[-_ ]\d+)\.py$", re.I)


def tidy_copies(folder):
    mine = os.path.abspath(__file__)
    main_init = os.path.join(folder, "init.py")
    try:
        if os.path.normcase(mine) != os.path.normcase(main_init) and os.path.dirname(os.path.normcase(mine)) == os.path.normcase(folder) and INIT_COPY.match(me()):
            with open(mine, "rb") as f:
                text = f.read()
            if os.path.exists(main_init):
                writable(main_init)
            part = main_init + ".new"
            with open(part, "wb") as f:
                f.write(text)
            os.replace(part, main_init)
    except OSError:
        return
    removed = []
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        low = name.lower()
        if low in ("init.py", "submit.py") or not os.path.isfile(path):
            continue
        if INIT_COPY.match(name) or SUBMIT_COPY.match(name) or low in ("init.py.new", "submit.py.new"):
            try:
                writable(path)
                os.remove(path)
                removed.append(name)
            except OSError:
                pass
    if removed:
        ok(f"Older copies removed: {', '.join(removed)}. This folder keeps one init.py and one submit.py.")


def private(path, mode):
    if not WIN:
        try:
            os.chmod(path, mode)
        except OSError:
            pass


def save_config(folder, **more):
    path = os.path.join(folder, ".hwa", "config.json")
    cfg = read_json(path)
    cfg.update(CONFIG)
    cfg.update({"folder": folder, "tools": TOOLS, "path": ENV["PATH"], "mark": MARK, "project": NAME})
    cfg.update({k: v for k, v in more.items() if v is not None})
    private(os.path.dirname(path), 0o700)
    with open(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    private(path, 0o600)


def ignore_line(name):
    s = re.sub(r"([\[\]*?\\])", r"\\\1", name)
    return "\\" + s if s[:1] in ("#", "!") else s


def own_copies(folder):
    names = {me()}
    try:
        names.update(n for n in os.listdir(folder) if INIT_COPY.match(n))
    except OSError:
        pass
    return [ignore_line(n) for n in sorted(names) if n != "init.py"]


def add_lines(path, wanted):
    lines = open(path, encoding="utf-8").read().splitlines() if os.path.exists(path) else []
    for row in wanted:
        if row not in lines:
            lines.append(row)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def write_files(folder, login, uid):
    save_config(folder, github=login, github_id=uid)
    with open(os.path.join(folder, ".hwa", ".gitignore"), "w") as f:
        f.write("*\n")
    mine = own_copies(folder)
    add_lines(os.path.join(folder, ".gitignore"), ["node_modules/", ".hwa/", ".vercel/", ".env*", "init.py", "init (*).py", "submit.py", "hwa-start.*", ".DS_Store", "dist/"] + mine)
    add_lines(os.path.join(folder, ".vercelignore"), [".hwa", "init.py", "init (*).py", "submit.py", "hwa-start.*"] + mine)


RULES_FILE = os.path.join(".hwa", "rules.md")
OPENCODE_FILE = "opencode.json"


def text_sha(text):
    return hashlib.sha256(text.replace("\r\n", "\n").encode("utf-8")).hexdigest()


def file_sha(path):
    try:
        with open(path, encoding="utf-8", newline="") as f:
            return text_sha(f.read())
    except (OSError, ValueError):
        return None


def agent_report(folder):
    rules = os.path.join(folder, RULES_FILE)
    try:
        readonly = not (os.stat(rules).st_mode & stat.S_IWUSR)
    except OSError:
        readonly = None
    return {"rules_sha256": file_sha(rules), "opencode_sha256": file_sha(os.path.join(folder, OPENCODE_FILE)), "rules_readonly": readonly}


def unhide(path):
    if WIN and os.path.exists(path) and not os.path.islink(path):
        try:
            import ctypes

            ctypes.windll.kernel32.SetFileAttributesW(str(path), 0x80)
        except Exception:
            pass


def writable(path):
    unhide(path)
    if os.path.exists(path) and not os.path.islink(path):
        try:
            os.chmod(path, stat.S_IREAD | stat.S_IWRITE | (stat.S_IXUSR if path.endswith(".sh") else 0))
        except OSError:
            pass


LOCKED = [os.path.join(".hwa", "rules.md"), "opencode.json", "submit.py", os.path.join(".hwa", "hwa-collect.mjs"), "hwa-start.cmd" if WIN else "hwa-start.sh"]
HIDDEN = [".hwa", "opencode.json"]


def lock_down(folder):
    for name in LOCKED:
        path = os.path.join(folder, name)
        if os.path.isfile(path) and not os.path.islink(path):
            try:
                os.chmod(path, stat.S_IREAD | (0 if WIN else stat.S_IRGRP | stat.S_IROTH) | (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH if name.endswith(".sh") else 0))
            except OSError:
                pass
    for name in HIDDEN:
        path = os.path.join(folder, name)
        if not os.path.exists(path):
            continue
        if MAC:
            run(["chflags", "hidden", path], timeout=10)
        elif WIN:
            run(["attrib", "+h", path], timeout=10)


def write_fixed(path, text, readonly):
    if os.path.islink(path):
        os.remove(path)
    elif os.path.exists(path):
        unhide(path)
        try:
            os.chmod(path, stat.S_IREAD | stat.S_IWRITE)
        except OSError:
            pass
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    if readonly:
        try:
            os.chmod(path, stat.S_IREAD | (0 if WIN else stat.S_IRGRP | stat.S_IROTH))
        except OSError:
            pass


def agent_files(folder):
    got = api("agent", report=agent_report(folder), by="init.py")
    if got.get("error"):
        site_problem("Getting the hackathon's rules for OpenCode from the site didn't work", got["error"])
    sums = got.get("sha256") if isinstance(got.get("sha256"), dict) else {}
    texts = {}
    for key in ("rules_md", "opencode_json", "first_prompt"):
        text = got.get(key)
        if not isinstance(text, str) or not text.strip() or text_sha(text) != str(sums.get(key) or ""):
            stop("The hackathon's rules for OpenCode didn't arrive whole from the site, so nothing was written.", ONLINE)
        texts[key] = text
    if re.search(r'["%!^&|<>\r\n]', texts["first_prompt"]):
        stop("The first prompt the site gave can't be passed to OpenCode safely, so OpenCode wasn't set up.", ["Wait a minute (the site may be changing), then run init.py again."])
    write_fixed(os.path.join(folder, RULES_FILE), texts["rules_md"], True)
    write_fixed(os.path.join(folder, OPENCODE_FILE), texts["opencode_json"], True)
    marked = [str(x) for x in got.get("rules") or [] if isinstance(x, str)][:20]
    SHOWN["rules"] = marked or [re.sub(r"^\d+\.\s+", "", x) for x in texts["rules_md"].split("## The candidate's rules", 1)[-1].split("##", 1)[0].splitlines() if re.match(r"^\d+\.\s", x)]
    SHOWN["dos"] = [str(x) for x in got.get("dos") or [] if isinstance(x, str)][:12]
    SHOWN["donts"] = [str(x) for x in got.get("donts") or [] if isinstance(x, str)][:12]
    SHOWN["tips"] = [str(x) for x in got.get("tips") or [] if isinstance(x, str)][:6]
    return texts["first_prompt"]


def setup_git(folder, login, uid):
    if not os.path.isdir(os.path.join(folder, ".git")):
        r = run(["git", "init", "-b", "main"], cwd=folder)
        if r.returncode != 0 or not os.path.isdir(os.path.join(folder, ".git")):
            r = run(["git", "init"], cwd=folder)
            if r.returncode != 0:
                stop(f"Git couldn't start a repo in {folder}. {said(r, 300)}", ["Check you can make files in that folder (and that it isn't synced to OneDrive or iCloud)."])
            run(["git", "symbolic-ref", "HEAD", "refs/heads/main"], cwd=folder)
    for key, value in (("user.name", CONFIG.get("name") or login), ("user.email", f"{uid}+{login}@users.noreply.github.com")):
        r = run(["git", "config", "--", key, value], cwd=folder)
        if r.returncode != 0:
            stop(f"Git couldn't save your name for commits. {said(r, 300)}", [f"In {folder}, run: `git config {key} \"{value}\"`"])


def repo_on_github(gh, full):
    r = run([gh, "repo", "view", full, "--json", "name,description,visibility,isEmpty"], timeout=120)
    if r.returncode == 0:
        try:
            return json.loads(r.stdout or "{}")
        except ValueError:
            return {}
    if re.search(r"could not resolve to a repository|not found|\b404\b", said(r), re.I):
        return None
    stop(f"Couldn't ask GitHub about github.com/{full}. {said(r, 300)}", ONLINE + [f"Check you're signed in: run `{q(gh)} auth status`"])


def setup_repo(gh, folder, login):
    full = f"{login}/{NAME}"
    seen = repo_on_github(gh, full)
    if seen is None:
        r = run([gh, "repo", "create", NAME, "--public", "--description", f"{REPO_NOTE} ({REPO_TAG})"], timeout=180)
        if r.returncode != 0:
            seen = repo_on_github(gh, full)
            if seen is None:
                stop(f"GitHub didn't make the repo {NAME}. {said(r, 300)}", ONLINE + [f"Check you're signed in: run `{q(gh)} auth status`"])
        else:
            ok(f"Made the public repo github.com/{full}.")
    if seen is not None:
        note_ = seen.get("description") or ""
        if REPO_TAG in note_ or note_.strip() == REPO_NOTE:
            ok(f"The repo github.com/{full} is this entry's, from an earlier run: using it.")
        elif seen.get("isEmpty"):
            run([gh, "repo", "edit", full, "--description", f"{REPO_NOTE} ({REPO_TAG})"], timeout=120)
            ok(f"The repo github.com/{full} is empty: using it for the hackathon.")
        else:
            stop(f"You already have a repo called {NAME} (github.com/{full}) that init.py didn't make for this entry, so it's left alone.", [f"Open https://github.com/{full}/settings and rename it (or delete it, if you don't need it)."])
        if (seen.get("visibility") or "PUBLIC").upper() != "PUBLIC":
            stop(f"github.com/{full} is private. The hackathon needs it public.", [f"Open https://github.com/{full}/settings, scroll to the bottom, press **Change visibility** and choose **Public**."])
    url = f"https://github.com/{full}.git"
    remotes = out(["git", "remote"], cwd=folder) or ""
    r = run(["git", "remote", "set-url" if "origin" in remotes.split() else "add", "origin", url], cwd=folder)
    if r.returncode != 0:
        stop(f"Git couldn't point your project at github.com/{full}. {said(r, 300)}", [f"In {folder}, run: `git remote add origin {url}`"])
    return f"https://github.com/{full}"


def align_with_github(folder):
    if run(["git", "fetch", "-q", "origin", "main"], cwd=folder, env=dict(ENV, GIT_TERMINAL_PROMPT="0"), timeout=180).returncode != 0:
        return False
    remote = out(["git", "rev-parse", "FETCH_HEAD"], cwd=folder)
    local = out(["git", "rev-parse", "-q", "--verify", "HEAD"], cwd=folder)
    if not remote or local == remote:
        return False
    backup = None
    if local:
        base = run(["git", "merge-base", local, remote], cwd=folder)
        if base.returncode == 0 and (base.stdout or "").strip():
            return False
        when = lambda c: int(out(["git", "log", "-1", "--format=%ct", c], cwd=folder) or 0)
        if when(local) > when(remote):
            r = run(["git", "merge", "-q", "-s", "ours", "--allow-unrelated-histories", "--no-edit", "-m", "Carry on this folder's work (GitHub's earlier history kept under it)", remote], cwd=folder)
            if r.returncode == 0:
                ok("This folder has your newest work, so it carries on as it is. GitHub's earlier history is kept under it, so your next push just goes through.")
            else:
                note("warn", f"This folder's history and GitHub's are different, and they couldn't be joined ({said(r, 200)}). Ask OpenCode to commit your work, then run init.py again.")
            return False
        backup = f"before-{time.strftime('%Y%m%d-%H%M%S')}"
        run(["git", "branch", backup, local], cwd=folder)
        run(["git", "stash", "push", "-q", "-u", "-m", backup], cwd=folder)
    for name in LOCKED:
        writable(os.path.join(folder, name))
    r = run(["git", "checkout", "-q", "-f", "-B", "main", remote], cwd=folder)
    if r.returncode != 0:
        note("warn", f"This folder's history and GitHub's are different, and they couldn't be lined up ({said(r, 200)}). Ask OpenCode to pull from origin main before you build.")
        return False
    if backup:
        note("warn", f"GitHub has a newer start of your entry (set up or started over in another folder or on another computer), so this folder now carries on from it. Your earlier work here is kept on the branch {backup}, and any unsaved changes in git's stash.")
    else:
        ok("This folder carries on your entry from GitHub.")
    return True


def ensure_vercel():
    have = shutil.which("vercel", path=ENV["PATH"])
    if have and (version_of([have, "--version"]) or (0,)) >= (39, 0, 0):
        return have
    return npm_tool("vercel", None, "vercel")


def vercel_team(vercel, folder):
    r = run([vercel, "teams", "ls", "--format", "json"], cwd=folder, timeout=120)
    try:
        text = r.stdout or ""
        teams = json.loads(text[text.index("{"):]).get("teams") or [] if r.returncode == 0 else []
    except ValueError:
        teams = []
    now = [t for t in teams if isinstance(t, dict) and t.get("current")]
    return str(now[0].get("name") or now[0].get("slug") or "") if now else ""


def setup_vercel(folder):
    vercel = ensure_vercel()
    working("Checking your Vercel sign-in...")
    who = run([vercel, "whoami"], cwd=folder, timeout=120)
    if who.returncode != 0:
        note("web", "**Signing in to Vercel in your browser:**")
        numbered(["Your browser opens Vercel (if it doesn't, open the address it shows below).", "No Vercel account yet? Choose **Continue with GitHub**, with the same GitHub account. It's free (Hobby).", "Confirm in the browser, then come back here."])
        say("")
        run([vercel, "login"], cwd=folder, capture=False, timeout=900)
        working("Signed in. Checking your Vercel account...")
        who = run([vercel, "whoami"], cwd=folder, timeout=120)
        if who.returncode != 0:
            stop("You're not signed in to Vercel, so init.py can't make your Vercel project.", ["No Vercel account yet? Make a free one at https://vercel.com/signup: choose Hobby, then Continue with GitHub.", f"Sign in here: run `{q(vercel)} login` and confirm in the browser."])
    account = (who.stdout or "").strip().splitlines()[-1:] or [""]
    team = vercel_team(vercel, folder)
    where = f"**{account[0]}**" + (f", team **{team}**" if team else "")
    name = NAME
    linked = read_json(os.path.join(folder, ".vercel", "project.json")).get("projectName")
    if linked != name and not yes_no(f"  Signed in to Vercel as {where}. Make your project there? (yes or no): ", True):
        stop("You chose not to use the Vercel account signed in on this computer.", [f"Another account: run `{q(vercel)} logout`, then `{q(vercel)} login` with yours.", f"Another team of yours: run `{q(vercel)} switch` and choose it.", "Then run init.py again."])
    ok(f"Vercel account: {where}")
    start_over_vercel(vercel, folder)
    if linked != name:
        working(f"Making your Vercel project {name}...")
        r = run([vercel, "project", "add", name], cwd=folder, timeout=180)
        exists = r.returncode != 0 and re.search(r"already exists|conflict|\b409\b", said(r), re.I)
        if r.returncode != 0 and not exists:
            stop(f"Vercel didn't make the project {name}. {said(r, 300)}", ONLINE + [f"If you're in a Vercel team, use your own account: run `{q(vercel)} switch` and choose your own name."])
        if exists:
            say(f"  A Vercel project called {name} is already in your Vercel account (likely from an earlier run of init.py).")
            if not KEEP_VERCEL and not yes_no("  Use it for the hackathon? Your site will be deployed to it. (yes or no): ", True):
                stop(f"You chose not to use the Vercel project {name}.", [f"Open https://vercel.com/dashboard, open {name}, then Settings: rename it (or delete it, if you don't need it)."])
        working("Linking this folder to it...")
        r = run([vercel, "link", "--yes", "--project", name], cwd=folder, capture=False, timeout=300)
        if r.returncode != 0 or not os.path.exists(os.path.join(folder, ".vercel", "project.json")):
            stop(f"Vercel couldn't link your project folder to the project {name} (the reason is just above).", ONLINE + [f"Or link it yourself: in {folder}, run `{q(vercel)} link --yes --project {name}`"])
    ok(f"Vercel project **{name}** linked. Your site's address is https://{name}.vercel.app: the hackathon takes only that one.")
    return name


def cmd_path(path):
    for var in ("LOCALAPPDATA", "APPDATA", "USERPROFILE"):
        base = os.environ.get(var)
        if base and path.lower().startswith(base.rstrip("\\").lower() + "\\"):
            return f"%{var}%" + path[len(base.rstrip("\\")):].replace("%", "%%")
    return path.replace("%", "%%")


def launchers(folder, opencode, node=None, links=(None, None)):
    repo, site = (safe_link(links[0]), safe_link(links[1]))
    if WIN:
        lines = ["@echo off"]
        if ADDED:
            lines.append('set "PATH=' + ";".join(cmd_path(d) for d in ADDED) + ';%PATH%"')
        lines += [f'set "{k}="' for k in OPENCODE_OVERRIDES]
        lines.append(f'set "{NO_UPDATE}=1"')
        lines += [f'set "{k}=1"' for k in OPENCODE_ONLY]
        if ENV.get("OPENCODE_DB"):
            lines.append(f'set "OPENCODE_DB={cmd_path(ENV["OPENCODE_DB"])}"')
        lines += ['cd /d "%~dp0"', "echo.", "echo   ONLY OPEN-SOURCE MODELS ARE ALLOWED: pick one in /models (Qwen, DeepSeek, Kimi, GLM, gpt-oss, Llama, Mistral).", "echo   Closed models (Claude, GPT, Gemini, Grok) are against the rules; any provider or your own API key is fine for open-source models.", "echo."]
        seal = os.path.join(".hwa", "hwa-collect.mjs")
        if node:
            lines.append(f'start "" /b "{cmd_path(node)}" {seal} watch - >nul 2>&1')
            pick = os.path.join(".hwa", "pick.txt")
            lines += [f'"{cmd_path(node)}" {seal} pick - --report {pick}', 'set "S="', f"if exist {pick} set /p S=<{pick}", 'if "%S%"=="stop" exit /b 1', f'if defined S ("{cmd_path(opencode)}" -s %S%) else ("{cmd_path(opencode)}")']
        else:
            lines.append(f'"{cmd_path(opencode)}"')
        if node:
            lines.append(f'"{cmd_path(node)}" -e "{AFTER_JS}"')
            lines.append(f'"{cmd_path(node)}" {seal} seal - >nul 2>&1')
            lines.append(f'"{cmd_path(node)}" -e "{next_js(repo, site)}"')
        text = "\r\n".join(lines) + "\r\n"
        if not all(ord(c) < 128 for c in text):
            text = "@echo off\r\nchcp 65001 >nul\r\n" + "\r\n".join(lines[1:]) + "\r\n"
        writable(os.path.join(folder, "hwa-start.cmd"))
        with open(os.path.join(folder, "hwa-start.cmd"), "w", encoding="utf-8", newline="") as f:
            f.write(text)
    else:
        import shlex

        p = os.path.join(folder, "hwa-start.sh")
        writable(p)
        path = "".join(shlex.quote(d) + ":" for d in ADDED)
        own_db = f'export OPENCODE_DB={shlex.quote(ENV["OPENCODE_DB"])}\n' if ENV.get("OPENCODE_DB") else ""
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            warn = "printf '\\n\\033[1;37;41m ONLY OPEN-SOURCE MODELS ARE ALLOWED \\033[0m\\n\\033[31m  Pick one in /models (Qwen, DeepSeek, Kimi, GLM, gpt-oss, Llama, Mistral). Closed models (Claude, GPT, Gemini, Grok) are against the rules; any provider or your own API key is fine for open-source models.\\033[0m\\n\\n'"
            if node:
                n, c = shlex.quote(node), ".hwa/hwa-collect.mjs"
                o = shlex.quote(opencode)
                f.write(f'#!/bin/sh\nexport PATH={path}"$PATH"\n{own_db}export {NO_UPDATE}=1 {" ".join(k + "=1" for k in OPENCODE_ONLY)}\nunset {" ".join(OPENCODE_OVERRIDES)}\ncd "$(dirname "$0")" && export PWD="$(pwd)" && {warn} || exit 1\ntrap : INT\n{n} {c} watch - </dev/null >/dev/null 2>&1 &\nW=$!\n{n} {c} pick - --report .hwa/pick.txt\nS="$(cat .hwa/pick.txt 2>/dev/null)"\nif [ "$S" = "stop" ]; then kill $W 2>/dev/null; wait $W 2>/dev/null; exit 1; fi\n{BEFORE_SH}\nif [ -n "$S" ]; then {o} -s "$S"; else {o}; fi\nE=$?\n{AFTER_SH}\nkill $W 2>/dev/null\nwait $W 2>/dev/null\n{n} {c} seal - </dev/null >/dev/null 2>&1\n{next_sh(repo, site)}\nexit $E\n')
            else:
                f.write(f'#!/bin/sh\nexport PATH={path}"$PATH"\n{own_db}export {NO_UPDATE}=1 {" ".join(k + "=1" for k in OPENCODE_ONLY)}\nunset {" ".join(OPENCODE_OVERRIDES)}\ncd "$(dirname "$0")" && export PWD="$(pwd)" && {warn} || exit 1\n{BEFORE_SH}\n{shlex.quote(opencode)}\nE=$?\n{AFTER_SH}\n{next_sh(repo, site)}\nexit $E\n')
        os.chmod(p, 0o755)


def folder_print(folder):
    x = os.path.abspath(folder) if WIN else os.path.realpath(folder)
    x = x.rstrip("\\/") or x
    if WIN:
        x = x.replace("\\", "/").lower()
    return hashlib.sha256(x.encode("utf-8")).hexdigest()[:16]


def in_folder(folder):
    try:
        return os.path.normcase(os.path.realpath(os.getcwd())) == os.path.normcase(os.path.realpath(folder))
    except OSError:
        return False


def start_command(folder, here):
    if WIN:
        return "double-click **hwa-start.cmd** in your project folder, or run " + ("`.\\hwa-start.cmd`" if here else f"`{q(os.path.join(folder, 'hwa-start.cmd'))}`")
    return "run " + ("`./hwa-start.sh`" if here else f"`{q(os.path.join(folder, 'hwa-start.sh'))}`")


TEMPLATE_LINE = "CONFIG = {}  # " + "HWA-CONFIG: filled in for you by the hackathon page"
PERSONAL_LINE = re.compile(r"^CONFIG = \{[\s\S]*?\}  # yours: made for [^\n]* by the hackathon page$", re.M)


def self_update():
    if os.environ.get("HWA_UPDATED") or not CONFIG.get("token"):
        return
    me = os.path.abspath(__file__)
    try:
        with open(me, "rb") as f:
            mine = f.read().decode("utf-8")
        m = PERSONAL_LINE.search(mine)
        if not m:
            return
        plain = mine[:m.start()] + TEMPLATE_LINE + mine[m.end():]
        want = (json.loads(fetch(f"{SERVER}/api/hackathon/tools", tries=2, quiet=True) or b"{}") or {}).get("init_sha256")
        if not want or hashlib.sha256(plain.encode("utf-8")).hexdigest() == want:
            return
        new = fetch(f"{SERVER}/hackathon/init.py", tries=2, quiet=True)
        if not new or hashlib.sha256(new).hexdigest() != want:
            return
        text = new.decode("utf-8")
        at = list(re.finditer("^" + re.escape(TEMPLATE_LINE) + "$", text, re.M))
        if len(at) != 1:
            return
        made = text[:at[0].start()] + m.group(0) + text[at[0].end():]
        part = me + ".new"
        with open(part, "wb") as f:
            f.write(made.encode("utf-8"))
        os.replace(part, me)
    except Exception:
        return
    say("  init.py updated itself to the hackathon site's newest version. Starting it again...")
    sys.exit(subprocess.call([sys.executable, me, *sys.argv[1:]], env=dict(os.environ, HWA_UPDATED="1")))


START_OVER = os.path.join(".hwa", "start-over.json")
KEEP_VERCEL = False
START_OVER_STOPS = {
    "used": "You've already started over once, and it can be done only once. init.py carries on with the entry you have.",
    "ended": "The hackathon has ended, so it can't be started over. init.py carries on with the entry you have.",
}


def started_over(folder):
    left = read_json(os.path.join(folder, START_OVER))
    return left if isinstance(left, dict) and left.get("todo") else {}


def write_marker(folder, left):
    os.makedirs(os.path.join(folder, ".hwa"), exist_ok=True)
    path = os.path.join(folder, START_OVER)
    part = path + ".new"
    with open(part, "w", encoding="utf-8") as f:
        json.dump(left, f)
    os.replace(part, path)


def start_over_done(folder, part, **more):
    left = started_over(folder)
    if not left:
        return
    left.update(more)
    left["todo"] = [t for t in left.get("todo", []) if t != part]
    try:
        if left["todo"]:
            write_marker(folder, left)
        else:
            os.remove(os.path.join(folder, START_OVER))
    except OSError:
        pass


def is_link(path):
    if os.path.islink(path):
        return True
    check = getattr(os.path, "isjunction", None)
    if check:
        try:
            if check(path):
                return True
        except OSError:
            pass
    try:
        return bool(getattr(os.lstat(path), "st_file_attributes", 0) & 0x400)
    except OSError:
        return False


def remove_tree(path, failed):
    try:
        if is_link(path):
            try:
                os.unlink(path)
            except OSError:
                os.rmdir(path)
            return
        unhide(path)
        if os.path.isdir(path):
            try:
                os.chmod(path, stat.S_IREAD | stat.S_IWRITE | stat.S_IXUSR)
            except OSError:
                pass
            for name in os.listdir(path):
                remove_tree(os.path.join(path, name), failed)
            os.rmdir(path)
        else:
            try:
                os.chmod(path, stat.S_IREAD | stat.S_IWRITE)
            except OSError:
                pass
            os.remove(path)
    except OSError:
        if os.path.lexists(path):
            failed.append(path)


def wipe(folder):
    keep = {me().lower(), "init.py"}
    failed = []
    if MAC:
        run(["chflags", "-R", "nohidden", folder], timeout=60)
    for name in os.listdir(folder):
        if name.lower() in keep:
            continue
        path = os.path.join(folder, name)
        if name == ".hwa" and os.path.isdir(path) and not is_link(path):
            unhide(path)
            for inner in os.listdir(path):
                if inner != os.path.basename(START_OVER):
                    remove_tree(os.path.join(path, inner), failed)
            continue
        remove_tree(path, failed)
    return failed


def resume_or_start_over(folder):
    chance = (LIVE.get("again") or {}).get("start_over")
    if not interactive() or not chance:
        return
    if chance in START_OVER_STOPS:
        say("")
        note("skip", START_OVER_STOPS[chance])
        return
    say("")
    if RETURNING:
        say("  **This folder is already your hackathon project.** What would you like to do?")
        numbered(["**Resume**: carry on where you left off. OpenCode opens your last session.", "**Start over**: delete everything and build your entry again from the beginning."])
    else:
        say(f"  **Your entry is already set up:** {LIVE.get('repo')}. What would you like to do?")
        numbered(["**Resume**: carry on with it. Your repo is used again, in this folder.", "**Start over**: delete it and build your entry again from the beginning."])
    line("    " + paint("Start over can be done only once.", 1, 31))
    while True:
        a = re.sub(r"[^a-z0-9]", "", ask("\n  Type 1 to resume or 2 to start over (1 or 2): ").lower())
        if a in ("1", "resume", "r"):
            ok("Resuming.")
            return
        if a in ("2", "startover", "start", "s"):
            break
        if ENDED:
            say("  Nothing can be typed here: taken as resume.")
            return
        say("  Please type 1 or 2.")
    config = read_json(os.path.join(folder, ".hwa", "config.json"))
    repo = config.get("repo") or LIVE.get("repo") or ""
    vproject = config.get("vercel") or NAME
    say("")
    line("  " + paint("Starting over deletes these for good:", 1, 31))
    numbered([f"Your GitHub repo{(': ' + repo) if repo else ''}.", f"Your Vercel project {vproject} and its site (https://{vproject}.vercel.app).", f"Every file in this folder except init.py: {folder}", "Your OpenCode sessions in this folder."])
    say("  Your earlier entry stops counting, so submit your new one before the deadline. init.py then sets you up again from the beginning.")
    line("  " + paint("You can start over only once, and it can't be undone.", 1, 31))
    typed = ask('\n  Type "START OVER" to confirm (anything else keeps everything): ')
    if re.sub(r"\s+", " ", typed.strip().strip('"').strip("'").strip().lower()) != "start over":
        say("")
        ok("Nothing was deleted. Resuming.")
        return
    try:
        write_marker(folder, {"at": None, "repo": repo, "vercel": vproject, "opencode_db": config.get("opencode_db") or None, "todo": ["restart", "files", "sessions", "repo", "vercel"]})
    except OSError as e:
        stop(f"init.py couldn't write in this folder, so nothing was started over ({e}).", ["Check you can make files in this folder, then run init.py again."], again=False)


def continue_start_over(folder):
    global RETURNING
    left = started_over(folder)
    if not left:
        return
    if "restart" in left.get("todo", []):
        r = api("restart")
        error = r.get("error") or ""
        if error and re.search(r"token|reach", error, re.I):
            site_problem("Starting over", error)
        if error and not re.search(r"already started over", error, re.I):
            try:
                os.remove(os.path.join(folder, START_OVER))
            except OSError:
                pass
            say("")
            note("skip", f"{error} Nothing was deleted. Resuming.")
            RETURNING = bool(read_json(os.path.join(folder, ".hwa", "config.json")).get("repo"))
            return
        start_over_done(folder, "restart", at=r.get("at") or left.get("at"))
        LIVE["since"] = r.get("at") or LIVE.get("since")
    if "files" in started_over(folder).get("todo", []):
        working("Deleting this folder's files (init.py stays)...")
        failed = wipe(folder)
        if failed:
            stop(f"Some files in this folder couldn't be deleted: {', '.join(os.path.basename(x) for x in failed[:5])}", ["Close every OpenCode, editor and terminal window that has this folder open.", "Then run init.py again: it carries on starting over."])
        start_over_done(folder, "files")
        ok("Deleted this folder's files.")
    RETURNING = False


def start_over_sessions(folder, opencode):
    if "sessions" not in started_over(folder).get("todo", []):
        return
    ids = [sid for sid, _ in folder_sessions(folder)]
    for x in listed_sessions(opencode, folder):
        sid = str(x.get("id") or "")
        if same_folder(x.get("directory"), folder) and re.match(r"^ses_[A-Za-z0-9]+$", sid) and sid not in ids:
            ids.append(sid)
    gone = sum(1 for sid in ids if run([opencode, "session", "delete", sid], cwd=folder, timeout=120).returncode == 0)
    if not ids:
        ok("There were no OpenCode sessions in this folder to delete.")
    elif gone < len(ids):
        note("warn", f"Deleted {gone} of the {len(ids)} OpenCode sessions in this folder. The rest stay, and aren't sent with your new entry.")
    else:
        ok(f"Deleted your {gone} OpenCode session{'s' if gone != 1 else ''} in this folder.")
    start_over_done(folder, "sessions")


def start_over_repo(gh, folder, login):
    if "repo" not in started_over(folder).get("todo", []):
        return
    full = f"{login}/{NAME}"
    seen = repo_on_github(gh, full)
    if seen is not None and not (REPO_TAG in (seen.get("description") or "") or (seen.get("description") or "").strip() == REPO_NOTE):
        note("warn", f"github.com/{full} wasn't made by init.py for this entry, so it's left alone.")
        seen = None
    if seen is not None:
        working(f"Deleting your repo github.com/{full}...")
        r = run([gh, "repo", "delete", full, "--yes"], timeout=180)
        if r.returncode != 0 and "delete_repo" in said(r):
            note("web", "**GitHub needs your OK to delete the repo. In your browser:**")
            numbered(["Copy the one-time code it shows below, then press **Enter**: your browser opens GitHub.", f"Sign in as **{login}** if it asks, paste the code, and press **Authorize**."])
            say("")
            run([gh, "auth", "refresh", "--hostname", "github.com", "--scopes", "delete_repo"], capture=False, timeout=900)
            r = run([gh, "repo", "delete", full, "--yes"], timeout=180)
        if r.returncode != 0 and repo_on_github(gh, full) is not None:
            stop(f"GitHub didn't delete your repo github.com/{full}. {said(r, 300)}", [f"Delete it yourself: open https://github.com/{full}/settings, scroll to the bottom, press **Delete this repository** and confirm.", "Then run init.py again: it carries on starting over."])
        ok(f"Deleted your repo github.com/{full}.")
        say("     GitHub's permission to delete repos stays on this computer's sign-in. To take it back any time: `gh auth refresh -h github.com --remove-scopes delete_repo`", 2)
    start_over_done(folder, "repo")


def vercel_project_there(found, name, folder):
    try:
        r = subprocess.run([found, "project", "inspect", name], cwd=folder, env=ENV, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=120, encoding="utf-8", errors="replace")
    except (OSError, subprocess.TimeoutExpired):
        return None
    text = (r.stdout or "") + (r.stderr or "")
    if re.search(r"project_not_found|no project for|no such project|project not found|doesn.t exist", text, re.I):
        return False
    if r.returncode == 0 and re.search(r"Found Project", text, re.I):
        return True
    return None


def start_over_vercel(vercel, folder):
    global KEEP_VERCEL
    left = started_over(folder)
    if "vercel" not in left.get("todo", []):
        return
    name = NAME
    working(f"Deleting your Vercel project {name}...")
    found = vercel if os.path.dirname(vercel) else (shutil.which(vercel, path=ENV.get("PATH")) or vercel)
    text = ""
    for _ in range(2):
        try:
            r = subprocess.run([found, "project", "rm", name], cwd=folder, env=ENV, input="y\n", capture_output=True, text=True, timeout=180, encoding="utf-8", errors="replace")
            text, code_ = (r.stdout or "") + (r.stderr or ""), r.returncode
        except (OSError, subprocess.TimeoutExpired) as e:
            text, code_ = str(e), 1
        there = vercel_project_there(found, name, folder)
        missing = code_ != 0 and re.search(r"no such project|not found|doesn.t exist", text, re.I)
        if there is False or (there is None and (code_ == 0 or missing)):
            ok(f"There's no Vercel project {name} left to delete." if missing else f"Deleted your Vercel project {name}.")
            say(f"     Your old site is gone, so https://{name}.vercel.app shows \"not found\" until submit.py puts your new one live.", 2)
            start_over_done(folder, "vercel")
            return
    KEEP_VERCEL = True
    note("warn", f"Vercel kept your project {name}, so it's used again for your new entry. Your new site replaces the old one when you run submit.py.")
    start_over_done(folder, "vercel")


def main():
    self_update()
    window_ready()
    logo("setup", f"init.py {VERSION}")
    need_config()
    live_config()
    over_for_them()
    say("")
    say(f"Hello{' ' + CONFIG['first'] if CONFIG.get('first') else ''}. This takes 5 to 15 minutes; it'll ask you to sign in to GitHub and Vercel in your browser.")

    step(1, "Your project folder")
    folder = project_folder()
    if RETURNING or LIVE.get("repo"):
        resume_or_start_over(folder)
    continue_start_over(folder)
    tidy_copies(folder)
    ok(f"Your project folder: **{folder}**")
    say("     Your site, OpenCode and submit.py all work in this folder.", 2)
    os.makedirs(TOOLS, exist_ok=True)
    links = tool_links()

    step(2, "Node")
    node = ensure_node(links)
    CONFIG["node"] = node
    step(3, "Git")
    ensure_git(links)
    step(4, f"OpenCode {CONFIG.get('opencode') or ''}".strip())
    own_opencode_db(folder)
    opencode = ensure_opencode()
    start_over_sessions(folder, opencode)
    step(5, "GitHub and your repo")
    gh = ensure_gh(links)
    login, uid = github_login(gh)
    ok(f"GitHub account: **{login}**")
    start_over_repo(gh, folder, login)
    setup_git(folder, login, uid)
    write_files(folder, login, uid)
    repo = setup_repo(gh, folder, login)
    if align_with_github(folder):
        write_files(folder, login, uid)
    save_config(folder, repo=repo)
    step(6, "Vercel")
    vproject = setup_vercel(folder)
    save_config(folder, vercel=vproject)
    step(7, "Checking in")
    collector = os.path.join(folder, ".hwa", "hwa-collect.mjs")
    fetch(f"{SERVER}/hackathon/hwa-collect.mjs", collector, what="the hackathon's collector (hwa-collect.mjs)")
    want = links.get("collector_sha256")
    with open(collector, "rb") as f:
        differs = bool(want) and hashlib.sha256(f.read()).hexdigest() != want
    if differs:
        os.remove(collector)
        stop("The collector downloaded isn't the hackathon site's own copy (its checksum differs), so it wasn't kept.", ONLINE)
    fetch(f"{SERVER}/hackathon/submit.py", os.path.join(folder, "submit.py"), what="submit.py")
    launchers(folder, opencode, node, links=(repo, f"https://{vproject}.vercel.app" if vproject else None))
    tools = {"node": out([node, "--version"]), "opencode": out([opencode, "--version"]), "gh": (out([gh, "--version"]) or "").split("\n")[0], "os": KEY}
    for attempt in range(2):
        r = api("setup", github_login=login, repo_url=repo, vercel_project=vproject, folder=folder_print(folder), tools=tools)
        if r.get("error"):
            site_problem("Recording your setup on the hackathon site didn't work", r["error"])
        if not r.get("repo_problem"):
            break
        time.sleep(5)
    else:
        stop(f"The hackathon site can't see your repo {repo}: {r['repo_problem']}", [f"Open {repo} in a private browser window: it must open for anyone.", f"If it's private: open {repo}/settings, scroll to the bottom, **Change visibility**, **Public**."])
    first_prompt = agent_files(folder)
    ok("The hackathon's rules for OpenCode are in place.")
    env = dict(ENV, PWD=folder, HWA_TOKEN=CONFIG["token"])
    if system_pem() and not env.get("NODE_EXTRA_CA_CERTS"):
        env["NODE_EXTRA_CA_CERTS"] = system_pem()
    old_sessions(folder, opencode)
    result = os.path.join(folder, ".hwa", "check-result.json")
    if os.path.exists(result):
        os.remove(result)
    working("Checking in with the hackathon site. The first time OpenCode runs, this can take a minute...")
    r = run([node, collector, "check", "-", "--server", SERVER], cwd=folder, env=env, capture=False, timeout=300)
    if r.returncode != 0 and RETURNING and checkin_reason(folder) in ("offline", "site", "busy"):
        note("warn", "The hackathon site couldn't record this check-in just now. Your setup is fine: carry on, and submit.py tells the site later.")
    elif r.returncode != 0:
        checkin_failed(folder)
    else:
        ok("Checked in with the hackathon site.")
    lock_down(folder)
    bring_sessions(node, collector, folder, env)

    say("")
    ok("**All set:**")
    say(f"       Project folder:  {folder}")
    say(f"       GitHub repo:     {repo}")
    say(f"       Vercel project:  {vproject}  (https://{vproject}.vercel.app)")
    if not interactive():
        next_steps(folder, opened=False)
        return
    if RETURNING:
        open_models_warning()
    else:
        read_first()
        how_it_works()
        open_models_warning()
        if not yes_no("\n  Start OpenCode in your project folder now? (yes or no): ", True):
            next_steps(folder, opened=False)
            return
    if not claim_window(node, collector, folder, env):
        say("")
        note("warn", "OpenCode is already open for this project in another window. Use that window: one at a time. To open it here instead, leave the other one first (type **/exit** there), then run init.py again.")
        next_steps(folder, opened=False)
        return
    if fix_opencode_data() == "opencode2":
        return
    session = (last_session(node, collector, folder, env) or next((sid for sid, _ in folder_sessions(folder)), None)) if RETURNING else None
    note("go", "Opening your last OpenCode session..." if session else "Starting OpenCode...")
    clear_for_full_screen()
    code_ = opencode_session(opencode, folder, env, first_prompt, node, collector, session)
    back_from_full_screen()
    if code_ not in (0, None):
        note("warn", f"OpenCode stopped with an error (code {code_}).")
        if opencode2_db() and not ENV.get("OPENCODE_DB"):
            opencode2_note()
        elif other_opencode_db() and not ENV.get("OPENCODE_DB"):
            note("warn", f"OpenCode's saved data on this computer is from another version of OpenCode, which this one can't open. Move it aside (nothing is deleted), then start OpenCode again: **{move_command()}**")
    next_steps(folder, opened=True)


def opencode_data():
    return os.path.join(os.environ.get("XDG_DATA_HOME") or os.path.join(HOME, ".local", "share"), "opencode")


def opencode_tables():
    db = os.path.join(opencode_data(), "opencode.db")
    if not os.path.isfile(db):
        return None
    try:
        import sqlite3
        import pathlib
        con = sqlite3.connect(pathlib.Path(db).resolve().as_uri() + "?mode=ro", uri=True, timeout=5)
        try:
            names = {r[0] for r in con.execute("select name from sqlite_master where type = 'table'")}
        finally:
            con.close()
    except Exception:
        return None
    return db, names


def folder_sessions(folder):
    db = ENV.get("OPENCODE_DB") or os.path.join(opencode_data(), "opencode.db")
    if not os.path.isfile(db):
        return []
    try:
        import sqlite3
        import pathlib
        con = sqlite3.connect(pathlib.Path(db).resolve().as_uri() + "?mode=ro", uri=True, timeout=5)
        try:
            rows = con.execute("select id, directory, time_updated from session").fetchall()
        finally:
            con.close()
    except Exception:
        return []
    mine = [(str(r[0]), r[2] or 0) for r in rows if r[0] and re.match(r"^ses_[A-Za-z0-9]+$", str(r[0])) and same_folder(r[1], folder)]
    return sorted(mine, key=lambda x: x[1] if isinstance(x[1], (int, float)) else 0, reverse=True)


def listed_sessions(opencode, folder):
    r = run([opencode, "session", "list", "--format", "json"], cwd=folder, timeout=120)
    text = (r.stdout or "") if r.returncode == 0 else ""
    m = re.search(r"(?m)^\[", text)
    if not m:
        return []
    try:
        listed, _ = json.JSONDecoder().raw_decode(text, m.start())
    except ValueError:
        return []
    return [x for x in listed if isinstance(x, dict)] if isinstance(listed, list) else []


def other_opencode_db():
    t = opencode_tables()
    return t[0] if t and t[1] and "session" not in t[1] and "session_v2" not in t[1] else None


def opencode2_db():
    t = opencode_tables()
    return t[0] if t and "session_v2" in t[1] and "session" not in t[1] else None


def opencode2_note():
    say("")
    note("warn", "OpenCode 2 is installed on this computer, and your OpenCode history is in its format, which the hackathon's OpenCode can't open. Nothing is moved or lost: submit.py sends your OpenCode 2 sessions as they are.")
    note("go", f"Keep building with your OpenCode 2 in this folder: type **opencode** here. Never move or delete {opencode_data()}.")


def kept_name():
    return f"{opencode_data()}-before-hackathon-{time.strftime('%Y%m%d-%H%M%S')}"


def move_command():
    folder = opencode_data()
    return f'move "{folder}" "{folder}-before-hackathon"' if WIN else f'mv "{folder}" "{folder}-before-hackathon"'


def own_opencode_db(folder):
    kept = read_json(os.path.join(folder, ".hwa", "config.json")).get("opencode_db") or started_over(folder).get("opencode_db")
    if kept or opencode2_db():
        ENV["OPENCODE_DB"] = kept or os.path.join(opencode_data(), "opencode-hwa.db")
        CONFIG["opencode_db"] = ENV["OPENCODE_DB"]


def fix_opencode_data():
    if ENV.get("OPENCODE_DB"):
        return
    if opencode2_db():
        opencode2_note()
        return "opencode2"
    if not other_opencode_db():
        return
    folder = opencode_data()
    keep = kept_name()
    say("")
    note("warn", "OpenCode's saved data on this computer is from another version of OpenCode (or an install that broke), and the hackathon's OpenCode can't open it: it would stop with \"Database is not empty and has no session table\".")
    if yes_no(f"  Move it aside to {keep}? Nothing is deleted, and your old OpenCode chats stay in that folder. (yes or no): ", True):
        try:
            os.rename(folder, keep)
            ok("Moved aside. OpenCode starts fresh for the hackathon.")
        except OSError as e:
            note("warn", f"It couldn't be moved ({e}). Close every OpenCode window, then run: **{move_command()}**")
    else:
        note("warn", f"OpenCode will likely stop with that error. To fix it later, close OpenCode and run: **{move_command()}**")


def working(text):
    say(f"  {text}", 2)


SHOWN = {"rules": [], "dos": [], "donts": [], "tips": []}


def section(title):
    say("")
    if COLOR:
        line("  " + paint(f" {title} ", 1, rgb("#ffffff"), rgb(EDGE, back=True)))
    else:
        say(f"  {title}")
        say("  " + "-" * len(title))


def short_rule(text):
    strict = re.search(r"!!(.+?)!!", text) or re.search(r"\*\*([^*]*rejected[^*]*)\*\*", text)
    body = re.sub(r"!!.+?!!", "", text)
    if strict and not strict.group(0).startswith("!!"):
        body = body.replace(strict.group(0), "")
    head = re.search(r"\*\*(.+?)\*\*", body)
    h = (head.group(1) if head else body).strip().rstrip(":")
    if h and h[-1] not in ".!?":
        h += "."
    return h, (strict.group(1).strip() if strict else "")


def how_it_works():
    section("How OpenCode works here")
    numbered([
        "It opens in this window, in your project folder, and reads the hackathon's rules first.",
        "Pick an **open-source** model with **/models** (OpenCode's own free ones need no key). If one runs out, pick another, or add a free NVIDIA key with **/connect**.",
        "Type your own prompts, and ask it to commit, push and deploy as you go.",
        "When you're done, type **/exit** and press **Enter**; this window then says how to send your entry.",
    ])


def read_first():
    rules = [short_rule(r) for r in SHOWN["rules"]]
    if rules:
        section("Before you start: the rules")
        say("  " + paint("The full rules are on your hackathon page.", 2))
        say("")
        w = len(str(len(rules)))
        cross = "\u2716" if UTF else "x"
        for i, (head, strict) in enumerate(rules, 1):
            line(f"   {paint(str(i).rjust(w), 1, rgb(EDGE))}  {head}")
            if strict:
                line(f"   {' ' * w}  " + paint(f"{cross} {strict}", 1, 31))
    if SHOWN["dos"] or SHOWN["donts"]:
        say("")
        dos_table(SHOWN["dos"], SHOWN["donts"])
    if SHOWN["tips"]:
        section("Tips")
        star = "\u2726" if UTF else "*"
        for t in SHOWN["tips"]:
            line(f"   {paint(star, 1, rgb(EDGE))} {t}")
    if not interactive():
        return
    for _ in range(3):
        if yes_no("\n  Have you read the instructions above? (yes or no): ", False):
            return
        say("  Please read them above first: they decide how your entry is judged.")


def dos_table(dos, donts):
    import textwrap

    width = shutil.get_terminal_size((100, 30)).columns
    tick, cross = ("\u2714", "\u2716") if UTF else ("+", "x")
    if width < 84:
        say("  " + paint(f"{tick} Do", 1, 32))
        for x in dos:
            line(f"    {paint(tick, 1, 32)} {x}")
        say("")
        say("  " + paint(f"{cross} Don't", 1, 31))
        for x in donts:
            line(f"    {paint(cross, 1, 31)} {x}")
        return
    col = min(48, (min(width, 112) - 9) // 2)
    h, v, tl, tr, bl, br, tm, bm, ml, mr, mm = ("\u2500", "\u2502", "\u250c", "\u2510", "\u2514", "\u2518", "\u252c", "\u2534", "\u251c", "\u2524", "\u253c") if UTF else ("-", "|", "+", "+", "+", "+", "+", "+", "+", "+", "+")
    edge = lambda t: paint(t, rgb(EDGE))
    cell = lambda text, size: text + " " * max(0, size - sum(cells(c) for c in _SGR.sub("", text)))

    def wrapped(items, mark_, color):
        out = []
        for x in items:
            parts = textwrap.wrap(x, col - 2) or [""]
            out.append(f"{paint(mark_, 1, color)} {parts[0]}")
            out += [f"  {more}" for more in parts[1:]]
        return out

    left, right = wrapped(dos, tick, 32), wrapped(donts, cross, 31)
    line("  " + edge(tl + h * (col + 2) + tm + h * (col + 2) + tr))
    line("  " + edge(v) + " " + cell(paint("Do", 1, 32), col) + " " + edge(v) + " " + cell(paint("Don't", 1, 31), col) + " " + edge(v))
    line("  " + edge(ml + h * (col + 2) + mm + h * (col + 2) + mr))
    for i in range(max(len(left), len(right))):
        a = left[i] if i < len(left) else ""
        b = right[i] if i < len(right) else ""
        line("  " + edge(v) + " " + cell(a, col) + " " + edge(v) + " " + cell(b, col) + " " + edge(v))
    line("  " + edge(bl + h * (col + 2) + bm + h * (col + 2) + br))


def console_window_plan(kind, width, height):
    if kind == "PseudoConsoleWindow" and (width > 0 or height > 0):
        return "shrink"
    return "leave"


def windows_console_window():
    import ctypes
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32")
    user = ctypes.WinDLL("user32")
    kernel.GetConsoleWindow.restype = wintypes.HWND
    user.GetClassNameW.argtypes = (wintypes.HWND, wintypes.LPWSTR, ctypes.c_int)
    user.GetWindowRect.argtypes = (wintypes.HWND, ctypes.POINTER(wintypes.RECT))
    user.SetWindowPos.argtypes = (wintypes.HWND, wintypes.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.UINT)
    hwnd = kernel.GetConsoleWindow()
    if not hwnd:
        return
    name = ctypes.create_unicode_buffer(64)
    user.GetClassNameW(hwnd, name, 64)
    box = wintypes.RECT()
    size = (box.right - box.left, box.bottom - box.top) if user.GetWindowRect(hwnd, ctypes.byref(box)) else (0, 0)
    if console_window_plan(name.value, *size) == "shrink":
        user.SetWindowPos(hwnd, None, 0, 0, 0, 0, 0x0004 | 0x0010 | 0x0200)


def window_ready():
    try:
        if WIN:
            windows_console_window()
    except Exception:
        pass
    say("  Tip: make the text bigger with " + ("Ctrl and +" if WIN or sys.platform.startswith("linux") else "Cmd and +") + ", and smaller with " + ("Ctrl and -." if WIN or sys.platform.startswith("linux") else "Cmd and -."), 2)


def open_models_warning():
    say("")
    line("  " + (paint(" ONLY OPEN-SOURCE MODELS ARE ALLOWED ", 1, rgb("#ffffff"), rgb("#c62828", back=True)) if COLOR else "!! ONLY OPEN-SOURCE MODELS ARE ALLOWED !!"))
    say("  In OpenCode, type /models and pick an open-source model: Qwen, DeepSeek, Kimi, GLM, gpt-oss, Llama or Mistral.", 1, 31)
    say("  Closed models (Claude, GPT, Gemini, Grok and the like) are not allowed. Any provider or your own API key is fine for open-source models.", 31)
    say("")


def bring_sessions(node, collector, folder, env):
    if not interactive() or not node or not collector or not os.path.exists(collector):
        return
    try:
        subprocess.run([node, collector, "bring", "-", "--server", SERVER], cwd=folder, env=env, timeout=1800)
    except Exception:
        pass


def last_session(node, collector, folder, env):
    if not node or not collector or not os.path.exists(collector):
        return None
    report = os.path.join(folder, ".hwa", "pick.txt")
    try:
        if os.path.exists(report):
            os.remove(report)
        subprocess.run([node, collector, "pick", "-", "--report", report, "--server", SERVER], cwd=folder, env=dict(env, HWA_PICK_LAST="1"), stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=120)
        with open(report, encoding="utf-8") as f:
            sid = f.read().strip()
    except Exception:
        return None
    return sid if re.match(r"^ses_[A-Za-z0-9]+$", sid) else None


def opencode_session(opencode, folder, env, first_prompt, node=None, collector=None, session=None):
    import signal

    watcher = seals(node, collector, folder, env, "watch")
    try:
        p = subprocess.Popen([opencode, "-s", session] if session else [opencode, "--prompt", first_prompt], cwd=folder, env=env)
    except OSError as e:
        quiet_stop(watcher)
        stop(f"OpenCode couldn't start ({e}).", ["Close this terminal, open a new one in the same folder, and run init.py again."], again=False)
    old = signal.signal(signal.SIGINT, lambda *_: None)
    try:
        return p.wait()
    finally:
        signal.signal(signal.SIGINT, old)
        quiet_stop(watcher)
        seals(node, collector, folder, env, "seal")


def claim_window(node, collector, folder, env):
    if not node or not collector or not os.path.exists(collector):
        return True
    try:
        r = subprocess.run([node, collector, "claim", "-", "--server", SERVER], cwd=folder, env=env, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=30)
        return r.returncode != 3
    except Exception:
        return True


def seals(node, collector, folder, env, how):
    if not node or not collector or not os.path.exists(collector):
        return None
    cmd = [node, collector, how, "-", "--server", SERVER]
    quiet = {"cwd": folder, "env": env, "stdin": subprocess.DEVNULL, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    if WIN:
        quiet["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        if how == "watch":
            return subprocess.Popen(cmd, **quiet)
        subprocess.run(cmd, timeout=90, **quiet)
    except Exception:
        pass
    return None


def quiet_stop(p):
    if p is None:
        return
    try:
        p.terminate()
        p.wait(timeout=5)
    except Exception:
        pass


def your_links(folder):
    cfg = read_json(os.path.join(folder, ".hwa", "config.json"))
    repo = cfg.get("repo") if isinstance(cfg.get("repo"), str) and cfg.get("repo") else None
    v = cfg.get("vercel") if isinstance(cfg.get("vercel"), str) and cfg.get("vercel") else None
    return repo, (f"https://{v}.vercel.app" if v else None)


def link_rows(repo, site):
    if not (repo or site):
        return []
    rows = ["", "  **Your entry's links.** Use exactly these, on your hackathon page too:"]
    if repo:
        rows.append("     GitHub repo:  " + paint(repo, 1, 36))
    if site:
        rows.append("     Live site:    " + paint(site, 1, 36))
    return rows


def next_sh(repo, site):
    parts = ["printf '\\n\\033[1m OpenCode has closed. Next, send your entry:\\033[0m\\n'", f"printf '  In this terminal, run: \\033[1;7m %s \\033[0m\\n' {shlex_quote(PY + ' submit.py')}"]
    if repo:
        parts.append(f"printf '  Your GitHub repo:  \\033[1;36m%s\\033[0m\\n' {shlex_quote(repo)}")
    if site:
        parts.append(f"printf '  Your live site:    \\033[1;36m%s\\033[0m\\n' {shlex_quote(site)}")
    if repo or site:
        parts.append("printf '  Use exactly these, on your hackathon page too.\\n'")
    return "if [ -t 1 ]; then " + "; ".join(parts) + "; fi"


def next_js(repo, site):
    text = "\\n\\x1b[1m OpenCode has closed. Next, send your entry:\\x1b[0m\\n  In this terminal, run: \\x1b[1;7m " + PY + " submit.py \\x1b[0m\\n"
    if repo:
        text += "  Your GitHub repo:  \\x1b[1;36m" + repo + "\\x1b[0m\\n"
    if site:
        text += "  Your live site:    \\x1b[1;36m" + site + "\\x1b[0m\\n"
    if repo or site:
        text += "  Use exactly these, on your hackathon page too.\\n"
    return "if(process.stdout.isTTY)process.stdout.write('" + text + "')"


def safe_link(x):
    return x if isinstance(x, str) and re.fullmatch(r"https://[A-Za-z0-9._~/:-]{1,300}", x) else None


def shlex_quote(x):
    import shlex

    return shlex.quote(x)


def next_steps(folder, opened):
    here = in_folder(folder)
    start = start_command(folder, here)
    steps = []
    if not here:
        steps.append(f"Go to your project folder: `cd \"{folder}\"`")
    if not opened:
        open_models_warning()
        steps.append(f"Start OpenCode: {start}\nUse only open-source models in it. Build your site with it, then leave it: type **/exit** and press **Enter**.")
    steps.append(f"{'In' if here else 'Then, in'} this same terminal, run: `{PY} submit.py`\nIt saves your work's bundle first, then commits, pushes, deploys and sends your entry, and tells you if anything's missing.")
    steps.append("Check your live site when it asks, and type **approve**. Your hackathon page then says **Submitted**.")
    head = f"{mark('party')} **OpenCode has closed. Next, send your entry:**" if opened else f"{mark('do')} **Next:**"
    rows = [head]
    for i, s in enumerate(steps, 1):
        first, *rest = s.split("\n")
        rows += ["", f"  **{i}.** {first}"] + [f"     {more}" for more in rest]
    rows += link_rows(*your_links(folder))
    if opened:
        rows += ["", f"Not finished yet? Start OpenCode again: {start}"]
    block(rows)


def unexpected(e):
    import traceback

    where = os.path.join(TOOLS, "init-error.txt")
    try:
        os.makedirs(TOOLS, exist_ok=True)
        with open(where, "w", encoding="utf-8") as f:
            f.write(f"init.py {VERSION} on {KEY}, Python {platform.python_version()}\n\n{traceback.format_exc()}")
    except OSError:
        where = None
    stop(f"Something unexpected went wrong ({type(e).__name__}: {str(e)[:200]}).", ([f"If it happens again, email us the file {where} (it holds no keys)."] if where else []))


if __name__ == "__main__":
    look()
    try:
        main()
    except KeyboardInterrupt:
        settle()
        say("")
        say("Stopped. Run init.py again any time: what's done is kept.")
        sys.exit(130)
    except Exception as e:
        unexpected(e)
