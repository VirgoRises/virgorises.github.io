import os
import re

# Root folder that holds your chapters/WB HTML files
ROOT = "zeta-zero-cafe/notebook"

# Seam pattern to remove (handles extra spaces/attributes and single/double quotes)
SEAM_RE = re.compile(r"</pre>\s*<pre[^>]*class=['\"]osf['\"][^>]*>", re.IGNORECASE)

# AMS-style environments to fix (incl. * variants)
ENVS = ["equation", "align", "split", "gather"]
ENV_PATTERNS = [
    re.compile(rf"\\begin\{{({env}\*?)\}}(.*?)\\end\{{\1\}}", re.DOTALL | re.IGNORECASE)
    for env in ENVS
]

def clean_block(block: str) -> tuple[str, bool]:
    """Remove any </pre><pre class='osf'> seams inside a LaTeX block.
       Returns (cleaned_block, changed_bool)."""
    cleaned, count = SEAM_RE.subn("", block)
    return cleaned, (count > 0)

def fix_file(path: str) -> bool:
    """Return True if the file was changed."""
    with open(path, encoding="utf-8") as f:
        text = f.read()

    original = text
    file_changed = False

    # Apply per-environment cleanup; repeat only when a pass actually changes the text
    for pat in ENV_PATTERNS:
        while True:
            pass_changed = False

            def _repl(m):
                nonlocal pass_changed, file_changed
                block = m.group(0)
                cleaned, changed = clean_block(block)
                if changed:
                    pass_changed = True
                    file_changed = True
                return cleaned

            new_text, n = pat.subn(_repl, text)
            text = new_text

            # Stop if: no matches at all, or matches but no changes in this pass
            if n == 0 or not pass_changed:
                break

    if file_changed and text != original:
        backup = path + ".bak"
        if not os.path.exists(backup):
            with open(backup, "w", encoding="utf-8") as f:
                f.write(original)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Cleaned: {path}")
    else:
        print(f"No change: {path}")
    return file_changed

def main():
    any_changed = False
    found_any = False
    for subdir, _, files in os.walk(ROOT):
        for fn in files:
            if fn.lower().endswith(".html"):
                found_any = True
                p = os.path.join(subdir, fn)
                if fix_file(p):
                    any_changed = True
    if not found_any:
        print(f"Nothing scanned (folder not found or no .html in {ROOT}).")
    elif not any_changed:
        print("No seams found inside AMS blocks. All good.")

if __name__ == "__main__":
    main()
