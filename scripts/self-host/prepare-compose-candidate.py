import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys


UNSUPPORTED_COMPOSE_TOKENS = re.compile(rb"\\|\b(?:include|extends)\b")


class Refusal(Exception):
    pass


class Arguments(argparse.ArgumentParser):
    def error(self, message):
        raise Refusal("USAGE")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def read_source(path):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError:
        raise Refusal("SOURCE_UNSAFE") from None
    with os.fdopen(fd, "rb") as source:
        info = os.fstat(source.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise Refusal("SOURCE_UNSAFE")
        return source.read(), (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)


def prepare(args):
    if not re.fullmatch(r"[0-9a-f]{64}", args.source_sha256):
        raise Refusal("INVALID_REFERENCE")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/:@-]*", args.old_image):
        raise Refusal("INVALID_REFERENCE")
    if not re.fullmatch(
        r"[a-z0-9][a-z0-9.-]*(?::[0-9]+)?/[a-z0-9._/-]+@sha256:[0-9a-f]{64}",
        args.new_image,
    ) or args.new_image == args.old_image:
        raise Refusal("INVALID_REFERENCE")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", args.project_name):
        raise Refusal("INVALID_PROJECT")
    source = Path(os.path.abspath(args.source))
    project = Path(os.path.abspath(args.project_directory))
    output = Path(os.path.abspath(args.output))
    parent = output.parent
    receipt_name = output.name + ".receipt.json"
    if parent.resolve() != parent or not project.is_dir():
        raise Refusal("OUTPUT_UNSAFE")
    if parent == source.parent or project == parent or project in parent.parents:
        raise Refusal("OUTPUT_UNSAFE")
    directory = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    temporary = []
    try:
        info = os.fstat(directory)
        if info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) & 0o077:
            raise Refusal("OUTPUT_UNSAFE")
        for name in (output.name, receipt_name):
            try:
                os.stat(name, dir_fd=directory, follow_symlinks=False)
            except FileNotFoundError:
                continue
            raise Refusal("OUTPUT_UNSAFE")
        before, identity = read_source(source)
        if sha256(before) != args.source_sha256:
            raise Refusal("SOURCE_DRIFT")
        if UNSUPPORTED_COMPOSE_TOKENS.search(before):
            raise Refusal("UNSUPPORTED_COMPOSE")
        old = args.old_image.encode("ascii")
        new = args.new_image.encode("ascii")
        if before.count(old) != 1 or new in before:
            raise Refusal("AMBIGUOUS_MATCH")
        line = re.search(
            rb"^[ \t]+image:[ \t]+(" + re.escape(old) + rb")[ \t]*(?:#[^\r\n]*)?\r?$",
            before,
            re.MULTILINE,
        )
        if line is None:
            raise Refusal("AMBIGUOUS_MATCH")
        start, end = line.span(1)
        candidate = before[:start] + new + before[end:]
        environment = dict(os.environ)
        command = [
            "docker", "compose", "--project-directory", str(project),
            "-p", args.project_name, "--profile", "*", "-f", "-", "config", "--format", "json",
        ]

        def compose(data):
            try:
                result = subprocess.run(
                    command, input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                    cwd=project, env=environment, timeout=30, check=True,
                )
                return json.loads(result.stdout)
            except (OSError, subprocess.SubprocessError, ValueError):
                raise Refusal("COMPOSE_FAILED") from None

        original_resolved = compose(before)
        candidate_resolved = compose(candidate)
        try:
            if original_resolved["services"]["executor"]["image"] != args.old_image:
                raise Refusal("SEMANTIC_DELTA")
            if candidate_resolved["services"]["executor"]["image"] != args.new_image:
                raise Refusal("SEMANTIC_DELTA")
            del original_resolved["services"]["executor"]["image"]
            del candidate_resolved["services"]["executor"]["image"]
        except (KeyError, TypeError):
            raise Refusal("SEMANTIC_DELTA") from None
        if original_resolved != candidate_resolved:
            raise Refusal("SEMANTIC_DELTA")
        after, current_identity = read_source(source)
        if after != before or current_identity != identity:
            raise Refusal("SOURCE_DRIFT")
        receipt = {
            "schema": 1,
            "tool_sha256": sha256(Path(__file__).read_bytes()),
            "source_sha256": sha256(before),
            "candidate_sha256": sha256(candidate),
            "project_name": args.project_name,
            "service": "executor",
            "old_image": args.old_image,
            "new_image": args.new_image,
            "line_number": before[:start].count(b"\n") + 1,
            "byte_range": [start, end],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        artifacts = (
            (output.name, candidate),
            (receipt_name, (json.dumps(receipt, sort_keys=True) + "\n").encode()),
        )
        for name, data in artifacts:
            temp_name = ".compose-" + secrets.token_hex(16)
            fd = os.open(
                temp_name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                0o600, dir_fd=directory,
            )
            temporary.append(temp_name)
            with os.fdopen(fd, "wb") as target:
                target.write(data)
                target.flush()
                os.fsync(target.fileno())
            os.link(temp_name, name, src_dir_fd=directory, dst_dir_fd=directory)
            os.fsync(directory)
        return receipt["candidate_sha256"]
    finally:
        for name in temporary:
            os.unlink(name, dir_fd=directory)
        os.close(directory)


def main():
    parser = Arguments(description="Prepare a separate Executor image-only Compose candidate.")
    for argument in (
        "source", "source-sha256", "project-directory", "project-name",
        "old-image", "new-image", "output",
    ):
        parser.add_argument("--" + argument, required=True)
    try:
        result = prepare(parser.parse_args())
    except Refusal as error:
        print("REFUSED " + str(error))
        return 2 if str(error) == "USAGE" else 10
    except Exception:
        print("REFUSED INTERNAL")
        return 10
    print("PREPARED " + result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
