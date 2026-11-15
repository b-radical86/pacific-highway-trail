"""Single-File Offline HTML Bundler (`scripts/build_single_file.py`).

Bundles `app/static/index.html`, `app/static/vendor/alpine.esm.js`, and all
ES modules under `app/static/js/` into a single self-contained HTML artifact
(`dist/pacific-highway-trail.html`) that works offline via `file://` without
ES module CORS restrictions.

Usage:
    python3 scripts/build_single_file.py
    python3 scripts/build_single_file.py --output dist/pacific-highway-trail.html
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re

IMPORT_RE = re.compile(
    r"^\s*import\s+(?P<spec>.+?)\s+from\s+['\"](?P<path>[^'\"]+)['\"]\s*;?",
    re.MULTILINE | re.DOTALL,
)
EXPORT_BLOCK_RE = re.compile(
    r"^\s*export\s*\{(?P<names>[^}]+)\}\s*;?",
    re.MULTILINE | re.DOTALL,
)
EXPORT_DECL_RE = re.compile(
    r"^(?P<indent>[ \t]*)export\s+"
    r"(?P<kind>const|let|var|function|async\s+function|class)\s+"
    r"(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)",
    re.MULTILINE,
)
MODULE_SCRIPT_RE = re.compile(
    r'<script\s+type="module"\s*>.*?</script>',
    re.DOTALL | re.IGNORECASE,
)


def _resolve_module_path(importer: Path, spec_path: str, static_root: Path) -> Path:
    """Resolves a relative import specifier against static_root."""
    resolved = (importer.parent / spec_path).resolve()
    resolved.relative_to(static_root.resolve())
    return resolved


def _collect_dependencies(entry_files: list[Path], static_root: Path) -> list[Path]:
    """Performs DFS topological sort over ES module imports."""
    visited: set[Path] = set()
    ordered: list[Path] = []

    def visit(mod_path: Path) -> None:
        canonical = mod_path.resolve()
        if canonical in visited:
            return
        visited.add(canonical)
        source = canonical.read_text(encoding="utf-8")
        for match in IMPORT_RE.finditer(source):
            dep_path = _resolve_module_path(canonical, match.group("path"), static_root)
            visit(dep_path)
        ordered.append(canonical)

    for entry in entry_files:
        visit(entry)
    return ordered


def _transform_module(mod_path: Path, static_root: Path) -> str:
    """Transforms an ES module into a self-contained closure registered in __modules."""
    rel_key = "./" + mod_path.relative_to(static_root.resolve()).as_posix()
    source = mod_path.read_text(encoding="utf-8")
    exported_entries: list[str] = []

    def replace_import(match: re.Match[str]) -> str:
        spec = match.group("spec").strip()
        dep_path = _resolve_module_path(mod_path, match.group("path"), static_root)
        dep_key = "./" + dep_path.relative_to(static_root.resolve()).as_posix()
        if spec.startswith("{") and spec.endswith("}"):
            inner = spec[1:-1].replace(" as ", ": ")
            return f"const {{{inner}}} = __modules[{dep_key!r}];"
        if "," in spec and "{" in spec:
            default_part, named_part = spec.split(",", 1)
            default_name = default_part.strip()
            inner = named_part.strip()[1:-1].replace(" as ", ": ")
            return (
                f"const {default_name} = __modules[{dep_key!r}].default;\n"
                f"const {{{inner}}} = __modules[{dep_key!r}];"
            )
        return f"const {spec} = __modules[{dep_key!r}].default;"

    transformed = IMPORT_RE.sub(replace_import, source)

    def replace_export_decl(match: re.Match[str]) -> str:
        name = match.group("name")
        exported_entries.append(f"{name}: {name}")
        return f"{match.group('indent')}{match.group('kind')} {name}"

    transformed = EXPORT_DECL_RE.sub(replace_export_decl, transformed)

    def replace_export_block(match: re.Match[str]) -> str:
        raw_items = [item.strip() for item in match.group("names").split(",") if item.strip()]
        for item in raw_items:
            if " as " in item:
                local_name, alias = [part.strip() for part in item.split(" as ", 1)]
                exported_entries.append(f"{alias}: {local_name}")
            else:
                exported_entries.append(f"{item}: {item}")
        return ""

    transformed = EXPORT_BLOCK_RE.sub(replace_export_block, transformed)
    # Prevent closing script tags inside string literals from terminating HTML <script>
    transformed = re.sub(r"</script", r"<\\/script", transformed, flags=re.IGNORECASE)

    exports_obj = ", ".join(dict.fromkeys(exported_entries))
    return f"__modules[{rel_key!r}] = (() => {{\n{transformed}\nreturn {{ {exports_obj} }};\n}})();"


def build_single_file_html(static_dir: Path, output_path: Path) -> Path:
    """Bundles app/static/index.html and all local JS modules into a single HTML file."""
    static_root = static_dir.resolve()
    index_path = static_root / "index.html"
    if not index_path.exists():
        raise FileNotFoundError(f"Index entrypoint not found: {index_path}")

    html = index_path.read_text(encoding="utf-8")
    entry_files = [
        static_root / "vendor" / "alpine.esm.js",
        static_root / "js" / "ui" / "app.js",
    ]
    modules = _collect_dependencies(entry_files, static_root)

    bundle_parts = [
        "<script>",
        "(function() {",
        "  const __modules = Object.create(null);",
    ]
    for mod in modules:
        bundle_parts.append(_transform_module(mod, static_root))

    bundle_parts.extend(
        [
            "  const Alpine = __modules['./vendor/alpine.esm.js'].default;",
            "  const { createTrailApp } = __modules['./js/ui/app.js'];",
            "  Alpine.data('trailApp', createTrailApp);",
            "  window.Alpine = Alpine;",
            "  Alpine.start();",
            "})();",
            "</script>",
        ]
    )
    inlined_script = "\n".join(bundle_parts)

    if not MODULE_SCRIPT_RE.search(html):
        raise ValueError('Could not locate <script type="module"> entry in index.html')

    bundled_html = MODULE_SCRIPT_RE.sub(lambda _: inlined_script, html, count=1)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(bundled_html, encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build standalone offline HTML bundle.")
    parser.add_argument(
        "--static-dir",
        default="app/static",
        help="Static asset directory (default: app/static)",
    )
    parser.add_argument(
        "--output",
        default="dist/pacific-highway-trail.html",
        help="Output single-file HTML path (default: dist/pacific-highway-trail.html)",
    )
    args = parser.parse_args()

    out = build_single_file_html(Path(args.static_dir), Path(args.output))
    size_kb = out.stat().st_size / 1024.0
    print(f"Built single-file HTML bundle: {out} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
