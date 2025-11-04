import os
import re
import sys

ROOT = "zeta-zero-cafe/notebook"   # folder with your chapter/WB HTML files
DRY_RUN = "--dry-run" in sys.argv   # optional preview mode

# Match: <pre ... class="osf" ...>  [only whitespace/&nbsp; inside]  </pre>
EMPTY_PRE_RE = re.compile(
    r"<pre\b(?=[^>]*\bclass\s*=\s*['\"]osf['\"][^>]*)(?:[^>]*)>"
    r"(?:\s|&nbsp;|&#160;)*"
    r"</pre>",
    re.IGNORECASE | re.DOTALL,
)

def strip_empty_pre_tags(path: str) -> int:
    with open(path, encoding="utf-8") as f:
        html = f.read()

    new_html, n = EMPTY_PRE_RE.subn("", html)
    if n and not DRY_RUN:
        # one-time backup
        bak = path + ".bak_empty"
        if not os.path.exists(bak):
            with open(bak, "w", encoding="utf-8") as bf:
                bf.write(html)
        with open(path, "w", encoding="utf-8") as wf:
            wf.write(new_html)
    return n

def main():
    any_file = False
    total = 0
    for subdir, _, files in os.walk(ROOT):
        for fn in files:
            if fn.lower().endswith(".html"):
                any_file = True
                p = os.path.join(subdir, fn)
                n = strip_empty_pre_tags(p)
                if n:
                    action = "Would remove" if DRY_RUN else "Removed"
                    print(f"{action} {n} empty <pre class='osf'> blocks in: {p}")
                    total += n
                else:
                    print(f"No empty <pre class='osf'> blocks: {p}")
    if not any_file:
        print(f"No HTML files found under {ROOT}.")
    else:
        print(("Would remove" if DRY_RUN else "Removed") + f" total: {total}")

if __name__ == "__main__":
    main()
